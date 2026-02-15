import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function Quiz() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [numQuestions, setNumQuestions] = useState(5);
  const [difficulty, setDifficulty] = useState("medium");
  const [topic, setTopic] = useState("");
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [userAnswers, setUserAnswers] = useState({});
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listClasses();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id);
        }
      } catch (e) {
        setErr(e.message || "Failed to load classes");
      }
    }
    load();
  }, []);

  async function handleGenerate() {
    if (!selectedClass) {
      setErr("Please select a class");
      return;
    }
    
    setLoading(true);
    setErr("");
    setQuiz(null);
    setUserAnswers({});
    setShowAnswers(false);
    
    try {
      const result = await api.generateQuiz(
        selectedClass,
        numQuestions,
        difficulty,
        topic || null
      );
      setQuiz(result);
    } catch (e) {
      setErr(e.message || "Failed to generate quiz");
    } finally {
      setLoading(false);
    }
  }

  function handleAnswerChange(index, value) {
    setUserAnswers({ ...userAnswers, [index]: value });
  }

  return (
    <div className="px-8 py-10 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Quiz Generator</h1>
      <p className="text-slate-500 mb-8">
        Generate AI-powered practice quizzes from your class materials
      </p>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      {/* Configuration Panel */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 mb-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Quiz Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Select Class
            </label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Number of Questions
            </label>
            <input
              type="number"
              min="1"
              max="20"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Difficulty
            </label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
              Topic (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g., Photosynthesis"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading || !selectedClass}
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating Quiz..." : "Generate Quiz"}
        </button>
      </div>

      {/* Quiz Display */}
      {quiz && quiz.questions && quiz.questions.length > 0 && (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-slate-900">
              {quiz.topic || "Practice Quiz"} ({quiz.questions.length} questions)
            </h2>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
            >
              {showAnswers ? "Hide Answers" : "Show Answers"}
            </button>
          </div>

          {quiz.questions.map((q, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm flex-shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-slate-900 mb-3">{q.question}</p>
                  
                  {q.options && q.options.length > 0 && (
                    <div className="space-y-2 mb-4">
                      {q.options.map((opt, optIdx) => (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer ${
                            userAnswers[idx] === opt
                              ? "bg-indigo-50 border-indigo-200"
                              : "bg-slate-50 border-slate-100 hover:border-slate-200"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`q-${idx}`}
                            value={opt}
                            checked={userAnswers[idx] === opt}
                            onChange={(e) => handleAnswerChange(idx, e.target.value)}
                            className="text-indigo-600"
                          />
                          <span className="text-sm text-slate-700">{opt}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {showAnswers && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                      <p className="text-sm font-semibold text-green-900 mb-2">
                        ✓ Answer: {q.answer}
                      </p>
                      <p className="text-sm text-green-800">{q.explanation}</p>
                      {q.source_chunk_ids && q.source_chunk_ids.length > 0 && (
                        <p className="text-xs text-green-600 mt-2">
                          Source: {q.source_chunk_ids.join(", ")}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {quiz && (!quiz.questions || quiz.questions.length === 0) && (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No questions generated</h3>
          <p className="text-sm text-slate-500">
            Try uploading more materials or adjusting your settings
          </p>
        </div>
      )}
    </div>
  );
}
