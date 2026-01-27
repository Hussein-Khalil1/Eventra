import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import Stripe from "stripe";
import { StripeCheckoutMetaData } from "@/app/actions/createStripeCheckoutSession";

export async function POST(req: Request) {
  console.log("Webhook received");

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;

  console.log("Webhook signature:", signature ? "Present" : "Missing");

  let event: Stripe.Event;

  try {
    console.log("Attempting to construct webhook event");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("Webhook event constructed successfully:", event.type);
  } catch (err) {
    console.error("Webhook construction failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  const convex = getConvexClient();

  if (event.type === "checkout.session.completed") {
    console.log("Processing checkout.session.completed");
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata as StripeCheckoutMetaData;
    console.log("Session details:", {
      id: session.id,
      paymentIntent: session.payment_intent,
      amountTotal: session.amount_total,
    });
    console.log("Session metadata:", metadata);
    console.log("Convex client:", convex);

    try {
      if (!metadata?.eventId || !metadata?.userId || !metadata?.waitingListId) {
        console.error("Missing required checkout metadata", metadata);
        return new Response("Missing required checkout metadata", {
          status: 400,
        });
      }

      if (metadata.userName || metadata.userEmail) {
        await convex.mutation(api.users.updateUser, {
          userId: metadata.userId,
          name: metadata.userName ?? "",
          email: metadata.userEmail ?? "",
        });
      }

      let quantity = Number(metadata?.quantity ?? 1);
      if (!Number.isFinite(quantity) || quantity < 1) {
        try {
          const lineItems = await stripe.checkout.sessions.listLineItems(
            session.id,
            { limit: 100 },
            event.account ? { stripeAccount: event.account } : undefined
          );
          quantity = lineItems.data.reduce(
            (total, item) => total + (item.quantity ?? 0),
            0
          );
        } catch (error) {
          console.error("Failed to resolve quantity from line items", error);
          quantity = 1;
        }
      }
      let attendeeNames: string[] | undefined;
      if (metadata?.attendeeNames) {
        try {
          attendeeNames = JSON.parse(metadata.attendeeNames);
        } catch (error) {
          console.error("Failed to parse attendee names metadata", error);
        }
      }

      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        quantity: Number.isNaN(quantity) || quantity < 1 ? 1 : quantity,
        attendeeNames,
        paymentInfo: {
          paymentIntentId: session.payment_intent as string,
          amount: session.amount_total ?? 0,
        },
      });
      console.log("Purchase ticket mutation completed:", result);
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }
  if (event.type === "payment_intent.succeeded") {
    console.log("Processing payment_intent.succeeded");
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    const metadata = paymentIntent.metadata as StripeCheckoutMetaData;
    console.log("Payment intent details:", {
      id: paymentIntent.id,
      amountReceived: paymentIntent.amount_received,
    });

    if (!metadata?.eventId || !metadata?.userId || !metadata?.waitingListId) {
      console.error("Missing required payment intent metadata", metadata);
      return new Response("Missing required payment intent metadata", {
        status: 400,
      });
    }

    try {
      if (metadata.userName || metadata.userEmail) {
        await convex.mutation(api.users.updateUser, {
          userId: metadata.userId,
          name: metadata.userName ?? "",
          email: metadata.userEmail ?? "",
        });
      }

      const quantity = Number(metadata?.quantity ?? 1);
      let attendeeNames: string[] | undefined;
      if (metadata?.attendeeNames) {
        try {
          attendeeNames = JSON.parse(metadata.attendeeNames);
        } catch (error) {
          console.error("Failed to parse attendee names metadata", error);
        }
      }

      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        waitingListId: metadata.waitingListId,
        quantity: Number.isNaN(quantity) || quantity < 1 ? 1 : quantity,
        attendeeNames,
        paymentInfo: {
          paymentIntentId: paymentIntent.id,
          amount: paymentIntent.amount_received ?? 0,
        },
      });
      console.log("Purchase ticket mutation completed:", result);
    } catch (error) {
      console.error("Error processing payment intent webhook:", error);
      return new Response("Error processing payment intent webhook", {
        status: 500,
      });
    }
  }

  return new Response(null, { status: 200 });
}
