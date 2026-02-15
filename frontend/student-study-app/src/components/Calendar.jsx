import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Calendar() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(null);
    const [selectedDayEvents, setSelectedDayEvents] = useState([]);

    async function loadCalendar({ regenerate = false } = {}) {
        setErr("");
        setLoading(true);
        try {
            if (regenerate) {
                const classesData = await api.listClasses();
                const classIds = (classesData.classes || []).map((c) => c.id);
                if (classIds.length > 0) {
                    await api.generateCalendar(classIds);
                }
            }

            const data = await api.getCalendar();
            setEvents(data);
            // Auto-navigate to the month of the first event if available
            if (data && data.length > 0) {
                const firstEvent = data[0];
                const dateStr = firstEvent.due_date || firstEvent.date;
                if (dateStr) {
                    const [y, m, d] = dateStr.split('-').map(Number);
                    // Month is 0-indexed in JS Date
                    setCurrentDate(new Date(y, m - 1, d));
                }
            }
        } catch (e) {
            setErr(e.message || "Failed to load calendar");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadCalendar();
    }, []);

    function formatTime12(timeValue) {
        if (!timeValue) return "";
        const value = String(timeValue).trim().toLowerCase();
        const match = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/);
        if (!match) return value;

        const hourRaw = Number(match[1]);
        const minuteRaw = Number(match[2] || "0");
        const suffix = match[3] || null;
        if (Number.isNaN(hourRaw) || Number.isNaN(minuteRaw)) return value;

        let hour24 = hourRaw;
        if (suffix === "am" && hour24 === 12) hour24 = 0;
        if (suffix === "pm" && hour24 < 12) hour24 += 12;
        if (suffix === "pm" && hour24 > 23) hour24 = hourRaw % 12 || 12;
        if (!suffix) hour24 = hourRaw % 24;

        const hour = hour24;
        const period = hour >= 12 ? "pm" : "am";
        const hour12 = hour % 12 || 12;
        if (minuteRaw === 0) return `${hour12}${period}`;
        return `${hour12}:${String(minuteRaw).padStart(2, "0")}${period}`;
    }

    function isImportantDeadline(ev) {
        const eventType = (ev.type || "").toLowerCase();
        const title = `${ev.title || ""} ${ev.name || ""}`.toLowerCase();
        const classTimeKeywords = ["class time", "office hour", "lecture", "lab", "discussion"];
        if (classTimeKeywords.some((k) => title.includes(k))) {
            return false;
        }
        if (["exam", "quiz", "assignment", "project"].includes(eventType)) {
            return true;
        }
        const importantKeywords = ["last day", "drop", "withdraw", "deadline", "final", "midterm", "due"];
        return importantKeywords.some((k) => title.includes(k));
    }

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

    function openDayEvents(dateStr, dayEvents) {
        if (!dayEvents || dayEvents.length === 0) return;
        setSelectedDate(dateStr);
        setSelectedDayEvents(dayEvents);
    }

    return (
        <div className="px-4 sm:px-6 md:px-8 py-6 md:py-10 h-full overflow-y-auto overflow-x-hidden max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Study Calendar</h1>
                    <p className="text-slate-500 mt-1">Track your upcoming exams and study sessions.</p>
                </div>

                <div className="flex items-center gap-4 bg-white p-1.5 rounded-2xl shadow-sm border border-slate-200/60 shadow-indigo-500/5">
                    <button
                        onClick={() => {
                            const next = new Date(currentDate);
                            next.setMonth(next.getMonth() - 1);
                            setCurrentDate(next);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        ←
                    </button>
                    <div className="text-sm font-bold text-slate-800 w-36 text-center select-none">
                        {monthName} {year}
                    </div>
                    <button
                        onClick={() => {
                            const next = new Date(currentDate);
                            next.setMonth(next.getMonth() + 1);
                            setCurrentDate(next);
                        }}
                        className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-600 hover:text-indigo-600 transition-colors"
                    >
                        →
                    </button>
                </div>
                <button
                    onClick={() => loadCalendar({ regenerate: true })}
                    disabled={loading}
                    className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? "Reloading..." : "Reload Calendar"}
                </button>
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
                    <div className="overflow-x-auto">
                        <div className="min-w-[700px]">
                            {/* Days Header */}
                            <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50">
                                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                                    <div key={d} className="py-3 sm:py-4 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                                        {d}
                                    </div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7">
                                {blanks.map((index) => (
                                    <div key={`blank-${index}`} className="min-h-[110px] sm:min-h-[140px] bg-slate-50/30 border-b border-r border-slate-100/50 last:border-r-0" />
                                ))}

                                {days.map((day) => {
                                    const dateStr = `${year}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                    const dayEvents = events.filter(e => (e.due_date || e.date) === dateStr || (e.due_date || e.date)?.startsWith(dateStr));
                                    const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                                    return (
                                        <button
                                            type="button"
                                            key={day}
                                            onClick={() => openDayEvents(dateStr, dayEvents)}
                                            className={`min-h-[110px] sm:min-h-[140px] p-2.5 sm:p-3 border-b border-r border-slate-100/50 hover:bg-slate-50 transition-colors relative group text-left ${day % 7 === 0 ? 'border-r-0' : ''} ${dayEvents.length ? 'cursor-pointer' : 'cursor-default'}`}
                                        >
                                            <div className={`text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full mb-2 transition-all ${isToday ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 scale-110' : 'text-slate-500 group-hover:bg-white group-hover:shadow-sm'}`}>
                                                {day}
                                            </div>

                                            <div className="space-y-1.5 overflow-y-auto max-h-[70px] sm:max-h-[90px] custom-scrollbar">
                                                {dayEvents.map((ev, i) => (
                                                    <div
                                                        key={i}
                                                        className={`text-[10px] px-2 py-1.5 rounded-lg font-semibold border transition-all cursor-default flex flex-col gap-0.5 group/event ${
                                                            isImportantDeadline(ev)
                                                                ? "bg-red-50/90 hover:bg-red-100 text-red-700 border-red-100/80"
                                                                : "bg-indigo-50/80 hover:bg-indigo-100 text-indigo-700 border-indigo-100/50"
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <div className={`w-1.5 h-1.5 rounded-full transition-colors ${
                                                                isImportantDeadline(ev)
                                                                    ? "bg-red-400 group-hover/event:bg-red-600"
                                                                    : "bg-indigo-400 group-hover/event:bg-indigo-600"
                                                            }`} />
                                                            <span className="truncate">{ev.title || ev.name}</span>
                                                        </div>
                                                        {(ev.start_time || ev.end_time) && (
                                                            <div className={`text-[9px] pl-3 font-medium ${
                                                                isImportantDeadline(ev) ? "text-red-400" : "text-indigo-400"
                                                            }`}>
                                                                {formatTime12(ev.start_time) || ""} {ev.end_time ? ` - ${formatTime12(ev.end_time)}` : ""}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {selectedDate && (
                <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-100 max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                            <div>
                                <h3 className="text-lg font-bold text-slate-900">Events on {selectedDate}</h3>
                                <p className="text-xs text-slate-500">{selectedDayEvents.length} event{selectedDayEvents.length !== 1 ? "s" : ""}</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => {
                                    setSelectedDate(null);
                                    setSelectedDayEvents([]);
                                }}
                                className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                            >
                                Close
                            </button>
                        </div>
                        <div className="p-6 space-y-3 overflow-y-auto max-h-[65vh]">
                            {selectedDayEvents.map((ev, idx) => (
                                <div
                                    key={`${selectedDate}-${idx}`}
                                    className={`rounded-xl border p-4 ${
                                        isImportantDeadline(ev)
                                            ? "bg-red-50 border-red-100 text-red-800"
                                            : "bg-indigo-50 border-indigo-100 text-indigo-800"
                                    }`}
                                >
                                    <p className="font-semibold">{ev.title || ev.name}</p>
                                    <p className="text-xs mt-1 opacity-80">{ev.type || "other"}</p>
                                    {(ev.start_time || ev.end_time) && (
                                        <p className="text-xs mt-1">
                                            {formatTime12(ev.start_time)} {ev.end_time ? `- ${formatTime12(ev.end_time)}` : ""}
                                        </p>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
