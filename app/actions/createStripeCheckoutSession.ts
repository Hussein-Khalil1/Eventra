"use server";

import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
import { auth, currentUser } from "@clerk/nextjs/server";
import { DURATIONS } from "@/convex/constants";

export type StripeCheckoutMetaData = {
  eventId: Id<"events">;
  userId: string;
  waitingListId: Id<"waitingList">;
  userName?: string;
  userEmail?: string;
  quantity?: string;
  attendeeNames?: string;
};

const STRIPE_FEE_RATE = 0.029;
const STRIPE_FEE_FLAT_CENTS = 30;
const EVENTRA_PLATFORM_FEE_CENTS = 100;

function calculateEventraFeeCents() {
  return EVENTRA_PLATFORM_FEE_CENTS;
}

function calculateStripeProcessingFeeCents(totalChargeCents: number) {
  return Math.round(totalChargeCents * STRIPE_FEE_RATE) + STRIPE_FEE_FLAT_CENTS;
}

function calculateTotalChargeCents(
  baseSubtotalCents: number,
  eventraFeeTotalCents: number
) {
  // Stripe's fixed fee is charged once per checkout payment.
  // Find the minimum buyer total where seller net is at least base subtotal.
  let totalChargeCents = Math.ceil(
    (baseSubtotalCents + eventraFeeTotalCents + STRIPE_FEE_FLAT_CENTS) /
      (1 - STRIPE_FEE_RATE)
  );

  while (
    totalChargeCents -
      eventraFeeTotalCents -
      calculateStripeProcessingFeeCents(totalChargeCents) <
    baseSubtotalCents
  ) {
    totalChargeCents += 1;
  }

  while (
    totalChargeCents > 0 &&
    totalChargeCents -
      1 -
      eventraFeeTotalCents -
      calculateStripeProcessingFeeCents(totalChargeCents - 1) >=
      baseSubtotalCents
  ) {
    totalChargeCents -= 1;
  }

  return totalChargeCents;
}

export async function createStripeCheckoutSession({
  eventId,
  quantity,
  attendeeNames,
}: {
  eventId: Id<"events">;
  quantity: number;
  attendeeNames?: string[];
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const convex = getConvexClient();

  // Get event details
  const event = await convex.query(api.events.getById, { eventId });
  if (!event) throw new Error("Event not found");
  console.log("Checkout session: event owner", {
    eventId,
    eventOwnerId: event.userId,
    buyerUserId: userId,
  });

  // Get waiting list entry
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, {
    eventId,
    userId,
  });

  if (!queuePosition || queuePosition.status !== "offered") {
    throw new Error("No valid ticket offer found");
  }

  const stripeConnectId = await convex.query(
    api.users.getUsersStripeConnectId,
    {
      userId: event.userId,
    }
  );

  if (!stripeConnectId) {
    console.error("Missing Stripe Connect ID for event owner", {
      eventId,
      eventOwnerId: event.userId,
    });
    throw new Error("Stripe Connect ID not found for owner of the event!");
  }

  if (!queuePosition.offerExpiresAt) {
    throw new Error("Ticket offer has no expiration date");
  }

  const availability = await convex.query(api.events.getEventAvailability, {
    eventId,
  });
  const maxQuantity = Math.min(
    10,
    Math.max(1, (availability?.remainingTickets ?? 0) + 1)
  );
  if (quantity < 1 || quantity > maxQuantity) {
    throw new Error("Requested ticket quantity is no longer available");
  }
  if (
    quantity > 1 &&
    (!attendeeNames ||
      attendeeNames.length !== quantity ||
      attendeeNames.some((name) => !name.trim()))
  ) {
    throw new Error("Missing attendee names for all tickets");
  }

  const basePriceCents = Math.round(event.price * 100);
  const eventraFeeCents = calculateEventraFeeCents();
  const baseSubtotalCents = basePriceCents * quantity;
  const eventraFeeTotalCents = eventraFeeCents * quantity;
  const totalChargeCents = calculateTotalChargeCents(
    baseSubtotalCents,
    eventraFeeTotalCents
  );
  const applicationFeeCents = Math.max(eventraFeeTotalCents, 0);
  const feeLineItemCents = totalChargeCents - baseSubtotalCents;

  const clerkUser = await currentUser();
  const userName = clerkUser
    ? `${clerkUser.firstName ?? ""} ${clerkUser.lastName ?? ""}`.trim()
    : "";
  const userEmail = clerkUser?.emailAddresses[0]?.emailAddress ?? "";

  const metadata: StripeCheckoutMetaData = {
    eventId,
    userId,
    waitingListId: queuePosition._id,
    userName,
    userEmail,
    quantity: String(quantity),
    attendeeNames: attendeeNames?.length ? JSON.stringify(attendeeNames) : "",
  };

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "cad",
            product_data: {
              name: event.name,
              description: event.description,
            },
            unit_amount: basePriceCents,
          },
          quantity,
        },
        ...(feeLineItemCents > 0
          ? [
              {
                price_data: {
                  currency: "cad",
                  product_data: {
                    name: "Eventra fees",
                    description: "Service and processing fees",
                  },
                  unit_amount: feeLineItemCents,
                },
                quantity: 1,
              },
            ]
          : []),
      ],
      payment_intent_data: {
        application_fee_amount: applicationFeeCents,
        metadata,
      },
      expires_at: Math.floor(Date.now() / 1000) + DURATIONS.TICKET_OFFER / 1000, // 30 minutes (stripe checkout minimum expiration time)
      mode: "payment",
      success_url: `${baseUrl}/tickets/purchase-success?session_id={CHECKOUT_SESSION_ID}&quantity=${quantity}&event_id=${eventId}`,
      cancel_url: `${baseUrl}/event/${eventId}`,
      metadata,
    },
    {
      stripeAccount: stripeConnectId,
    }
  );

  return { sessionId: session.id, sessionUrl: session.url };
}
