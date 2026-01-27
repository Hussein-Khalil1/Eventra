"use client";

import { createStripeCheckoutSession } from "@/app/actions/createStripeCheckoutSession";
import { Id } from "@/convex/_generated/dataModel";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import ReleaseTicket from "./ReleaseTicket";
import { Ticket } from "lucide-react";

export default function PurchaseTicket({ eventId }: { eventId: Id<"events"> }) {
  const router = useRouter();
  const { user } = useUser();
  const queuePosition = useQuery(api.waitingList.getQueuePosition, {
    eventId,
    userId: user?.id ?? "",
  });
  const availability = useQuery(api.events.getEventAvailability, { eventId });

  const [timeRemaining, setTimeRemaining] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [attendees, setAttendees] = useState<
    Array<{ firstName: string; lastName: string }>
  >([{ firstName: "", lastName: "" }]);
  const [formError, setFormError] = useState("");

  const offerExpiresAt = queuePosition?.offerExpiresAt ?? 0;
  const isExpired = Date.now() > offerExpiresAt;

  const maxSelectableTickets = useMemo(() => {
    const remaining = availability?.remainingTickets ?? 0;
    return Math.min(10, Math.max(1, remaining + 1));
  }, [availability?.remainingTickets]);

  useEffect(() => {
    const calculateTimeRemaining = () => {
      if (isExpired) {
        setTimeRemaining("Expired");
        return;
      }

      const diff = offerExpiresAt - Date.now();
      const minutes = Math.floor(diff / 1000 / 60);
      const seconds = Math.floor((diff / 1000) % 60);

      if (minutes > 0) {
        setTimeRemaining(
          `${minutes} minute${minutes === 1 ? "" : "s"} ${seconds} second${
            seconds === 1 ? "" : "s"
          }`
        );
      } else {
        setTimeRemaining(`${seconds} second${seconds === 1 ? "" : "s"}`);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);
    return () => clearInterval(interval);
  }, [offerExpiresAt, isExpired]);

  useEffect(() => {
    setAttendees((current) => {
      const next = [...current];
      while (next.length < ticketQuantity) {
        next.push({ firstName: "", lastName: "" });
      }
      return next.slice(0, ticketQuantity);
    });
  }, [ticketQuantity]);

  useEffect(() => {
    if (ticketQuantity > maxSelectableTickets) {
      setTicketQuantity(maxSelectableTickets);
    }
  }, [maxSelectableTickets, ticketQuantity]);

  const handlePurchase = async () => {
    if (!user) return;

    try {
      setFormError("");
      if (ticketQuantity > 1) {
        const missingName = attendees.some(
          (attendee) =>
            !attendee.firstName.trim() || !attendee.lastName.trim()
        );
        if (missingName) {
          setFormError("Please add a first and last name for each ticket.");
          return;
        }
      }

      setIsLoading(true);
      const attendeeNames =
        ticketQuantity > 1
          ? attendees.map(
              (attendee) =>
                `${attendee.firstName.trim()} ${attendee.lastName.trim()}`
            )
          : undefined;
      const { sessionUrl } = await createStripeCheckoutSession({
        eventId,
        quantity: ticketQuantity,
        attendeeNames,
      });

      if (sessionUrl) {
        router.push(sessionUrl);
      }
    } catch (error) {
      console.error("Error creating checkout session:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!user || !queuePosition || queuePosition.status !== "offered") {
    return null;
  }

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-amber-200">
      <div className="space-y-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                <Ticket className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Ticket Reserved
                </h3>
                <p className="text-sm text-gray-500">
                  Expires in {timeRemaining}
                </p>
              </div>
            </div>

            <div className="text-sm text-gray-600 leading-relaxed">
              A ticket has been reserved for you. Complete your purchase before
              the timer expires to secure your spot at this event.
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {maxSelectableTickets > 1 && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                Tickets
              </label>
              <select
                value={ticketQuantity}
                onChange={(event) =>
                  setTicketQuantity(Number(event.target.value))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                {Array.from({ length: maxSelectableTickets }, (_, index) => {
                  const value = index + 1;
                  return (
                    <option key={value} value={value}>
                      {value} ticket{value === 1 ? "" : "s"}
                    </option>
                  );
                })}
              </select>
              <p className="text-xs text-gray-500">
                Up to {maxSelectableTickets} tickets available right now.
              </p>
            </div>
          )}

          {ticketQuantity > 1 && (
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">
                Ticket holder names
              </p>
              {attendees.map((attendee, index) => (
                <div
                  key={`attendee-${index}`}
                  className="grid grid-cols-1 gap-3 sm:grid-cols-2"
                >
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Ticket {index + 1} first name
                    </label>
                    <input
                      type="text"
                      value={attendee.firstName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAttendees((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, firstName: value }
                              : item
                          )
                        );
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="First name"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500">
                      Ticket {index + 1} last name
                    </label>
                    <input
                      type="text"
                      value={attendee.lastName}
                      onChange={(event) => {
                        const value = event.target.value;
                        setAttendees((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index
                              ? { ...item, lastName: value }
                              : item
                          )
                        );
                      }}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
                      placeholder="Last name"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}

          {formError && (
            <p className="text-sm text-red-600 font-medium">{formError}</p>
          )}

          <button
            onClick={handlePurchase}
            disabled={isExpired || isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white px-8 py-4 rounded-lg font-bold shadow-md hover:from-amber-600 hover:to-amber-700 transform hover:scale-[1.02] transition-all duration-200 disabled:from-gray-400 disabled:to-gray-500 disabled:cursor-not-allowed disabled:hover:scale-100 text-lg"
          >
            {isLoading
              ? "Redirecting to checkout..."
              : "Purchase Your Ticket Now →"}
          </button>
        </div>

        <div className="mt-4">
          <ReleaseTicket eventId={eventId} waitingListId={queuePosition._id} />
        </div>
      </div>
    </div>
  );
};
