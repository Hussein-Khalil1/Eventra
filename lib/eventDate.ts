export const getEventSalesDeadline = (eventDate: number): number => {
  const deadline = new Date(eventDate);
  deadline.setHours(23, 59, 59, 999);
  return deadline.getTime();
};

export const hasEventSalesClosed = (
  eventDate: number,
  now: number = Date.now()
): boolean => now > getEventSalesDeadline(eventDate);
