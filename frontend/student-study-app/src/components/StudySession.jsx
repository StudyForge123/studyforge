import { useState } from "react";
import { api } from "../api/client";

export default function StudySession({ classes = [] }) {
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [question, setQuestion] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [revealChecks, setRevealChecks] = useState({});

  async function handleGenerate() {
    if (!classId) {
      setErr("Select a class");
      return;
    }
    setErr("");
    setLoading(true);
    setResult(null);
    try {
      const data = await api.generateStudySession({
        class_id: classId,
        topic: topic || undefined,
        question: question || undefined,
      });
      setResult(data);
    } catch (e) {
      setErr(e.message || "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  const slides = result?.slides || [];
  const checks = result?.knowledge_checks || [];

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Study Session</h1>
      <p className="text-slate-500 mb-8">Generate slide-style content and knowledge checks from your class PDFs.</p>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-8 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Class</label>
          <select
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full max-w-xs rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          >
            <option value="">Select class</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Topic (optional)</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Newton's laws"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Question (optional)</label>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="What should the session focus on?"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Start Study Session"}
        </button>
      </div>

      {slides.length > 0 && (
        <div className="mb-10">
          <h2 className="text-xl font-bold text-slate-900 mb-4">Slides</h2>
          <div className="space-y-6">
            {slides.map((s, i) => (
              <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 mb-2">{s.title}</h3>
                <ul className="list-disc list-inside text-slate-700 space-y-1">
                  {(s.bullets || []).map((b, j) => (
                    <li key={j}>{b}</li>
                  ))}
                </ul>
                {s.speaker_notes && (
                  <p className="mt-3 text-sm text-slate-500 italic border-t border-slate-100 pt-3">Notes: {s.speaker_notes}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {checks.length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-slate-900 mb-4">Knowledge Checks</h2>
          <div className="space-y-4">
            {checks.map((k, i) => (
              <div key={i} className="bg-slate-50 rounded-2xl border border-slate-200 p-6">
                <p className="font-medium text-slate-900">{k.question}</p>
                <button
                  type="button"
                  onClick={() => setRevealChecks((r) => ({ ...r, [i]: !r[i] }))}
                  className="mt-2 text-sm text-indigo-600 hover:underline"
                >
                  {revealChecks[i] ? "Hide" : "Show answer"}
                </button>
                {revealChecks[i] && (
                  <div className="mt-2 p-3 bg-white rounded-xl text-sm">
                    <p><strong>Answer:</strong> {k.answer}</p>
                    <p className="mt-2 text-slate-600">{k.explanation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
