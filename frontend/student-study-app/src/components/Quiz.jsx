import { useState } from "react";
import { api } from "../api/client";

export default function Quiz({ classes }) {
    const [selectedClass, setSelectedClass] = useState("");
    const [topic, setTopic] = useState("");
    const [numQuestions, setNumQuestions] = useState(5);
    const [difficulty, setDifficulty] = useState("medium");
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(false);
    const [err, setErr] = useState("");
    const [showAnswers, setShowAnswers] = useState({});

    async function handleGenerate() {
        if (!selectedClass) {
            setErr("Please select a class");
            return;
        }

        setLoading(true);
        setErr("");
        setQuiz(null);
        
        try {
            const result = await api.generateQuiz({
                class_id: selectedClass,
                num_questions: numQuestions,
                difficulty,
                topic: topic || undefined,
            });
            setQuiz(result);
            setShowAnswers({});
        } catch (e) {
            setErr(e.message || "Failed to generate quiz");
        } finally {
            setLoading(false);
        }
    }

    function toggleAnswer(index) {
        setShowAnswers(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    }

    return (
        <div className="px-8 py-10 max-w-5xl mx-auto">
            <div className="mb-10">
                <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2">
                    Quiz Generator
                </h1>
                <p className="text-slate-500">
                    Generate practice quizzes from your class materials using AI.
                </p>
            </div>

            {err && (
                <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-3">
                    <span className="w-2 h-2 rounded-full bg-red-500" /> {err}
                </div>
            )}

            {/* Generator Form */}
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
                            Topic (Optional)
                        </label>
                        <input
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
                            placeholder="e.g., Chapter 5, Data Structures"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Number of Questions
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="10"
                            value={numQuestions}
                            onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                            Difficulty
                        </label>
                        <select
                            value={difficulty}
                            onChange={(e) => setDifficulty(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
                        >
                            <option value="easy">Easy</option>
                            <option value="medium">Medium</option>
                            <option value="hard">Hard</option>
                        </select>
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={loading}
                    className="mt-6 w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6 py-4 text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none"
                >
                    {loading ? "Generating Quiz..." : "Generate Quiz"}
                </button>
            </div>

            {/* Quiz Results */}
            {quiz && quiz.questions && quiz.questions.length > 0 && (
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-2xl font-bold text-slate-900">
                            Quiz Results
                        </h2>
                        <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-lg">
                            {quiz.questions.length} questions • {difficulty}
                        </div>
                    </div>

                    {quiz.questions.map((q, idx) => (
                        <div key={idx} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 hover:shadow-lg transition-shadow">
                            <div className="flex items-start gap-4">
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-600 font-bold flex items-center justify-center flex-shrink-0">
                                    {idx + 1}
                                </div>
                                <div className="flex-1">
                                    <p className="text-lg font-semibold text-slate-900 mb-4">
                                        {q.question}
                                    </p>

                                    {q.options && q.options.length > 0 && (
                                        <div className="space-y-2 mb-4">
                                            {q.options.map((opt, optIdx) => (
                                                <div
                                                    key={optIdx}
                                                    className="bg-slate-50 rounded-lg p-3 text-sm text-slate-700 border border-slate-100"
                                                >
                                                    <span className="font-semibold text-slate-900 mr-2">
                                                        {String.fromCharCode(65 + optIdx)}.
                                                    </span>
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <button
                                        onClick={() => toggleAnswer(idx)}
                                        className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                                    >
                                        {showAnswers[idx] ? "Hide Answer" : "Show Answer"}
                                    </button>

                                    {showAnswers[idx] && (
                                        <div className="mt-4 p-4 bg-green-50 border border-green-100 rounded-xl">
                                            <div className="text-sm font-semibold text-green-900 mb-2">
                                                ✓ Answer: {q.answer}
                                            </div>
                                            <div className="text-sm text-green-800">
                                                {q.explanation}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {quiz && (!quiz.questions || quiz.questions.length === 0) && (
                <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
                    <p className="text-slate-500">No questions generated. Try adjusting your parameters.</p>
                </div>
            )}
        </div>
    );
}
