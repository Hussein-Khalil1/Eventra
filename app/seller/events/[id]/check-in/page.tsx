"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import CheckInScanner from "@/components/CheckInScanner";
import Spinner from "@/components/Spinner";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { ArrowLeft, CheckCircle2, Users } from "lucide-react";
import Link from "next/link";

export default function EventCheckInPage() {
  const params = useParams();
  const eventId = params?.id as Id<"events">;
  const { user } = useUser();
  const event = useQuery(api.events.getById, { eventId });
  const attendees = useQuery(api.tickets.getEventAttendees, {
    eventId,
    sellerId: user?.id ?? "",
  });

  if (event === undefined || attendees === undefined) return <Spinner />;
  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 text-center">
          <p className="text-gray-700 font-medium">Event not found.</p>
          <Link
            href="/seller/check-in"
            className="mt-4 inline-flex items-center justify-center gap-2 bg-yellow-300 text-white px-4 py-2 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
          >
            Back to events
          </Link>
        </div>
      </div>
    );
  }

  const checkedInCount = attendees.filter((a) => a.status === "used").length;
  const totalCount = attendees.length;
  const sortedAttendees = [...attendees].sort(
    (a, b) => b.purchasedAt - a.purchasedAt
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex items-center gap-4">
              <Link
                href="/seller/check-in"
                className="text-gray-500 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">
                  {event.name}
                </h1>
                <p className="text-sm text-gray-500">
                  {new Date(event.eventDate).toLocaleDateString()} ·{" "}
                  {event.location}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-2 text-sm">
                <Users className="w-4 h-4 text-yellow-400" />
                <span className="text-gray-600">Total sold</span>
                <span className="font-semibold text-gray-900">{totalCount}</span>
              </div>
              <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2 text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <span className="text-green-700">Checked in</span>
                <span className="font-semibold text-green-800">
                  {checkedInCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-6">
          <CheckInScanner eventId={eventId} />

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Attendee list
              </h2>
              <p className="text-sm text-gray-500">
                Updates live as tickets are purchased or scanned.
              </p>
            </div>

            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {sortedAttendees.length === 0 && (
                <p className="text-sm text-gray-500">
                  No attendees yet. They will appear here as tickets are sold.
                </p>
              )}
              {sortedAttendees.map((attendee) => (
                <div
                  key={attendee.ticketId}
                  className={`border rounded-lg px-4 py-3 flex items-center justify-between gap-3 ${
                    attendee.status === "used"
                      ? "border-green-200 bg-green-50"
                      : "border-gray-200 bg-gray-50"
                  }`}
                >
                  <div>
                    <p className="text-sm font-semibold text-gray-900">
                      {attendee.attendeeName?.trim() || attendee.userName}
                    </p>
                    <p className="text-xs text-gray-500">
                      {attendee.userEmail}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${
                      attendee.status === "used"
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-200 text-gray-600"
                    }`}
                  >
                    {attendee.status === "used" ? "Checked in" : "Not checked"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
