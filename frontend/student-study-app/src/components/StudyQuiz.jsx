import React, { useState, useEffect } from 'react';

export default function StudyQuiz({ quiz, studySession, selectedClassId, classes }) {
    const [activeTab, setActiveTab] = useState('quiz');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [revealedAnswers, setRevealedAnswers] = useState({});
    const [quizSubmitted, setQuizSubmitted] = useState(false);

    const selectedClass = classes.find(c => c.id === selectedClassId);

    // Sync activeTab when new data arrives
    useEffect(() => {
        if (studySession && studySession.slides && studySession.slides.length > 0) {
            setActiveTab('study');
            setCurrentSlide(0);
        }
    }, [studySession]);

    useEffect(() => {
        if (quiz && quiz.questions && quiz.questions.length > 0) {
            setActiveTab('quiz');
        }
    }, [quiz]);

    useEffect(() => {
        setSelectedAnswers({});
        setRevealedAnswers({});
        setQuizSubmitted(false);
    }, [quiz, selectedClassId]);

    function normalizeChoice(text = '') {
        return text
            .trim()
            .replace(/^[A-Da-d][\).\:\-]\s*/, '')
            .toLowerCase();
    }

    function isCorrect(q, selectedOption) {
        const selectedNorm = normalizeChoice(selectedOption);
        const answerNorm = normalizeChoice(q.answer || '');
        return selectedNorm !== '' && selectedNorm === answerNorm;
    }

    const quizQuestions = quiz?.questions || [];
    const scorableIndexes = quizQuestions
        .map((q, idx) => (q.options && q.options.length > 0 ? idx : null))
        .filter((idx) => idx !== null);
    const totalScorable = scorableIndexes.length;
    const answeredCount = scorableIndexes.filter((idx) => Boolean(selectedAnswers[idx])).length;
    const correctCount = scorableIndexes.filter((idx) => isCorrect(quizQuestions[idx], selectedAnswers[idx])).length;
    const scorePercent = totalScorable > 0 ? Math.round((correctCount / totalScorable) * 100) : 0;

    function handleFinishQuiz() {
        const allRevealed = scorableIndexes.reduce((acc, idx) => {
            acc[idx] = true;
            return acc;
        }, {});
        setRevealedAnswers((prev) => ({ ...prev, ...allRevealed }));
        setQuizSubmitted(true);
    }

    function handleRetakeQuiz() {
        setSelectedAnswers({});
        setRevealedAnswers({});
        setQuizSubmitted(false);
    }

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">Study & Quiz</h1>
                    <p className="text-slate-500 mt-1">
                        {selectedClass ? `Materials for ${selectedClass.name}` : 'Select a class to start studying'}
                    </p>
                </div>

                <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                        onClick={() => setActiveTab('study')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'study' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Study Session
                    </button>
                    <button
                        onClick={() => setActiveTab('quiz')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'quiz' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Practice Quiz
                    </button>
                </div>
            </div>

            {!selectedClassId && (
                <div className="bg-amber-50 border border-amber-100 rounded-2xl p-12 text-center">
                    <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <span className="text-2xl text-amber-600">⚠️</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Class Selected</h3>
                    <p className="text-slate-600">Select a class from the dropdown in the chat bar below to generate a study session or quiz.</p>
                </div>
            )}

            {/* STUDY TAB */}
            {selectedClassId && activeTab === 'study' && (
                <div className="space-y-6">
                    {!studySession || !studySession.slides || studySession.slides.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📖</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Start a Study Session</h3>
                            <p className="text-slate-500 mb-2">Type a topic in the chat bar below and select <strong>"Study Session"</strong> mode, then click Send.</p>
                            <p className="text-xs text-slate-400">Make sure you have uploaded PDFs for this class first.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="lg:col-span-2 space-y-6">
                                {/* Slideshow */}
                                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm aspect-video flex flex-col">
                                    <div className="bg-slate-900 p-8 flex-1 flex flex-col justify-center items-center text-center">
                                        <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
                                            {studySession.slides[currentSlide]?.title}
                                        </h2>
                                        <ul className="text-xl text-slate-300 space-y-4 max-w-2xl text-left list-disc list-inside">
                                            {(studySession.slides[currentSlide]?.bullets || []).map((b, i) => (
                                                <li key={i}>{b}</li>
                                            ))}
                                        </ul>
                                    </div>
                                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-white">
                                        <span className="text-sm font-medium text-slate-500">
                                            Slide {currentSlide + 1} of {studySession.slides.length}
                                        </span>
                                        <div className="flex gap-2">
                                            <button
                                                disabled={currentSlide === 0}
                                                onClick={() => setCurrentSlide(c => c - 1)}
                                                className="px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-30 rounded-lg border border-slate-200"
                                            >
                                                Previous
                                            </button>
                                            <button
                                                disabled={currentSlide === studySession.slides.length - 1}
                                                onClick={() => setCurrentSlide(c => c + 1)}
                                                className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-30 rounded-lg shadow-md"
                                            >
                                                Next
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Speaker Notes */}
                                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
                                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Speaker Notes</h4>
                                    <p className="text-slate-700 leading-relaxed font-serif text-lg italic">
                                        "{studySession.slides[currentSlide]?.speaker_notes}"
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-lg font-bold text-slate-900 border-b border-slate-100 pb-2">Knowledge Checks</h3>
                                {(studySession.knowledge_checks || []).length === 0 ? (
                                    <p className="text-sm text-slate-400 italic">No knowledge checks generated.</p>
                                ) : (
                                    studySession.knowledge_checks.map((check, i) => (
                                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                                            <p className="text-sm font-bold text-slate-900 mb-3">{check.question}</p>
                                            <details className="group">
                                                <summary className="text-xs font-bold text-indigo-600 cursor-pointer hover:text-indigo-700 list-none flex items-center justify-between">
                                                    <span>Reveal Answer</span>
                                                    <span className="transform group-open:rotate-180 transition-transform">▼</span>
                                                </summary>
                                                <div className="mt-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3 border border-slate-100">
                                                    <p className="font-bold text-slate-900 mb-1">Answer:</p>
                                                    <p className="mb-2">{check.answer}</p>
                                                    <p className="text-xs text-slate-400 leading-relaxed italic border-t border-slate-200 pt-2">
                                                        <span className="font-bold">Source Context:</span> {check.explanation}
                                                    </p>
                                                </div>
                                            </details>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* QUIZ TAB */}
            {selectedClassId && activeTab === 'quiz' && (
                <div className="space-y-6">
                    {!quiz || !quiz.questions || quiz.questions.length === 0 ? (
                        <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                            <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl">📝</span>
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Generate a Quiz</h3>
                            <p className="text-slate-500 mb-2">Type a topic in the chat bar below and select <strong>"Practice Quiz"</strong> mode, then click Send.</p>
                            <p className="text-xs text-slate-400">Make sure you have uploaded PDFs for this class first.</p>
                            {quiz && quiz.questions && quiz.questions.length === 0 && (
                                <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-sm text-amber-800">
                                    No questions could be generated. Make sure PDFs are uploaded and indexed for this class.
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-slate-500 font-medium">{quiz.questions.length} question{quiz.questions.length !== 1 ? 's' : ''} generated</p>
                                {totalScorable > 0 && !quizSubmitted && (
                                    <button
                                        type="button"
                                        onClick={handleFinishQuiz}
                                        disabled={answeredCount < totalScorable}
                                        className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Finish Quiz ({answeredCount}/{totalScorable})
                                    </button>
                                )}
                            </div>

                            {quizSubmitted && totalScorable > 0 && (
                                <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-lg ring-1 ring-slate-800">
                                    <p className="text-xs uppercase tracking-widest text-slate-400 font-bold mb-2">Final Result</p>
                                    <p className="text-3xl font-bold mb-2">{scorePercent}%</p>
                                    <p className="text-slate-300 text-sm mb-4">
                                        You got {correctCount} out of {totalScorable} questions correct.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={handleRetakeQuiz}
                                        className="px-4 py-2 bg-white text-slate-900 rounded-lg text-sm font-bold hover:bg-slate-100"
                                    >
                                        Retake Quiz
                                    </button>
                                </div>
                            )}

                            {quiz.questions.map((q, i) => (
                                <div key={i} className="bg-white border border-slate-200 rounded-2xl p-8 shadow-sm">
                                    <div className="flex gap-4 mb-6">
                                        <span className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                            {i + 1}
                                        </span>
                                        <h3 className="text-xl font-bold text-slate-900 mt-0.5">{q.question}</h3>
                                    </div>

                                    {q.options && q.options.length > 0 && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 ml-12">
                                            {q.options.map((opt, idx) => (
                                                <button
                                                    type="button"
                                                    key={idx}
                                                    onClick={() =>
                                                        setSelectedAnswers((prev) => ({
                                                            ...prev,
                                                            [i]: opt,
                                                        }))
                                                    }
                                                    disabled={quizSubmitted}
                                                    className={`w-full text-left p-4 border rounded-xl text-sm transition-colors ${
                                                        selectedAnswers[i] === opt
                                                            ? 'border-indigo-500 bg-indigo-50 text-indigo-900'
                                                            : 'border-slate-100 bg-slate-50 text-slate-600 hover:border-indigo-200'
                                                    } ${quizSubmitted ? 'cursor-not-allowed opacity-80' : ''}`}
                                                >
                                                    {opt}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="ml-12 border-t border-slate-100 pt-6">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setRevealedAnswers((prev) => ({
                                                    ...prev,
                                                    [i]: true,
                                                }))
                                            }
                                            disabled={quizSubmitted || (Boolean(q.options?.length) && !selectedAnswers[i])}
                                            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 text-indigo-700 rounded-lg text-sm font-bold hover:bg-indigo-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            <span>Check Answer</span>
                                        </button>

                                        {revealedAnswers[i] && (
                                            <div className="mt-4 p-6 bg-slate-900 rounded-xl text-white shadow-xl ring-1 ring-slate-800">
                                                {selectedAnswers[i] && (
                                                    <p className={`font-bold mb-4 text-sm ${isCorrect(q, selectedAnswers[i]) ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                        {isCorrect(q, selectedAnswers[i]) ? 'Correct selection.' : 'Incorrect selection.'}
                                                    </p>
                                                )}
                                                <p className="text-indigo-400 font-bold mb-2 uppercase tracking-widest text-xs">Correct Answer</p>
                                                <p className="text-lg font-medium mb-4">{q.answer}</p>
                                                <p className="text-sm text-slate-400 leading-relaxed border-t border-slate-800 pt-4 italic">
                                                    {q.explanation}
                                                </p>
                                                {q.source_chunk_ids && q.source_chunk_ids.length > 0 && (
                                                    <p className="text-xs text-slate-500 mt-3 pt-2 border-t border-slate-800">
                                                        Sources: {q.source_chunk_ids.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
