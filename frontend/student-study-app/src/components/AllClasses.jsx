import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AllClasses() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");

    useEffect(() => {
        async function load() {
            try {
                const data = await api.getClasses();
                setClasses(data);
            } catch (e) {
                setErr(e.message || "Failed to load classes");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    return (
        <div className="px-4 py-6 md:px-8 md:py-10 max-w-6xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">All Classes</h1>
            <p className="text-slate-500 mb-8 md:mb-10">Manage and track your academic progress.</p>

            {err && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((c) => (
                        <div key={c.id || c.name} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 group">
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-indigo-500/20">
                                    📖
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-slate-500 text-sm font-medium">{c.professor}</p>
                                        <span className="w-1 h-1 rounded-full bg-slate-300" />
                                        <p className="text-slate-400 text-sm">{c.semester || "Current"}</p>
                                    </div>
                                    <div className="mt-3 text-xs bg-slate-50 text-slate-600 px-2.5 py-1 rounded-lg border border-slate-100 inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                                        Next Exam: {c.nextExamDate || "TBA"}
                                    </div>
                                </div>
                            </div>

                            <div className="md:w-72 w-full bg-slate-50/50 p-5 rounded-2xl border border-slate-100/50">
                                <div className="flex justify-between text-xs font-bold mb-2 uppercase tracking-wide">
                                    <span className="text-slate-400">Course Progress</span>
                                    <span className="text-indigo-600">{Math.round((c.progress || 0) * 100)}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${(c.progress || 0) * 100}%` }} />
                                </div>
                            </div>
                        </div>
                    ))}

                    {classes.length === 0 && !err && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📭</div>
                            <h3 className="text-lg font-bold text-slate-900">No classes found</h3>
                            <p className="text-slate-500 text-sm mt-1">Get started by adding your first course.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
