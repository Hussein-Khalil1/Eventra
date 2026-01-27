import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Ticket from "@/components/Ticket";
import { stripe } from "@/lib/stripe";
import { Id } from "@/convex/_generated/dataModel";

async function TicketSuccess({
  searchParams,
}: {
  searchParams?: Promise<{
    quantity?: string;
    event_id?: string;
    session_id?: string;
  }>;
}) {
  const { userId } = await auth();
  if (!userId) redirect("/");

  const resolvedSearchParams = (await searchParams) ?? {};
  const sessionId = resolvedSearchParams?.session_id;

  const convex = getConvexClient();
  if (sessionId) {
    const eventId = resolvedSearchParams?.event_id as Id<"events"> | undefined;
    if (eventId) {
      const event = await convex.query(api.events.getById, { eventId });
      if (event) {
        const stripeConnectId = await convex.query(
          api.users.getUsersStripeConnectId,
          {
            userId: event.userId,
          }
        );
        if (stripeConnectId) {
          const session = await stripe.checkout.sessions.retrieve(
            sessionId,
            { expand: ["payment_intent"] },
            { stripeAccount: stripeConnectId }
          );
          const metadata = session.metadata ?? {};
          let quantity = Number(metadata.quantity ?? 1);
          if (!Number.isFinite(quantity) || quantity < 1) {
            const lineItems = await stripe.checkout.sessions.listLineItems(
              sessionId,
              { limit: 100 },
              { stripeAccount: stripeConnectId }
            );
            quantity = lineItems.data.reduce(
              (total, item) => total + (item.quantity ?? 0),
              0
            );
            if (!quantity) quantity = 1;
          }
          let attendeeNames: string[] | undefined;
          if (metadata.attendeeNames) {
            try {
              attendeeNames = JSON.parse(metadata.attendeeNames);
            } catch {
              attendeeNames = undefined;
            }
          }
          const paymentIntent = session.payment_intent;
          const paymentIntentId =
            typeof paymentIntent === "string" ? paymentIntent : paymentIntent?.id;
          const metadataEventId = metadata.eventId as
            | Id<"events">
            | undefined;
          const metadataWaitingListId = metadata.waitingListId as
            | Id<"waitingList">
            | undefined;
          if (paymentIntentId && metadataEventId && metadataWaitingListId) {
            await convex.mutation(api.events.purchaseTicket, {
              eventId: metadataEventId,
              userId: metadata.userId ?? userId,
              waitingListId: metadataWaitingListId,
              quantity,
              attendeeNames,
              paymentInfo: {
                paymentIntentId,
                amount: session.amount_total ?? 0,
              },
            });
          }
        }
      }
    }
  }
  const tickets = await convex.query(api.events.getUserTickets, { userId });
  const quantity = Math.max(
    1,
    Number.isFinite(Number(resolvedSearchParams?.quantity))
      ? Number(resolvedSearchParams?.quantity)
      : 1
  );
  const eventId = resolvedSearchParams?.event_id as Id<"events"> | undefined;
  const filteredTickets = eventId
    ? tickets.filter((ticket) => ticket.eventId === eventId)
    : tickets;
  const sortedTickets = [...filteredTickets].sort(
    (a, b) => b.purchasedAt - a.purchasedAt
  );
  const purchasedTickets = sortedTickets.slice(0, quantity);

  if (purchasedTickets.length === 0) {
    redirect("/");
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Ticket Purchase Successful!
          </h1>
          <p className="mt-2 text-gray-600">
            {purchasedTickets.length > 1
              ? "Your tickets are confirmed and ready to use"
              : "Your ticket has been confirmed and is ready to use"}
          </p>
        </div>

        <div className="space-y-6">
          {purchasedTickets.map((ticket) => (
            <Ticket key={ticket._id} ticketId={ticket._id} />
          ))}
        </div>
      </div>
    </div>
  );
}

export default TicketSuccess;
