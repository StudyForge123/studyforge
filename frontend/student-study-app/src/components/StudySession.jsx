import { useState } from "react";
import { api } from "../api/client";

export default function StudySession({ classes }) {
    const [selectedClass, setSelectedClass] = useState("");
    const [topic, setTopic] = useState("");
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [currentSlide, setCurrentSlide] = useState(0);
    const [showKnowledgeChecks, setShowKnowledgeChecks] = useState(false);

    async function handleGenerate() {
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
        
        try {
            const result = await api.generateStudySession({
                class_id: selectedClass,
                topic: topic.trim(),
            });
            setSession(result);
            setCurrentSlide(0);
            setShowKnowledgeChecks(false);
        } catch (e) {
            setErr(e.message || "Failed to generate study session");
        } finally {
            setLoading(false);
        }
    }

    function nextSlide() {
        if (session && currentSlide < session.slides.length - 1) {
            setCurrentSlide(currentSlide + 1);
        }
    }

    function prevSlide() {
        if (currentSlide > 0) {
            setCurrentSlide(currentSlide - 1);
        }
    }

    return (
        <div className="px-8 py-10 max-w-6xl mx-auto">
            <div className="mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
                    Study Session
                </h1>
                <p className="text-slate-500">
                    Generate interactive study materials with slides and knowledge checks.
                </p>
            </div>

            {err && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> {err}
                </div>
            )}

            {/* Generator Form */}
            {!session && (
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-8 mb-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Select Class
                            </label>
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                            >
                                <option value="">Choose a class...</option>
                                {classes.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                                Topic
                            </label>
                            <input
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                                placeholder="e.g., Linked Lists, Photosynthesis"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6 py-4 text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none"
                    >
                        {loading ? "Generating Session..." : "Start Study Session"}
                    </button>
                </div>
            )}

            {/* Study Session Display */}
            {session && session.slides && session.slides.length > 0 && !showKnowledgeChecks && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900">
                            {session.topic}
                        </h2>
                        <div className="flex items-center gap-3">
                            <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                                Slide {currentSlide + 1} of {session.slides.length}
                            </div>
                            <button
                                onClick={() => setSession(null)}
                                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                            >
                                New Session
                            </button>
                        </div>
                    </div>

                    {/* Slide Display */}
                    <div className="bg-gradient-to-br from-indigo-50 to-violet-50 rounded-3xl shadow-xl border border-indigo-100 p-12 min-h-[500px] flex flex-col">
                        <h3 className="text-3xl font-bold text-slate-900 mb-8">
                            {session.slides[currentSlide].title}
                        </h3>

                        <div className="flex-1 space-y-4">
                            {session.slides[currentSlide].bullets.map((bullet, idx) => (
                                <div key={idx} className="flex items-start gap-4">
                                    <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 flex-shrink-0" />
                                    <p className="text-lg text-slate-700 leading-relaxed">
                                        {bullet}
                                    </p>
                                </div>
                            ))}
                        </div>

                        {session.slides[currentSlide].speaker_notes && (
                            <div className="mt-8 pt-6 border-t border-indigo-200">
                                <p className="text-sm text-slate-600 italic">
                                    📝 {session.slides[currentSlide].speaker_notes}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={prevSlide}
                            disabled={currentSlide === 0}
                            className="px-6 py-3 text-sm font-semibold text-slate-700 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                            ← Previous
                        </button>

                        {currentSlide === session.slides.length - 1 && session.knowledge_checks && session.knowledge_checks.length > 0 ? (
                            <button
                                onClick={() => setShowKnowledgeChecks(true)}
                                className="px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl hover:from-emerald-700 hover:to-teal-700 shadow-lg shadow-emerald-500/25 transition-all"
                            >
                                Knowledge Check →
                            </button>
                        ) : (
                            <button
                                onClick={nextSlide}
                                disabled={currentSlide === session.slides.length - 1}
                                className="px-6 py-3 text-sm font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-indigo-500/25 transition-all"
                            >
                                Next →
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Knowledge Checks */}
            {session && showKnowledgeChecks && session.knowledge_checks && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Knowledge Check
                        </h2>
                        <button
                            onClick={() => setShowKnowledgeChecks(false)}
                            className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                        >
                            ← Back to Slides
                        </button>
                    </div>

                    {session.knowledge_checks.map((kc, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-600 font-bold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-semibold text-slate-900 mb-4">
                                        {kc.question}
                                    </p>
                                    <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4">
                                        <div className="text-sm font-semibold text-emerald-900 mb-2">
                                            ✓ Answer: {kc.answer}
                                        </div>
                                        <div className="text-sm text-emerald-800">
                                            {kc.explanation}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}

                    <button
                        onClick={() => setSession(null)}
                        className="w-full px-6 py-4 text-sm font-semibold text-white bg-slate-900 rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all"
                    >
                        Start New Session
                    </button>
                </div>
            )}
        </div>
    );
}
