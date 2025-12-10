import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Event {
  id: number;
  title: string;
  date: string | null;
  timeRange: string | null;
  fee: number;
  isProposal: number;
  minParticipants: number | null;
  isConfirmed: number;
}

interface EventCalendarProps {
  events: Event[];
  onDateClick?: (date: string) => void;
}

export default function EventCalendar({ events, onDateClick }: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDayOfWeek = firstDay.getDay();

  // Create calendar grid
  const calendarDays: (number | null)[] = [];
  
  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null);
  }
  
  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day);
  }

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    if (event.date) {
      if (!acc[event.date]) {
        acc[event.date] = [];
      }
      acc[event.date].push(event);
    }
    return acc;
  }, {} as Record<string, Event[]>);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (onDateClick) {
      onDateClick(dateStr);
    }
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return eventsByDate[dateStr] || [];
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      month === today.getMonth() &&
      year === today.getFullYear()
    );
  };

  const monthNames = [
    "1월", "2월", "3월", "4월", "5월", "6월",
    "7월", "8월", "9월", "10월", "11월", "12월"
  ];

  const dayNames = ["일", "월", "화", "수", "목", "금", "토"];

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {year}년 {monthNames[month]}
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrevMonth}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleNextMonth}>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1">
          {/* Day names header */}
          {dayNames.map((day) => (
            <div
              key={day}
              className="text-center text-sm font-medium text-muted-foreground py-2"
            >
              {day}
            </div>
          ))}

          {/* Calendar days */}
          {calendarDays.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const dayEvents = getEventsForDay(day);
            const hasEvents = dayEvents.length > 0;

            return (
              <button
                key={day}
                onClick={() => handleDayClick(day)}
                className={`
                  aspect-square p-1 rounded-lg border transition-colors
                  ${isToday(day) ? "border-primary bg-primary/10" : "border-border"}
                  ${hasEvents ? "bg-accent/50 hover:bg-accent" : "hover:bg-muted"}
                  relative
                `}
              >
                <div className="text-sm font-medium">{day}</div>
                {hasEvents && (
                  <div className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
                    {dayEvents.slice(0, 3).map((_, i) => (
                      <div
                        key={i}
                        className="w-1 h-1 rounded-full bg-primary"
                      />
                    ))}
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-4 pt-4 border-t flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded border-primary bg-primary/10" />
            <span>오늘</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-1 h-1 rounded-full bg-primary" />
            <span>모임 있음</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
