import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function AllClasses({ onSelectClass, selectedClassId }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [expandedId, setExpandedId] = useState(null);
  const [uploading, setUploading] = useState(null);
  const [files, setFiles] = useState({});

  async function load() {
    try {
      const data = await api.listClasses();
      setClasses(Array.isArray(data) ? data : []);
    } catch (e) {
      setErr(e.message || "Failed to load classes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function loadFiles(classId) {
    try {
      const list = await api.listClassFiles(classId);
      setFiles((prev) => ({ ...prev, [classId]: list || [] }));
    } catch (_) {
      setFiles((prev) => ({ ...prev, [classId]: [] }));
    }
  }

  useEffect(() => {
    if (expandedId) loadFiles(expandedId);
  }, [expandedId]);

  async function handleUpload(classId, type, file) {
    if (!file?.name?.toLowerCase().endsWith(".pdf")) {
      setErr("Only PDF files are supported");
      return;
    }
    setErr("");
    setUploading(`${classId}-${type}`);
    try {
      if (type === "syllabus") await api.uploadSyllabus(classId, file);
      else if (type === "material") await api.uploadMaterial(classId, file);
      else if (type === "assessment") await api.uploadAssessment(classId, file);
      await loadFiles(classId);
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  async function handleGenerateCalendar(classIds) {
    setErr("");
    try {
      await api.generateCalendar(classIds);
      setErr("");
    } catch (e) {
      setErr(e.message || "Generate failed");
    }
  }

  return (
    <div className="px-8 py-10 max-w-6xl mx-auto h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">All Classes</h1>
      <p className="text-slate-500 mb-10">Manage classes and upload PDFs. Generate calendar from syllabi.</p>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-40 bg-white rounded-2xl border border-slate-100 shadow-sm animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {classes.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div
                className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 cursor-pointer hover:bg-slate-50/50"
                onClick={() => setExpandedId(expandedId === c.id ? null : c.id)}
              >
                <div className="flex items-start gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-2xl flex-shrink-0">
                    📖
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{c.name}</h2>
                    <p className="text-slate-500 text-sm mt-1">ID: {c.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectClass?.(c.id);
                    }}
                    className="px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    Use for chat
                  </button>
                  <span className="text-slate-400">{expandedId === c.id ? "▼" : "▶"}</span>
                </div>
              </div>

              {expandedId === c.id && (
                <div className="border-t border-slate-100 p-6 bg-slate-50/30 space-y-4">
                  <div className="text-sm font-semibold text-slate-700">Upload PDFs</div>
                  <div className="flex flex-wrap gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-slate-600">Syllabus</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(c.id, "syllabus", f);
                          e.target.value = "";
                        }}
                        disabled={!!uploading}
                      />
                      <span className="px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                        {uploading === `${c.id}-syllabus` ? "Uploading…" : "Choose PDF"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-slate-600">Material</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(c.id, "material", f);
                          e.target.value = "";
                        }}
                        disabled={!!uploading}
                      />
                      <span className="px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                        {uploading === `${c.id}-material` ? "Uploading…" : "Choose PDF"}
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <span className="text-sm text-slate-600">Assessment</span>
                      <input
                        type="file"
                        accept=".pdf"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUpload(c.id, "assessment", f);
                          e.target.value = "";
                        }}
                        disabled={!!uploading}
                      />
                      <span className="px-3 py-1.5 bg-white border rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50">
                        {uploading === `${c.id}-assessment` ? "Uploading…" : "Choose PDF"}
                      </span>
                    </label>
                  </div>
                  <div className="text-xs text-slate-500">
                    Files: {(files[c.id] || []).map((f) => f.filename).join(", ") || "None"}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleGenerateCalendar([c.id])}
                    className="px-4 py-2 text-sm font-medium rounded-xl bg-indigo-600 text-white hover:bg-indigo-700"
                  >
                    Generate calendar (this class)
                  </button>
                </div>
              )}
            </div>
          ))}

          {classes.length === 0 && !err && (
            <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-4xl">📭</div>
              <h3 className="text-lg font-bold text-slate-900">No classes found</h3>
              <p className="text-slate-500 text-sm mt-1">Add a class from the Dashboard.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
