import { useState } from "react";
import { api } from "../api/client";

export default function Quiz({ classes = [] }) {
  const [classId, setClassId] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [instructions, setInstructions] = useState("");
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [reveal, setReveal] = useState({});

  async function handleGenerate() {
    if (!classId) {
      setErr("Select a class");
      return;
    }
    setErr("");
    setLoading(true);
    setQuestions([]);
    try {
      const list = await api.generateQuiz({
        class_id: classId,
        num_questions: numQuestions,
        difficulty,
        topic: topic || undefined,
        instructions: instructions || undefined,
      });
      setQuestions(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(e.message || "Generate failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Quiz Generator</h1>
      <p className="text-slate-500 mb-8">Generate a quiz from your class PDFs (syllabus + materials).</p>

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
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1"># Questions</label>
            <input
              type="number"
              min={1}
              max={20}
              value={numQuestions}
              onChange={(e) => setNumQuestions(Number(e.target.value) || 5)}
              className="w-24 rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Topic (optional)</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g. Chapter 3"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Instructions (optional)</label>
          <input
            type="text"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g. Focus on definitions"
            className="w-full max-w-md rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
          />
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Generating…" : "Generate Quiz"}
        </button>
      </div>

      {questions.length > 0 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Questions</h2>
          {questions.map((q, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-6">
              <p className="font-medium text-slate-900 mb-2">{i + 1}. {q.question}</p>
              {q.options?.length > 0 && (
                <ul className="list-disc list-inside text-slate-600 text-sm mb-2">
                  {q.options.map((opt, j) => (
                    <li key={j}>{opt}</li>
                  ))}
                </ul>
              )}
              <button
                type="button"
                onClick={() => setReveal((r) => ({ ...r, [i]: !r[i] }))}
                className="text-sm text-indigo-600 hover:underline"
              >
                {reveal[i] ? "Hide answer" : "Show answer"}
              </button>
              {reveal[i] && (
                <div className="mt-2 p-3 bg-slate-50 rounded-xl text-sm">
                  <p><strong>Answer:</strong> {q.answer}</p>
                  <p className="mt-2 text-slate-600"><strong>Explanation:</strong> {q.explanation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
