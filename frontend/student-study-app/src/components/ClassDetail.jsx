import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function ClassDetail({ classData, onBack }) {
  const [files, setFiles] = useState({ syllabus: [], material: [], assessment: [] });
  const [uploading, setUploading] = useState(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    loadFiles();
  }, [classData.id]);

  async function loadFiles() {
    try {
      const [syllabi, materials, assessments] = await Promise.all([
        api.getClassFiles(classData.id, "syllabus"),
        api.getClassFiles(classData.id, "material"),
        api.getClassFiles(classData.id, "assessment"),
      ]);
      setFiles({
        syllabus: syllabi,
        material: materials,
        assessment: assessments,
      });
    } catch (e) {
      setErr(e.message || "Failed to load files");
    }
  }

  async function handleUpload(type, file) {
    setUploading(type);
    setErr("");
    try {
      if (type === "syllabus") {
        await api.uploadSyllabus(classData.id, file);
      } else if (type === "material") {
        await api.uploadMaterial(classData.id, file);
      } else if (type === "assessment") {
        await api.uploadAssessment(classData.id, file);
      }
      await loadFiles();
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploading(null);
    }
  }

  function FileUploadSection({ title, type, fileList, icon }) {
    return (
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-xl">
              {icon}
            </div>
            <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          </div>
          <label className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50">
            {uploading === type ? "Uploading..." : "Upload PDF"}
            <input
              type="file"
              accept=".pdf"
              className="hidden"
              disabled={uploading === type}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleUpload(type, file);
                e.target.value = "";
              }}
            />
          </label>
        </div>

        {fileList.length === 0 ? (
          <div className="text-sm text-slate-400 py-4 text-center border-2 border-dashed border-slate-100 rounded-xl">
            No files uploaded yet
          </div>
        ) : (
          <div className="space-y-2">
            {fileList.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-sm"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg">📄</span>
                  <span className="font-medium text-slate-700 truncate">{file.filename}</span>
                </div>
                <span className="text-xs text-slate-400">
                  {new Date(file.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="px-8 py-10 max-w-7xl mx-auto">
      <button
        onClick={onBack}
        className="mb-6 text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-2 transition-colors"
      >
        ← Back to All Classes
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">{classData.name}</h1>
        <div className="flex items-center gap-4 text-slate-500">
          {classData.professor && <span>👨‍🏫 {classData.professor}</span>}
          {classData.semester && <span>📅 {classData.semester}</span>}
        </div>
      </div>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6">
        <FileUploadSection
          title="Syllabus"
          type="syllabus"
          fileList={files.syllabus}
          icon="📋"
        />
        <FileUploadSection
          title="Class Materials (Slides, Notes, etc.)"
          type="material"
          fileList={files.material}
          icon="📚"
        />
        <FileUploadSection
          title="Past Assessments (Quizzes, Tests, Exams)"
          type="assessment"
          fileList={files.assessment}
          icon="📝"
        />
      </div>

      <div className="mt-8 p-6 bg-indigo-50 border border-indigo-100 rounded-2xl">
        <h3 className="font-bold text-indigo-900 mb-2">💡 Tips</h3>
        <ul className="text-sm text-indigo-700 space-y-1">
          <li>• Upload your syllabus to auto-generate a calendar with all important dates</li>
          <li>• Upload class materials to enable AI-powered study sessions and quizzes</li>
          <li>• Past assessments help the AI understand what types of questions to expect</li>
        </ul>
      </div>
    </div>
  );
}
