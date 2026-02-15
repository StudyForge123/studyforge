import { useEffect, useState, useRef } from "react";
import { api } from "../api/client";

export default function AllClasses({ onUploadFile }) {
    const [classes, setClasses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState("");
    const [classFiles, setClassFiles] = useState({}); // { classId: [files] }
    const [expandedClass, setExpandedClass] = useState(null);
    const fileInputRef = useRef(null);
    const [uploadClassId, setUploadClassId] = useState(null);

    async function load() {
        try {
            const data = await api.listClasses();
            setClasses(data.classes || []);
        } catch (e) {
            setErr(e.message || "Failed to load classes");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        load();
    }, []);

    async function toggleFiles(classId) {
        if (expandedClass === classId) {
            setExpandedClass(null);
            return;
        }
        setExpandedClass(classId);
        if (!classFiles[classId]) {
            try {
                const data = await api.listFiles(classId);
                setClassFiles(prev => ({ ...prev, [classId]: data.files || [] }));
            } catch (e) {
                setClassFiles(prev => ({ ...prev, [classId]: [] }));
            }
        }
    }

    function handleUploadClick(classId) {
        setUploadClassId(classId);
        fileInputRef.current?.click();
    }

    async function handleFileChange(e) {
        const file = e.target.files?.[0];
        if (!file || !uploadClassId) return;

        try {
            const type = prompt("File type? (syllabus/material/assessment)", "material") || "material";
            await api.uploadFile(uploadClassId, file, type);
            alert(`${type} uploaded and indexed successfully!`);
            // Refresh files for this class
            const data = await api.listFiles(uploadClassId);
            setClassFiles(prev => ({ ...prev, [uploadClassId]: data.files || [] }));
        } catch (e) {
            setErr(e.message || "Upload failed");
        } finally {
            setUploadClassId(null);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    }

    const typeColors = {
        syllabus: "bg-violet-100 text-violet-700 border-violet-200",
        material: "bg-blue-100 text-blue-700 border-blue-200",
        assessment: "bg-amber-100 text-amber-700 border-amber-200",
    };

    return (
        <div className="px-8 py-10 max-w-6xl mx-auto h-full overflow-y-auto">
            <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">All Classes</h1>
            <p className="text-slate-500 mb-10">Manage your classes and uploaded materials.</p>

            {/* Hidden file input */}
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf"
                className="hidden"
                style={{ display: 'none' }}
            />

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
                        <div key={c.id || c.name} className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 overflow-hidden group">
                            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div className="flex items-start gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300 shadow-sm group-hover:shadow-indigo-500/20">
                                        📖
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</h2>
                                        <p className="text-slate-400 text-sm mt-0.5">
                                            Created {c.created_at ? new Date(c.created_at).toLocaleDateString() : "recently"}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => toggleFiles(c.id)}
                                        className="text-sm font-medium text-slate-600 hover:text-indigo-600 px-4 py-2 rounded-xl border border-slate-200 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all"
                                    >
                                        {expandedClass === c.id ? "Hide Files" : "View Files"}
                                    </button>
                                    <button
                                        onClick={() => handleUploadClick(c.id)}
                                        className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-xl shadow-md shadow-indigo-500/20 transition-all hover:-translate-y-0.5"
                                    >
                                        Upload PDF
                                    </button>
                                </div>
                            </div>

                            {/* Expandable files section */}
                            {expandedClass === c.id && (
                                <div className="px-6 pb-6 border-t border-slate-100 pt-4">
                                    {!classFiles[c.id] || classFiles[c.id].length === 0 ? (
                                        <p className="text-sm text-slate-400 italic">No files uploaded yet. Upload a syllabus or material PDF to get started.</p>
                                    ) : (
                                        <div className="space-y-2">
                                            {classFiles[c.id].map((f, i) => (
                                                <div key={f.id || i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                                                    <span className="text-lg">📄</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="text-sm font-medium text-slate-800 truncate">{f.filename}</div>
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-lg border ${typeColors[f.file_type] || "bg-slate-100 text-slate-600 border-slate-200"}`}>
                                                        {f.file_type}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}

                    {classes.length === 0 && !err && (
                        <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📭</div>
                            <h3 className="text-lg font-bold text-slate-900">No classes found</h3>
                            <p className="text-slate-500 text-sm mt-1">Get started by adding your first course from the Dashboard.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
