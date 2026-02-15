import React, { useEffect, useLayoutEffect, useRef } from 'react';

const NEAR_BOTTOM_THRESHOLD = 120;

export default function ClassChat({ chatHistory, selectedClassId, classes, chatBusy, bottomInset = 24 }) {
    const scrollRef = useRef(null);
    const isNearBottomRef = useRef(true);
    const animationFrameRef = useRef(null);
    const selectedClass = classes.find(c => c.id === selectedClassId);

    function distanceFromBottom(el) {
        return el.scrollHeight - el.scrollTop - el.clientHeight;
    }

    function scheduleScrollToBottom(behavior = 'auto') {
        if (!scrollRef.current) return;
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(() => {
            const el = scrollRef.current;
            if (!el) return;
            el.scrollTo({ top: el.scrollHeight, behavior });
        });
    }

    // Track whether user is reading older messages or staying near latest.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return undefined;

        const onScroll = () => {
            isNearBottomRef.current = distanceFromBottom(el) <= NEAR_BOTTOM_THRESHOLD;
        };

        onScroll();
        el.addEventListener('scroll', onScroll, { passive: true });
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    // Keep view pinned only when the user was already near the bottom.
    useLayoutEffect(() => {
        if (!scrollRef.current) return;
        if (isNearBottomRef.current) {
            scheduleScrollToBottom('auto');
        }
    }, [chatHistory.length, chatBusy]);

    // Class switch should always jump to latest message.
    useEffect(() => {
        isNearBottomRef.current = true;
        scheduleScrollToBottom('auto');
    }, [selectedClassId]);

    // Dynamic message heights (streaming, long text, async rendering) shouldn't hide latest content.
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return undefined;

        const observer = new MutationObserver(() => {
            if (isNearBottomRef.current) {
                scheduleScrollToBottom('auto');
            }
        });

        observer.observe(el, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    // Mobile keyboard + orientation/viewport changes.
    useEffect(() => {
        const onViewportShift = () => {
            if (isNearBottomRef.current) {
                scheduleScrollToBottom('auto');
            }
        };

        window.addEventListener('resize', onViewportShift);
        window.addEventListener('orientationchange', onViewportShift);
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', onViewportShift);
            window.visualViewport.addEventListener('scroll', onViewportShift);
        }

        return () => {
            window.removeEventListener('resize', onViewportShift);
            window.removeEventListener('orientationchange', onViewportShift);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener('resize', onViewportShift);
                window.visualViewport.removeEventListener('scroll', onViewportShift);
            }
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, []);

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
        <div className="h-full min-h-0 flex flex-col bg-slate-50/50 overflow-hidden">
            <div className="px-4 sm:px-6 py-4 sm:py-6 bg-white border-b border-slate-200 flex items-center justify-between sticky top-0 z-10">
                <div className="flex items-center gap-4 min-w-0">
                    <div className="w-11 h-11 sm:w-12 sm:h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-600/20 flex-shrink-0">
                        {selectedClass?.name?.charAt(0) || 'C'}
                    </div>
                    <div className="min-w-0">
                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 truncate">{selectedClass?.name} Assistant</h2>
                        <p className="text-xs font-medium text-emerald-500 flex items-center gap-1.5 mt-0.5">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                            Online & Ready to Help
                        </p>
                    </div>
                </div>
            </div>

            <div
                ref={scrollRef}
                className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain px-4 sm:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6"
                style={{ paddingBottom: `${Math.max(bottomInset, 24)}px` }}
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
                            <div className={`max-w-[88%] sm:max-w-[80%] min-w-0 flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center font-bold text-xs uppercase ${m.role === 'user' ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white'}`}>
                                    {m.role === 'user' ? 'ME' : 'AI'}
                                </div>
                                <div className={`p-3.5 sm:p-4 rounded-2xl shadow-sm min-w-0 ${m.role === 'user' ? 'bg-slate-900 text-white rounded-tr-none' : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'}`}>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap break-words [overflow-wrap:anywhere]">{m.message}</p>
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
