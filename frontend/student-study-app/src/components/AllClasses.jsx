import { useEffect, useState } from "react";
import { api } from "../api/client";
import ClassDetail from "./ClassDetail";

export default function AllClasses() {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [selectedClass, setSelectedClass] = useState(null);

    useEffect(() => {
        async function load() {
            try {
                const data = await api.listClasses();
                setClasses(data);
            } catch (e) {
                setErr(e.message || "Failed to load classes");
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    if (selectedClass) {
        return <ClassDetail classData={selectedClass} onBack={() => setSelectedClass(null)} />;
    }

    return (
        <div className="px-8 py-10 max-w-6xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">All Classes</h1>
            <p className="text-slate-500 mb-10">Manage and track your academic progress.</p>

            {err && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {classes.map((c) => (
                        <button
                            key={c.id || c.name}
                            onClick={() => setSelectedClass(c)}
                            className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-indigo-500/5 hover:-translate-y-0.5 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-6 group w-full text-left"
                        >
                            <div className="flex items-start gap-5">
                                <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-indigo-500/20">
                                    📖
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h2>
                                    <div className="flex items-center gap-3 mt-1">
                                        <p className="text-slate-500 text-sm font-medium">{c.professor || "No Professor"}</p>
                                        {c.semester && (
                                            <>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <p className="text-slate-400 text-sm">{c.semester}</p>
                                            </>
                                        )}
                                    </div>
                                    <div className="mt-3 text-xs bg-indigo-50 text-indigo-600 px-2.5 py-1 rounded-lg border border-indigo-100 inline-flex items-center gap-1.5">
                                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                                        Click to manage files
                                    </div>
                                </div>
                            </div>

                            <div className="text-xs text-slate-400 md:text-right">
                                Added {new Date(c.created_at).toLocaleDateString()}
                            </div>
                        </button>
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
