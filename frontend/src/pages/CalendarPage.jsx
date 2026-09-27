import { useCallback, useEffect, useMemo, useState } from "react";
import { api, STATUS_META, fmtINR } from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function monthGrid(year, month) {
  const first = new Date(year, month, 1);
  const startDow = first.getDay();
  const days = new Date(year, month + 1, 0).getDate();

  const cells = [];

  for (let i = 0; i < startDow; i++) {
    cells.push(null);
  }

  for (let d = 1; d <= days; d++) {
    cells.push(new Date(year, month, d));
  }

  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

// IMPORTANT:
// Do not use toISOString() for calendar dates.
// It converts the date to UTC and can shift the date by one day.
function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export default function CalendarPage() {
  const [cursor, setCursor] = useState(new Date());
  const [view, setView] = useState("month");
  const [bookings, setBookings] = useState([]);
  const [halls, setHalls] = useState([]);
  const [hallFilter, setHallFilter] = useState("all");
  const [selected, setSelected] = useState(null);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();

  const cells = useMemo(
    () => monthGrid(year, month),
    [year, month]
  );

  const load = useCallback(async () => {
    try {
      const start = formatLocalDate(
        new Date(year, month - 1, 1)
      );

      const end = formatLocalDate(
        new Date(year, month + 2, 0)
      );

      const params = {
        start,
        end,
      };

      if (hallFilter !== "all") {
        params.hall_id = hallFilter;
      }

      const [{ data: b }, { data: h }] = await Promise.all([
        api.get("/bookings/calendar", { params }),
        api.get("/halls"),
      ]);

      setBookings(Array.isArray(b) ? b : []);
      setHalls(Array.isArray(h) ? h : []);
    } catch (error) {
      console.error("Failed to load calendar:", error);
      setBookings([]);
    }
  }, [year, month, hallFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const eventsOn = (date) => {
    if (!date) {
      return [];
    }

    const dateStr = formatLocalDate(date);

    return bookings.filter((booking) => {
      const eventDate = String(
        booking.event_date || ""
      ).slice(0, 10);

      return eventDate === dateStr;
    });
  };

  // Week view: 7 days from Sunday of current week
  const weekDays = useMemo(() => {
    const d = new Date(cursor);

    d.setDate(d.getDate() - d.getDay());

    return Array.from({ length: 7 }, (_, i) => {
      const x = new Date(d);
      x.setDate(d.getDate() + i);
      return x;
    });
  }, [cursor]);

  // Day timeline
  const dayStr = formatLocalDate(cursor);

  const dayEvents = bookings.filter((booking) => {
    const eventDate = String(
      booking.event_date || ""
    ).slice(0, 10);

    return eventDate === dayStr;
  });

  const hours = Array.from(
    { length: 15 },
    (_, i) => 8 + i
  );

  return (
    <div className="space-y-5" data-testid="calendar-page">
      <div className="flex flex-wrap justify-between items-end gap-3">
        <div>
          <h1 className="text-3xl font-display font-bold tracking-tight">
            Calendar
          </h1>

          <p className="text-muted-foreground text-sm">
            Halls, dates and events at a glance.
          </p>
        </div>

        <div className="flex gap-2">
          <Select
            value={hallFilter}
            onValueChange={setHallFilter}
          >
            <SelectTrigger
              className="w-52"
              data-testid="calendar-hall-filter"
            >
              <SelectValue placeholder="All Halls" />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="all">
                All Halls
              </SelectItem>

              {halls.map((hall) => (
                <SelectItem
                  key={hall.id}
                  value={String(hall.id)}
                >
                  {hall.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={view}
            onValueChange={setView}
          >
            <SelectTrigger
              className="w-32"
              data-testid="calendar-view"
            >
              <SelectValue />
            </SelectTrigger>

            <SelectContent>
              <SelectItem value="month">
                Month
              </SelectItem>

              <SelectItem value="week">
                Week
              </SelectItem>

              <SelectItem value="day">
                Day
              </SelectItem>

              <SelectItem value="timeline">
                Timeline
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="p-4 card-elev">
        <div className="flex items-center justify-between mb-4">
          <div className="flex gap-2">
            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                const d = new Date(cursor);

                if (view === "month") {
                  d.setMonth(d.getMonth() - 1);
                } else if (view === "week") {
                  d.setDate(d.getDate() - 7);
                } else {
                  d.setDate(d.getDate() - 1);
                }

                setCursor(d);
              }}
              data-testid="cal-prev"
            >
              <ChevronLeft size={16} />
            </Button>

            <Button
              variant="outline"
              onClick={() => setCursor(new Date())}
            >
              Today
            </Button>

            <Button
              size="icon"
              variant="outline"
              onClick={() => {
                const d = new Date(cursor);

                if (view === "month") {
                  d.setMonth(d.getMonth() + 1);
                } else if (view === "week") {
                  d.setDate(d.getDate() + 7);
                } else {
                  d.setDate(d.getDate() + 1);
                }

                setCursor(d);
              }}
              data-testid="cal-next"
            >
              <ChevronRight size={16} />
            </Button>
          </div>

          <div className="font-display text-xl">
            {view === "month"
              ? cursor.toLocaleDateString(undefined, {
                  month: "long",
                  year: "numeric",
                })
              : view === "week"
              ? `Week of ${weekDays[0].toLocaleDateString()}`
              : cursor.toLocaleDateString(undefined, {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
          </div>

          <div />
        </div>

        {/* MONTH VIEW */}
        {view === "month" && (
          <div className="grid grid-cols-7 gap-1 text-sm">
            {[
              "Sun",
              "Mon",
              "Tue",
              "Wed",
              "Thu",
              "Fri",
              "Sat",
            ].map((day) => (
              <div
                key={day}
                className="text-xs uppercase tracking-wider text-muted-foreground text-center py-2"
              >
                {day}
              </div>
            ))}

            {cells.map((date, index) => {
              const events = eventsOn(date);

              const isToday =
                date &&
                date.toDateString() ===
                  new Date().toDateString();

              return (
                <div
                  key={index}
                  className={`min-h-[110px] p-2 rounded-lg border ${
                    date
                      ? "bg-white/[0.02] border-border/50"
                      : "border-transparent"
                  } ${
                    isToday
                      ? "border-yellow-500/50 bg-yellow-500/5"
                      : ""
                  }`}
                >
                  {date && (
                    <>
                      <div
                        className={`text-xs font-semibold ${
                          isToday
                            ? "text-yellow-400"
                            : "text-muted-foreground"
                        }`}
                      >
                        {date.getDate()}
                      </div>

                      <div className="space-y-1 mt-1">
                        {events.slice(0, 3).map((event) => (
                          <button
                            key={event.id}
                            onClick={() =>
                              setSelected(event)
                            }
                            className={`w-full text-left text-[10px] px-1.5 py-1 rounded border truncate ${
                              STATUS_META[event.status]?.cls || ""
                            }`}
                            data-testid={`cal-event-${event.id}`}
                          >
                            {event.start_time}{" "}
                            {event.event_type}
                          </button>
                        ))}

                        {events.length > 3 && (
                          <div className="text-[10px] text-muted-foreground">
                            +{events.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* WEEK VIEW */}
        {view === "week" && (
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((date) => {
              const events = eventsOn(date);

              return (
                <div
                  key={date.toISOString()}
                  className="min-h-[300px] rounded-lg bg-white/[0.02] border border-border/50 p-2"
                >
                  <div className="text-xs font-semibold text-muted-foreground">
                    {date.toLocaleDateString(undefined, {
                      weekday: "short",
                    })}
                  </div>

                  <div className="text-lg font-display">
                    {date.getDate()}
                  </div>

                  <div className="space-y-1 mt-2">
                    {events.map((event) => (
                      <button
                        key={event.id}
                        onClick={() =>
                          setSelected(event)
                        }
                        className={`w-full text-left text-xs px-2 py-1.5 rounded border ${
                          STATUS_META[event.status]?.cls || ""
                        }`}
                      >
                        <div className="font-medium truncate">
                          {event.event_type}
                        </div>

                        <div className="opacity-70 truncate">
                          {event.hall_name} ·{" "}
                          {event.start_time}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* DAY VIEW */}
        {view === "day" && (
          <div className="space-y-2">
            {dayEvents.length === 0 && (
              <div className="text-muted-foreground text-sm py-6 text-center">
                No events today.
              </div>
            )}

            {[...dayEvents]
              .sort((a, b) =>
                String(a.start_time || "").localeCompare(
                  String(b.start_time || "")
                )
              )
              .map((event) => (
                <button
                  key={event.id}
                  onClick={() =>
                    setSelected(event)
                  }
                  className={`w-full text-left p-3 rounded-lg border flex justify-between items-center ${
                    STATUS_META[event.status]?.cls || ""
                  }`}
                >
                  <div>
                    <div className="font-medium">
                      {event.event_name ||
                        event.event_type}
                    </div>

                    <div className="text-xs opacity-70">
                      {event.customer_name} ·{" "}
                      {event.hall_name}
                    </div>
                  </div>

                  <div className="text-sm tabular">
                    {event.start_time} –{" "}
                    {event.end_time}
                  </div>
                </button>
              ))}
          </div>
        )}

        {/* TIMELINE VIEW */}
        {view === "timeline" && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left p-2 text-muted-foreground">
                    Hall
                  </th>

                  {hours.map((hour) => (
                    <th
                      key={hour}
                      className="p-1 text-muted-foreground text-center"
                    >
                      {hour}:00
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {halls
                  .filter(
                    (hall) =>
                      hallFilter === "all" ||
                      String(hall.id) ===
                        String(hallFilter)
                  )
                  .map((hall) => (
                    <tr
                      key={hall.id}
                      className="border-t border-border/40"
                    >
                      <td className="p-2 font-medium whitespace-nowrap">
                        {hall.name}
                      </td>

                      {hours.map((hour) => {
                        const event = dayEvents.find(
                          (item) =>
                            String(item.hall_id) ===
                              String(hall.id) &&
                            parseInt(
                              String(
                                item.start_time || ""
                              )
                            ) <= hour &&
                            parseInt(
                              String(
                                item.end_time || ""
                              )
                            ) > hour
                        );

                        return (
                          <td
                            key={hour}
                            className="p-1"
                          >
                            {event ? (
                              <button
                                onClick={() =>
                                  setSelected(event)
                                }
                                className={`w-full h-8 rounded border text-[10px] px-1 truncate ${
                                  STATUS_META[
                                    event.status
                                  ]?.cls || ""
                                }`}
                              >
                                {event.event_type}
                              </button>
                            ) : (
                              <div className="h-8 rounded bg-white/[0.02]" />
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* EVENT DETAILS */}
      <Dialog
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) {
            setSelected(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selected?.event_name ||
                selected?.event_type}
            </DialogTitle>
          </DialogHeader>

          {selected && (
            <div className="space-y-2 text-sm">
              <div>
                <b>Booking:</b>{" "}
                <span className="font-mono">
                  {selected.booking_number}
                </span>
              </div>

              <div>
                <b>Customer:</b>{" "}
                {selected.customer_name}
              </div>

              <div>
                <b>Hall:</b>{" "}
                {selected.hall_name}
              </div>

              <div>
                <b>Date:</b>{" "}
                {selected.event_date} ·{" "}
                {selected.start_time}–
                {selected.end_time}
              </div>

              <div>
                <b>Guests:</b>{" "}
                {selected.guest_count}
              </div>

              <div>
                <b>Total:</b>{" "}
                <span className="tabular">
                  {fmtINR(
                    selected.total_amount
                  )}
                </span>{" "}
                · <b>Due:</b>{" "}
                <span className="tabular text-rose-400">
                  {fmtINR(
                    selected.due_amount
                  )}
                </span>
              </div>

              <Badge
                className={
                  STATUS_META[selected.status]?.cls ||
                  ""
                }
              >
                {STATUS_META[selected.status]?.label ||
                  selected.status}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
