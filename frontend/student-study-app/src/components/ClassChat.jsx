import React, { useEffect, useRef } from 'react';

export default function ClassChat({ chatHistory, selectedClassId, classes, chatBusy }) {
    const scrollRef = useRef(null);
    const selectedClass = classes.find(c => c.id === selectedClassId);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [chatHistory]);

    if (!selectedClassId) {
        return (
            <div className="p-8 h-full flex items-center justify-center">
                <div className="bg-white border border-slate-200 rounded-3xl p-12 text-center max-w-md shadow-sm">
                    <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6">
                        <span className="text-3xl text-indigo-600">💬</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Class Selected</h3>
                    <p className="text-slate-500">Select a class from the menu at the bottom to start a conversation with your AI assistant.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-slate-50/50">
            {/* Header */}
            <div className="p-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20">
                        {selectedClass?.name.charAt(0)}
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">{selectedClass?.name} Assistant</h2>
                        <p className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Online & Ready to Help
                        </p>
                    </div>
                </div>
            </div>

            {/* Messages */}
            <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto p-8 space-y-6 scroll-smooth"
            >
                {chatHistory.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                        <div className="w-16 h-16 bg-slate-200 rounded-full flex items-center justify-center text-2xl">✍️</div>
                        <p className="text-slate-500 max-w-xs uppercase tracking-widest text-[10px] font-bold">Start typing below to see your history here</p>
                    </div>
                ) : (
                    chatHistory.map((m, i) => (
                        <div
                            key={i}
                            className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}
                        >
                            <div className={`max-w-[80%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'
                                    }`}>
                                    {m.role === 'user' ? 'ME' : 'AI'}
                                </div>
                                <div className={`p-4 rounded-2xl shadow-sm ${m.role === 'user'
                                        ? 'bg-slate-900 text-white rounded-tr-none'
                                        : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                                    }`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.message}</p>
                                </div>
                            </div>
                        </div>
                    ))
                )}

                {chatBusy && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 p-4 rounded-2xl rounded-tl-none shadow-sm flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.3s]" />
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:-0.15s]" />
                            <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce" />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
