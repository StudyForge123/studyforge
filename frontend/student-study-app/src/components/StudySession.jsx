import { useState, useEffect } from "react";
import { api } from "../api/client";

export default function StudySession() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [topic, setTopic] = useState("");
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [showChecks, setShowChecks] = useState(false);

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

  async function handleStart() {
    if (!selectedClass) {
      setErr("Please select a class");
      return;
    }
    if (!topic.trim()) {
      setErr("Please enter a topic");
      return;
    }
    
    setLoading(true);
    setErr("");
    setSession(null);
    setCurrentSlide(0);
    setShowChecks(false);
    
    try {
      const result = await api.createStudySession(selectedClass, topic);
      setSession(result);
    } catch (e) {
      setErr(e.message || "Failed to create study session");
    } finally {
      setLoading(false);
    }
  }

  const slide = session?.slides?.[currentSlide];

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2">Study Session</h1>
      <p className="text-slate-500 mb-8">
        AI-powered slide-style learning from your class materials
      </p>

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      {/* Session Setup */}
      {!session && (
        <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-100">
          <h2 className="text-lg font-bold text-slate-900 mb-6">Start a New Session</h2>
          
          <div className="space-y-4 mb-6">
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
                Topic or Question
              </label>
              <input
                type="text"
                placeholder="e.g., Explain cellular respiration"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={loading || !selectedClass || !topic.trim()}
            className="w-full bg-indigo-600 text-white py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating Session..." : "Start Study Session"}
          </button>
        </div>
      )}

      {/* Session Display */}
      {session && session.slides && session.slides.length > 0 && (
        <div className="space-y-6">
          {/* Slide Navigation */}
          <div className="flex items-center justify-between">
            <div className="text-sm font-medium text-slate-600">
              Slide {currentSlide + 1} of {session.slides.length}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentSlide(Math.max(0, currentSlide - 1))}
                disabled={currentSlide === 0}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={() => setCurrentSlide(Math.min(session.slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === session.slides.length - 1}
                className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>

          {/* Current Slide */}
          {slide && (
            <div className="bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl p-12 shadow-xl text-white min-h-[400px] flex flex-col justify-between">
              <div>
                <h2 className="text-3xl font-bold mb-8">{slide.title}</h2>
                <ul className="space-y-4">
                  {slide.bullets && slide.bullets.map((bullet, idx) => (
                    <li key={idx} className="flex items-start gap-3 text-lg">
                      <span className="text-indigo-200 mt-1">•</span>
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              {slide.speaker_notes && (
                <div className="mt-8 pt-6 border-t border-white/20">
                  <p className="text-sm text-indigo-100 italic">
                    📝 {slide.speaker_notes}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Knowledge Checks */}
          {session.knowledge_checks && session.knowledge_checks.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900">
                  Knowledge Checks ({session.knowledge_checks.length})
                </h3>
                <button
                  onClick={() => setShowChecks(!showChecks)}
                  className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-all"
                >
                  {showChecks ? "Hide" : "Show"}
                </button>
              </div>

              {showChecks && (
                <div className="space-y-4">
                  {session.knowledge_checks.map((check, idx) => (
                    <div key={idx} className="border border-slate-100 rounded-xl p-4">
                      <p className="font-semibold text-slate-900 mb-2">
                        {idx + 1}. {check.question}
                      </p>
                      <div className="mt-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                        <p className="text-sm font-semibold text-green-900 mb-1">
                          Answer: {check.answer}
                        </p>
                        <p className="text-sm text-green-800">{check.explanation}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New Session Button */}
          <button
            onClick={() => setSession(null)}
            className="w-full bg-slate-100 text-slate-700 py-3 rounded-xl font-semibold hover:bg-slate-200 transition-all"
          >
            Start New Session
          </button>
        </div>
      )}

      {session && (!session.slides || session.slides.length === 0) && (
        <div className="bg-white rounded-2xl p-12 text-center border border-dashed border-slate-200">
          <div className="text-4xl mb-4">📭</div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No slides generated</h3>
          <p className="text-sm text-slate-500">
            Try uploading more materials or trying a different topic
          </p>
          <button
            onClick={() => setSession(null)}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-xl font-semibold hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      )}
    </div>
  );
}
