import { useMemo, useState } from "react";
import { api } from "../api/client";

function StatCard({ label, value, color }) {
  return (
    <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-4px_rgba(6,81,237,0.1)] border border-slate-100/50 hover:shadow-lg hover:shadow-indigo-500/5 transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <div className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</div>
        <div className={`w-2 h-2 rounded-full ${color?.replace('text-', 'bg-') || 'bg-slate-900'} opacity-50 group-hover:opacity-100 transition-opacity`} />
      </div>
      <div className={`text-4xl font-bold tracking-tight ${color || "text-slate-900"}`}>{value ?? "-"}</div>
    </div>
  );
}

function ClassCard({ c, onOpen, onRefresh }) {
  const progress = c.progress ?? 0;
  const [uploading, setUploading] = useState(false);
  const [uploadType, setUploadType] = useState("");

  async function handleFileUpload(e, type) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadType(type);
    try {
      if (type === "syllabus") {
        await api.uploadSyllabus(c.id, file);
      } else if (type === "material") {
        await api.uploadMaterial(c.id, file);
      } else if (type === "assessment") {
        await api.uploadAssessment(c.id, file);
      }
      alert(`${type} uploaded successfully!`);
      onRefresh?.();
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally {
      setUploading(false);
      setUploadType("");
      e.target.value = "";
    }
  }

  return (
    <div className="text-left bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300 group w-full">
      <div className="flex justify-between items-start mb-4">
        <div>
          <div className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.name}</div>
          <div className="text-sm text-slate-500 font-medium">{c.professor || "No Professor"}</div>
        </div>
        <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-indigo-50 transition-colors">
          <span className="text-xl">📚</span>
        </div>
      </div>

      {/* Upload Buttons */}
      <div className="mb-4 grid grid-cols-3 gap-2">
        <label className="relative cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(e, "syllabus")}
            className="hidden"
            disabled={uploading}
          />
          <div className="text-xs font-medium text-slate-600 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 px-2 py-1.5 rounded-lg border border-slate-100 hover:border-indigo-200 transition-all text-center">
            {uploading && uploadType === "syllabus" ? "..." : "📄 Syllabus"}
          </div>
        </label>
        
        <label className="relative cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(e, "material")}
            className="hidden"
            disabled={uploading}
          />
          <div className="text-xs font-medium text-slate-600 hover:text-emerald-600 bg-slate-50 hover:bg-emerald-50 px-2 py-1.5 rounded-lg border border-slate-100 hover:border-emerald-200 transition-all text-center">
            {uploading && uploadType === "material" ? "..." : "📖 Material"}
          </div>
        </label>
        
        <label className="relative cursor-pointer">
          <input
            type="file"
            accept=".pdf"
            onChange={(e) => handleFileUpload(e, "assessment")}
            className="hidden"
            disabled={uploading}
          />
          <div className="text-xs font-medium text-slate-600 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-2 py-1.5 rounded-lg border border-slate-100 hover:border-amber-200 transition-all text-center">
            {uploading && uploadType === "assessment" ? "..." : "✍️ Test"}
          </div>
        </label>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex justify-between text-xs font-semibold mb-1.5">
            <span className="text-slate-500">Progress</span>
            <span className="text-indigo-600">{Math.round(progress * 100)}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-50 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-medium bg-red-50 text-red-600 px-2 py-1 rounded-md">Next Exam</span>
          <span>{c.nextExamDate || "Not scheduled"}</span>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({
  dashboard,
  classes,
  loading,
  err,
  onAddClass,
  onGenerateCalendar,
}) {
  const stats = useMemo(() => {
    return [
      { label: "Active Classes", value: dashboard?.activeClasses, color: "text-indigo-600" },
      { label: "Upcoming Deadlines", value: dashboard?.upcomingDeadlines, color: "text-amber-500" },
      { label: "Study Sessions", value: dashboard?.scheduledSessions, color: "text-emerald-500" },
    ];
  }, [dashboard]);

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
        <div>
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
            Dashboard
          </h1>
          <p className="text-slate-500">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>

        <div className="flex gap-4">
          {/* Actions */}
          <button
            onClick={onGenerateCalendar}
            className="bg-white border border-slate-200 text-slate-700 px-5 py-2.5 text-sm font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm"
          >
            Refesh Calendar
          </button>
          <button
            onClick={onAddClass}
            className="bg-slate-900 text-white px-6 py-2.5 text-sm font-semibold rounded-xl shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all hover:-translate-y-0.5"
          >
            + Add Class
          </button>
        </div>
      </div>

      {err ? (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-3">
          <span className="w-2 h-2 rounded-full bg-red-500" /> {err}
        </div>
      ) : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      <div>
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          Current Courses <span className="text-xs font-normal text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{classes.length}</span>
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
            Loading your classes...
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((c) => (
              <ClassCard key={c.id || c.name} c={c} onOpen={() => { }} onRefresh={() => window.location.reload()} />
            ))}

            {/* Empty State / Add New Placeholder */}
            <button
              onClick={onAddClass}
              className="border-2 border-dashed border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-500 transition-all min-h-[200px] group"
            >
              <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center mb-3 group-hover:bg-white group-hover:shadow-sm transition-colors">
                <span className="text-2xl">+</span>
              </div>
              <span className="font-medium">Add another class</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
