import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Calendar({ classes = [] }) {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [currentDate, setCurrentDate] = useState(new Date());

  useEffect(() => {
    async function load() {
      const ids = (classes || []).map((c) => c.id).filter(Boolean);
      if (ids.length === 0) {
        setEvents([]);
        setLoading(false);
        return;
      }
      try {
        const data = await api.getCalendar(ids);
        setEvents(Array.isArray(data) ? data : []);
      } catch (e) {
        setErr(e.message || "Failed to load calendar");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [classes?.length, classes?.map((c) => c.id).join(",")]);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const monthName = currentDate.toLocaleString("default", { month: "long" });
  const year = currentDate.getFullYear();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

  // Backend events use due_date (YYYY-MM-DD)
  const eventDate = (ev) => ev.due_date || ev.date || "";

  return (
    <div className="px-8 py-10 h-full overflow-y-auto max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Study Calendar</h1>
          <p className="text-slate-500 mt-1">Track your upcoming exams and study sessions.</p>
        </div>
        <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/60">
          <button
            type="button"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600"
          >
            ←
          </button>
          <div className="text-sm font-bold text-slate-800 w-36 text-center select-none">
            {monthName} {year}
          </div>
          <button
            type="button"
            onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1))}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600"
          >
            →
          </button>
        </div>
      </div>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200 shadow-sm animate-pulse">
          Loading calendar events...
        </div>
      ) : (
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {blanks.map((index) => (
              <div key={`blank-${index}`} className="min-h-[140px] bg-slate-50/30 border-b border-r border-slate-100/50 last:border-r-0" />
            ))}
            {days.map((day) => {
              const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const dayEvents = events.filter((e) => eventDate(e) === dateStr || eventDate(e)?.startsWith(dateStr));
              const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();
              return (
                <div
                  key={day}
                  className={`min-h-[140px] p-3 border-b border-r border-slate-100/50 hover:bg-slate-50 transition-colors relative group ${day % 7 === 0 ? "border-r-0" : ""}`}
                >
                  <div
                    className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-full mb-2 transition-all ${
                      isToday ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110" : "text-slate-500 group-hover:bg-white group-hover:shadow-sm"
                    }`}
                  >
                    {day}
                  </div>
                  <div className="space-y-1.5 overflow-y-auto max-h-[90px]">
                    {dayEvents.map((ev, i) => (
                      <div
                        key={i}
                        className="text-[10px] px-2.5 py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold border border-indigo-100/50 truncate transition-all cursor-default flex items-center gap-1.5"
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                        {ev.title || ev.name}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
