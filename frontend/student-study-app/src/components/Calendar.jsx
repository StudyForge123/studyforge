import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Calendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getCalendar();
                setEvents(data);
            } catch (e) {
                setErr(e.message || "Failed to load calendar");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayOfMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    const monthName = currentDate.toLocaleString("default", { month: "long" });
    const year = currentDate.getFullYear();

    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfMonth }, (_, i) => i);

    return (
        <div className="px-4 py-6 md:px-8 md:py-10 h-full overflow-y-auto max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 md:mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Study Calendar</h1>
                    <p className="text-slate-500 mt-1">Track your upcoming exams and study sessions.</p>
                </div>

                <div className="flex items-center self-start md:self-auto gap-4 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/60 shadow-indigo-500/5">
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() - 1)))}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        ←
                    </button>
                    <div className="text-sm font-bold text-slate-800 w-36 text-center select-none">
                        {monthName} {year}
                    </div>
                    <button
                        onClick={() => setCurrentDate(new Date(currentDate.setMonth(currentDate.getMonth() + 1)))}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
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
                <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden overflow-x-auto">
                    <div className="min-w-[700px]">
                        {/* Days Header */}
                        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                <div key={d} className="py-4 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                                    {d}
                                </div>
                            ))}
                        </div>

                        <div className="grid grid-cols-7">
                            {blanks.map((index) => (
                                <div key={`blank-${index}`} className="min-h-[100px] md:min-h-[140px] bg-slate-50/30 border-b border-r border-slate-100/50 last:border-r-0" />
                            ))}

                            {days.map((day) => {
                                const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                const dayEvents = events.filter(e => e.date === dateStr || e.date?.startsWith(dateStr));
                                const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                                return (
                                    <div key={day} className={`min-h-[100px] md:min-h-[140px] p-2 md:p-3 border-b border-r border-slate-100/50 hover:bg-slate-50 transition-colors relative group ${day % 7 === 0 ? 'border-r-0' : ''}`}>
                                        <div className={`text-xs font-bold w-6 h-6 md:w-7 md:h-7 flex items-center justify-center rounded-full mb-1 md:mb-2 transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' : 'text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                            {day}
                                        </div>

                                        <div className="space-y-1.5 overflow-y-auto max-h-[60px] md:max-h-[90px] custom-scrollbar">
                                            {dayEvents.map((ev, i) => (
                                                <div key={i} className="text-[10px] px-1.5 py-1 md:px-2.5 md:py-1.5 bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold border border-indigo-100/50 truncate transition-all cursor-default flex items-center gap-1.5 group/event">
                                                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 group-hover/event:bg-indigo-600 transition-colors flex-shrink-0" />
                                                    <span className="truncate">{ev.title || ev.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
