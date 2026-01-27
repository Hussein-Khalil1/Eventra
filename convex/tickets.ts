import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getUserTicketForEvent = query({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
  },
  handler: async (ctx, { eventId, userId }) => {
    const ticket = await ctx.db
      .query("tickets")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .first();

    return ticket;
  },
});

export const getTicketWithDetails = query({
  args: { ticketId: v.id("tickets") },
  handler: async (ctx, { ticketId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return null;

    const event = await ctx.db.get(ticket.eventId);

    return {
      ...ticket,
      event,
    };
  },
});

export const getValidTicketsForEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    return await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();
  },
});

export const updateTicketStatus = mutation({
  args: {
    ticketId: v.id("tickets"),
    status: v.union(
      v.literal("valid"),
      v.literal("used"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
  },
  handler: async (ctx, { ticketId, status }) => {
    await ctx.db.patch(ticketId, { status });
  },
});

export const getEventAttendees = query({
  args: { eventId: v.id("events"), sellerId: v.string() },
  handler: async (ctx, { eventId, sellerId }) => {
    const event = await ctx.db.get(eventId);
    if (!event || event.userId !== sellerId) return [];

    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();

    const attendees = await Promise.all(
      tickets.map(async (ticket) => {
        const user = await ctx.db
          .query("users")
          .withIndex("by_user_id", (q) => q.eq("userId", ticket.userId))
          .first();

        return {
          ticketId: ticket._id,
          status: ticket.status,
          purchasedAt: ticket.purchasedAt,
          userId: ticket.userId,
          userName: user?.name ?? "Unknown",
          userEmail: user?.email ?? "",
          attendeeName: ticket.attendeeName ?? "",
        };
      })
    );

    return attendees;
  },
});

export const checkInTicket = mutation({
  args: {
    ticketId: v.id("tickets"),
    eventId: v.id("events"),
    sellerId: v.string(),
  },
  handler: async (ctx, { ticketId, eventId, sellerId }) => {
    const ticket = await ctx.db.get(ticketId);
    if (!ticket) return { status: "invalid" } as const;

    if (ticket.eventId !== eventId) return { status: "wrong_event" } as const;

    const event = await ctx.db.get(ticket.eventId);
    if (!event || event.userId !== sellerId) {
      return { status: "wrong_event" } as const;
    }

    if (event.is_cancelled) return { status: "event_cancelled" } as const;
    if (ticket.status === "used") return { status: "already_checked_in" } as const;
    if (ticket.status !== "valid") return { status: "invalid" } as const;

    await ctx.db.patch(ticketId, { status: "used" });

    const user = await ctx.db
      .query("users")
      .withIndex("by_user_id", (q) => q.eq("userId", ticket.userId))
      .first();

    return {
      status: "checked_in",
      attendee: {
        userName: user?.name ?? "Unknown",
        userEmail: user?.email ?? "",
        attendeeName: ticket.attendeeName ?? "",
      },
    } as const;
  },
});
