"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import TicketCard from "@/components/TicketCard";
import { Ticket } from "lucide-react";

export default function MyTicketsPage() {
  const { user } = useUser();
  const tickets = useQuery(api.events.getUserTickets, {
    userId: user?.id ?? "",
  });

  if (!tickets) return null;

  const validTickets = tickets.filter((t) => t.status === "valid");
  const otherTickets = tickets.filter((t) => t.status !== "valid");

  const upcomingTickets = validTickets.filter(
    (t) => t.event && t.event.eventDate > Date.now()
  );
  const pastTickets = validTickets.filter(
    (t) => t.event && t.event.eventDate <= Date.now()
  );

  const groupTicketsByEvent = (
    entries: typeof tickets
  ): Array<{ eventId: string; tickets: typeof tickets }> => {
    const groups = new Map<string, typeof tickets>();
    entries.forEach((ticket) => {
      if (!ticket.event) return;
      const current = groups.get(ticket.event._id) ?? [];
      groups.set(ticket.event._id, [...current, ticket]);
    });
    return Array.from(groups.entries()).map(([eventId, groupedTickets]) => ({
      eventId,
      tickets: groupedTickets,
    }));
  };

  const renderTicketStacks = (entries: typeof tickets) => {
    const groups = groupTicketsByEvent(entries);
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {groups.map((group) => (
          <div key={group.eventId} className="relative">
            <span className="absolute -top-3 -right-3 z-20 inline-flex h-8 w-8 items-center justify-center rounded-full bg-yellow-300 text-gray-900 text-sm font-bold shadow">
              {group.tickets.length}
            </span>
            <div className="flex flex-col -space-y-12">
              {group.tickets.map((ticket) => (
                <div key={ticket._id} className="shadow-lg rounded-lg">
                  <TicketCard ticketId={ticket._id} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">My Tickets</h1>
            <p className="mt-2 text-gray-600">
              Manage and view all your tickets in one place
            </p>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-gray-600">
              <Ticket className="w-5 h-5" />
              <span className="font-medium">
                {tickets.length} Total Tickets
              </span>
            </div>
          </div>
        </div>

        {upcomingTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Upcoming Events
            </h2>
            {renderTicketStacks(upcomingTickets)}
          </div>
        )}

        {pastTickets.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Past Events
            </h2>
            {renderTicketStacks(pastTickets)}
          </div>
        )}

        {otherTickets.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Other Tickets
            </h2>
            {renderTicketStacks(otherTickets)}
          </div>
        )}

        {tickets.length === 0 && (
          <div className="text-center py-12">
            <Ticket className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900">
              No tickets yet
            </h3>
            <p className="text-gray-600 mt-1">
              When you purchase tickets, they&apos;ll appear here
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
