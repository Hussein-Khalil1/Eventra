"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { CalendarDays, Scan, Ticket } from "lucide-react";

export default function SellerCheckInList() {
  const { user } = useUser();
  const events = useQuery(api.events.getSellerEvents, {
    userId: user?.id ?? "",
  });

  if (!events) return null;

  const upcomingEvents = events.filter((event) => event.eventDate > Date.now());
  const pastEvents = events.filter((event) => event.eventDate <= Date.now());

  const renderEventCard = (event: (typeof events)[number]) => (
    <div
      key={event._id}
      className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-4"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{event.name}</h3>
          <p className="text-sm text-gray-500">{event.description}</p>
        </div>
        <Link
          href={`/seller/events/${event._id}/check-in`}
          className="inline-flex items-center gap-2 bg-yellow-300 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-yellow-500 transition-colors"
        >
          <Scan className="w-4 h-4" />
          Scan Attendees
        </Link>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm text-gray-600">
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <CalendarDays className="w-4 h-4 text-yellow-400" />
          {new Date(event.eventDate).toLocaleDateString()}
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <Ticket className="w-4 h-4 text-yellow-400" />
          {event.metrics.soldTickets} sold
        </div>
        <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
          {event.is_cancelled ? (
            <span className="text-red-600 font-medium">Cancelled</span>
          ) : (
            <span className="text-green-600 font-medium">Active</span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Upcoming Events
        </h2>
        <div className="space-y-4">
          {upcomingEvents.length > 0 ? (
            upcomingEvents.map(renderEventCard)
          ) : (
            <p className="text-sm text-gray-500">No upcoming events.</p>
          )}
        </div>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Past Events
        </h2>
        <div className="space-y-4">
          {pastEvents.length > 0 ? (
            pastEvents.map(renderEventCard)
          ) : (
            <p className="text-sm text-gray-500">No past events.</p>
          )}
        </div>
      </div>
    </div>
  );
}
