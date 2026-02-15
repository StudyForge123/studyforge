import { useEffect, useState, useRef } from "react";
import { api } from "./api/client";

// Components
import Dashboard from "./components/Dashboard";
import Calendar from "./components/Calendar";
import AllClasses from "./components/AllClasses";
import Settings from "./components/Settings";
import StudyQuiz from "./components/StudyQuiz";
import ClassChat from "./components/ClassChat";

const navItems = ["Dashboard", "Calendar", "All Classes", "Study & Quiz", "Class Chat", "Settings"];

export default function App() {
  const [activeNav, setActiveNav] = useState("Dashboard");
  const [isSidebarVisible, setIsSidebarVisible] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isComposerCollapsed, setIsComposerCollapsed] = useState(false);

  // Selection state
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedFileId, setSelectedFileId] = useState("");
  const [classFiles, setClassFiles] = useState([]);

  // Dashboard Data State
  const [dashboard, setDashboard] = useState(null);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [generatingCalendar, setGeneratingCalendar] = useState(false);
  const [toast, setToast] = useState(null);

  // Agent Results
  const [quiz, setQuiz] = useState(null);
  const [studySession, setStudySession] = useState(null);

  // Bottom chat State
  const [chatHistory, setChatHistory] = useState([]);
  const [mode, setMode] = useState("Chat");
  const [message, setMessage] = useState("");
  const [chatBusy, setChatBusy] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const [mobileComposerHeight, setMobileComposerHeight] = useState(84);
  const recognitionRef = useRef(null);
  const promptRef = useRef(null);
  const composerRef = useRef(null);

  // Modal: Add Class State
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", professor: "", semester: "" });

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const [d, cs] = await Promise.all([api.getDashboard(), api.listClasses()]);
      setDashboard(d);
      const nextClasses = cs.classes || [];
      setClasses(nextClasses);
      if (selectedClassId && !nextClasses.some((c) => c.id === selectedClassId)) {
        setSelectedClassId("");
      }
    } catch (e) {
      setErr(e.message || "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Expose api to the browser window for testing
    window.api = api;
    refresh();
  }, []);

  useEffect(() => {
    if (!selectedClassId) {
      setClassFiles([]);
      setSelectedFileId("");
      return;
    }
    (async () => {
      try {
        const data = await api.listFiles(selectedClassId);
        const files = data.files || [];
        setClassFiles(files);
        if (selectedFileId && !files.some((f) => f.id === selectedFileId)) {
          setSelectedFileId("");
        }
      } catch {
        setClassFiles([]);
      }
    })();
  }, [selectedClassId]);

  const isClassChatTab = activeNav === "Class Chat";
  const filteredClassFiles = classFiles.filter((f) => !f.class_id || f.class_id === selectedClassId);
  const composerVisibleTabs = new Set(["Class Chat", "Study & Quiz"]);
  const shouldShowComposer = composerVisibleTabs.has(activeNav);

  useEffect(() => {
    if (isClassChatTab && mode !== "Chat") {
      setMode("Chat");
    }
  }, [isClassChatTab, mode]);

  useEffect(() => {
    if (isClassChatTab && !isComposerCollapsed && promptRef.current) {
      setTimeout(() => promptRef.current?.focus(), 0);
    }
  }, [isClassChatTab, isComposerCollapsed]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const onViewportChange = (event) => setIsMobileViewport(event.matches);
    setIsMobileViewport(mediaQuery.matches);
    mediaQuery.addEventListener("change", onViewportChange);
    return () => mediaQuery.removeEventListener("change", onViewportChange);
  }, []);

  useEffect(() => {
    if (!isMobileViewport || !shouldShowComposer || !composerRef.current) return undefined;

    const updateComposerHeight = () => {
      if (!composerRef.current) return;
      const nextHeight = Math.ceil(composerRef.current.getBoundingClientRect().height);
      setMobileComposerHeight(nextHeight || 84);
    };

    updateComposerHeight();
    const observer = new ResizeObserver(updateComposerHeight);
    observer.observe(composerRef.current);
    return () => observer.disconnect();
  }, [isMobileViewport, shouldShowComposer, isComposerCollapsed, message, selectedClassId, selectedFileId, mode, chatBusy, isListening, voiceEnabled]);

  function handlePromptInput(e) {
    setMessage(e.target.value);

    if (!isMobileViewport) return;

    // Keep the mobile input compact while still allowing short multiline typing.
    e.target.style.height = "auto";
    const nextHeight = Math.min(e.target.scrollHeight, 128);
    e.target.style.height = `${nextHeight}px`;
    e.target.style.overflowY = e.target.scrollHeight > 128 ? "auto" : "hidden";
  }

  async function handleCreateClass() {
    setErr("");
    try {
      await api.createClass(form.name);
      setShowAdd(false);
      setForm({ name: "", professor: "", semester: "" });
      await refresh();
    } catch (e) {
      setErr(e.message || "Create failed");
    }
  }

  async function handleGenerateCalendar() {
    setErr("");
    setGeneratingCalendar(true);
    try {
      const classIds = classes.map(c => c.id);
      await api.generateCalendar(classIds);
      await refresh();
      setActiveNav("Calendar");
      setToast({ type: "success", message: "Calendar generated successfully." });
    } catch (e) {
      setErr(e.message || "Generate failed");
      setToast({ type: "error", message: e.message || "Calendar generation failed." });
    } finally {
      setGeneratingCalendar(false);
      setTimeout(() => setToast(null), 3200);
    }
  }

  async function handleSend() {
    const text = message.trim();
    if (!text || !selectedClassId) {
      if (!selectedClassId) setErr("Please select a class first.");
      return;
    }
    setChatBusy(true);
    setErr("");
    try {
      if (mode === "Chat") {
        const chatRes = await api.sendChatMessage({
          class_id: selectedClassId,
          message: text,
          file_id: selectedFileId || null,
        });
        const history = await api.getChatHistory(selectedClassId);
        setChatHistory(history.history || []);
        if (voiceEnabled && chatRes?.reply && "speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(chatRes.reply);
          window.speechSynthesis.cancel();
          window.speechSynthesis.speak(utterance);
        }
        setMessage("");
        setActiveNav("Class Chat");
      } else if (mode === "Practice Quiz") {
        const res = await api.generateQuiz({
          class_id: selectedClassId,
          topic: text,
          file_id: selectedFileId || null,
        });
        console.log("Quiz response:", res);
        setQuiz(res);
        setMessage("");
        setActiveNav("Study & Quiz");
      } else if (mode === "Study Session") {
        const res = await api.startStudySession({
          class_id: selectedClassId,
          topic: text,
          file_id: selectedFileId || null,
        });
        console.log("Study response:", res);
        setStudySession(res);
        setMessage("");
        setActiveNav("Study & Quiz");
      }
    } catch (e) {
      console.error("Send error:", e);
      setErr(e.message || "Operation failed");
    } finally {
      setChatBusy(false);
    }
  }

  // File Upload State
  const fileInputRef = useRef(null);
  const [uploadClassId, setUploadClassId] = useState(null);
  const [uploadFileType, setUploadFileType] = useState(null);

  function handleUploadClick(classId, forcedType = null) {
    setUploadClassId(classId);
    setUploadFileType(forcedType);
    fileInputRef.current?.click();
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !uploadClassId) return;

    setErr("");
    try {
      const rawType = uploadFileType || prompt("Upload type? Enter: syllabus OR material", "material") || "material";
      const normalized = rawType.trim().toLowerCase();
      const type = normalized === "syllabus" ? "syllabus" : "material";
      await api.uploadFile(uploadClassId, file, type);
      alert(`${type} uploaded and indexed successfully!`);
      await refresh();
      if (selectedClassId) {
        const filesData = await api.listFiles(selectedClassId);
        setClassFiles(filesData.files || []);
      }
    } catch (e) {
      setErr(e.message || "Upload failed");
    } finally {
      setUploadClassId(null);
      setUploadFileType(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  function toggleVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setErr("Voice input is not supported in this browser.");
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop?.();
      setIsListening(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || "";
      if (transcript) {
        setMessage((prev) => `${prev}${prev ? " " : ""}${transcript}`.trim());
      }
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    recognition.onerror = () => {
      recognitionRef.current = null;
      setIsListening(false);
    };
    setIsListening(true);
    recognition.start();
  }

  // Render logic for main content
  function renderContent() {
    switch (activeNav) {
      case "Dashboard":
        return (
          <Dashboard
            dashboard={dashboard}
            classes={classes}
            loading={loading}
            err={err}
            generatingCalendar={generatingCalendar}
            onAddClass={() => setShowAdd(true)}
            onGenerateCalendar={handleGenerateCalendar}
            onUploadSyllabus={(classId) => handleUploadClick(classId, "syllabus")}
            onOpenAllClasses={() => setActiveNav("All Classes")}
            onOpenCalendar={() => setActiveNav("Calendar")}
            onOpenStudyQuiz={() => setActiveNav("Study & Quiz")}
          />
        );
      case "Calendar":
        return <Calendar />;
      case "All Classes":
        return <AllClasses onDataChange={refresh} />;
      case "Study & Quiz":
        return (
          <StudyQuiz
            quiz={quiz}
            studySession={studySession}
            selectedClassId={selectedClassId}
            classes={classes}
          />
        );
      case "Class Chat":
        return (
          <ClassChat
            chatHistory={chatHistory}
            selectedClassId={selectedClassId}
            classes={classes}
            chatBusy={chatBusy}
          />
        );
      case "Settings":
        return <Settings />;
      default:
        return <div>Page not found</div>;
    }
  }

  const shouldRenderComposer = shouldShowComposer && (!isComposerCollapsed || isMobileViewport);
  const mobileContentPadding = shouldShowComposer
    ? `${Math.max(mobileComposerHeight, isComposerCollapsed ? 72 : 84) + 12}px`
    : undefined;


  return (
    <div className="h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="flex h-full">
        {isMobileMenuOpen && (
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 z-30 bg-slate-900/40 lg:hidden"
            aria-label="Close menu"
          />
        )}

        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 shadow-sm transition-transform duration-300 flex flex-col ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${isSidebarVisible ? "lg:flex" : "lg:hidden"} lg:static lg:translate-x-0`}>
          <div className="p-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="text-white font-bold text-xl">S</span>
              </div>
              <div>
                <div className="text-lg font-bold text-slate-900 tracking-tight leading-none">
                  StudyForge
                </div>
                <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mt-0.5">
                  Student Portal
                </div>
              </div>
            </div>
          </div>

          <nav className="px-4 space-y-1 flex-1">
            {navItems.map((item) => {
              const active = item === activeNav;
              return (
                <button
                  key={item}
                  onClick={() => {
                    setActiveNav(item);
                    setIsMobileMenuOpen(false);
                  }}
                  className={[
                    "w-full text-left px-4 py-3.5 text-sm font-medium rounded-xl transition-all duration-200 ease-in-out group flex items-center gap-3",
                    active
                      ? "bg-slate-900 text-white shadow-lg shadow-slate-900/20 translate-x-1"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 hover:translate-x-1",
                  ].join(" ")}
                >
                  {/* Icon placeholder circles */}
                  <div className={`w-2 h-2 rounded-full ${active ? 'bg-indigo-400' : 'bg-slate-300 group-hover:bg-slate-400'}`} />
                  {item}
                </button>
              );
            })}
          </nav>

          <div className="p-6">
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Pro Tip</div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Check your calendar regularly to stay ahead of deadlines.
              </p>
            </div>
            <div className="mt-4 text-[10px] text-center text-slate-400">
              v1.0.0 • Student App
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="relative flex-1 flex flex-col h-full overflow-hidden bg-slate-50/50">
          <div className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur border-b border-slate-200/70 px-3 py-2 sm:px-4 flex items-center justify-between">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Menu
            </button>
            <button
              type="button"
              onClick={() => setIsSidebarVisible((prev) => !prev)}
              className="hidden lg:inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              {isSidebarVisible ? "Hide Menu" : "Show Menu"}
            </button>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              {activeNav}
            </div>
          </div>

          {/* Scrollable Page Content */}
          <div
            className={`flex-1 overflow-y-auto scroll-smooth pb-6 ${shouldRenderComposer ? (isClassChatTab ? "md:pb-32" : "md:pb-44") : "md:pb-6"}`}
            style={isMobileViewport ? { paddingBottom: mobileContentPadding } : undefined}
          >
            {renderContent()}
          </div>

          {toast && (
            <div className="absolute top-16 right-4 z-40 animate-pulse">
              <div className={`px-4 py-3 rounded-xl shadow-xl border backdrop-blur text-sm font-semibold ${
                toast.type === "success"
                  ? "bg-emerald-50/95 text-emerald-800 border-emerald-200"
                  : "bg-rose-50/95 text-rose-800 border-rose-200"
              }`}>
                {toast.message}
              </div>
            </div>
          )}

          {shouldShowComposer && !isClassChatTab && (
            <button
              type="button"
              onClick={() => setIsComposerCollapsed((v) => !v)}
              className={`hidden md:inline-flex absolute ${isClassChatTab ? "bottom-24 md:bottom-20" : "bottom-3 md:bottom-8"} right-3 md:right-8 z-30 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-md hover:bg-slate-50`}
            >
              {isComposerCollapsed ? "Open Prompt Box" : "Collapse Prompt Box"}
            </button>
          )}

          {/* Mobile: fixed ChatGPT-like bottom bar. Desktop: existing floating composer. */}
          {shouldRenderComposer && (
            <div className={`${isMobileViewport ? "fixed inset-x-0 bottom-0 z-30 px-0" : `absolute ${isClassChatTab ? "bottom-0 md:bottom-0 left-0 right-0" : "bottom-16 md:bottom-20 left-3 md:left-8 right-3 md:right-8"} z-20 flex justify-center pointer-events-none`}`}>
              <div
                ref={composerRef}
                className={`w-full ${isMobileViewport
                  ? "rounded-t-2xl border-t border-x border-slate-200 bg-white p-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] shadow-[0_-10px_30px_rgba(15,23,42,0.12)]"
                  : `${isClassChatTab ? "max-w-none md:max-w-6xl rounded-none md:rounded-2xl border-x-0 md:border" : "max-w-5xl rounded-2xl border"} bg-white/90 backdrop-blur-xl shadow-2xl shadow-slate-200/50 border-white/20 p-3 space-y-2 pointer-events-auto ring-1 ring-slate-900/5`
                }`}
              >
              {isMobileViewport && (
                <button
                  type="button"
                  onClick={() => setIsComposerCollapsed((v) => !v)}
                  aria-expanded={!isComposerCollapsed}
                  className="w-full flex items-center justify-center gap-2 py-1 text-slate-500"
                >
                  <span className="h-1.5 w-10 rounded-full bg-slate-300" />
                  <span className="text-xs font-semibold">{isComposerCollapsed ? "▴" : "▾"}</span>
                </button>
              )}

              {!isMobileViewport || !isComposerCollapsed ? (
              <>
              <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedClassId}
                onChange={async (e) => {
                  const id = e.target.value;
                  setSelectedClassId(id);
                  setSelectedFileId("");
                  if (id) {
                    const hist = await api.getChatHistory(id);
                    setChatHistory(hist.history || []);
                    const filesData = await api.listFiles(id);
                    setClassFiles(filesData.files || []);
                  } else {
                    setClassFiles([]);
                  }
                }}
                className="w-full sm:w-48 bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">Select Class...</option>
                {classes.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <select
                value={selectedFileId}
                onChange={(e) => setSelectedFileId(e.target.value)}
                disabled={!selectedClassId}
                className="w-full sm:w-56 bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                style={{ backgroundImage: 'none' }}
              >
                <option value="">All Class Files</option>
                {filteredClassFiles.map((f) => (
                  <option key={f.id} value={f.id}>{f.file_type === "syllabus" ? "[Syllabus] " : ""}{f.filename}</option>
                ))}
              </select>

              {isClassChatTab ? (
                <div className="w-full sm:w-48 bg-slate-50 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 border border-slate-200">
                  Chat
                </div>
              ) : (
                <select
                  value={mode}
                  onChange={(e) => setMode(e.target.value)}
                  className="w-full sm:w-48 bg-slate-50 border-transparent rounded-xl px-4 py-3 text-sm font-medium text-slate-700 focus:ring-2 focus:ring-indigo-100 focus:outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                  style={{ backgroundImage: 'none' }}
                >
                  <option>Chat</option>
                  <option>Study Session</option>
                  <option>Practice Quiz</option>
                </select>
              )}
              </div>

              <div className="flex flex-col md:flex-row items-stretch gap-2">
                <textarea
                  ref={promptRef}
                  value={message}
                  onChange={handlePromptInput}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={isMobileViewport ? 1 : (isClassChatTab ? 2 : 3)}
                  className="w-full md:flex-1 resize-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 text-slate-800"
                  placeholder={`${mode === "Chat" ? "Ask your AI assistant..." : `Enter topic for ${mode}...`} (Ctrl/Cmd+Enter to send)`}
                />

                <div className="grid grid-cols-2 md:grid-cols-1 gap-2">
                  <button
                    onClick={handleSend}
                    disabled={chatBusy}
                    className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white rounded-xl px-6 py-3 text-sm font-semibold transition-all duration-200 shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:shadow-none"
                  >
                    {chatBusy ? "Sending..." : "Send"}
                  </button>

                  <button
                    type="button"
                    onClick={toggleVoiceInput}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold border transition-colors ${
                      isListening ? "bg-rose-50 text-rose-700 border-rose-200" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {isListening ? "Listening..." : "Voice Input"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setVoiceEnabled((v) => !v)}
                    className={`w-full rounded-xl px-4 py-3 text-sm font-semibold border transition-colors col-span-2 md:col-span-1 ${
                      voiceEnabled ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-white text-slate-700 border-slate-200"
                    }`}
                  >
                    {voiceEnabled ? "Voice Reply: On" : "Voice Reply: Off"}
                  </button>
                </div>
              </div>
              </>
              ) : (
                <div className="px-2 pb-1 text-xs text-slate-500">Prompt collapsed</div>
              )}
            </div>
            </div>
          )}

          {/* Hidden File Input */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf"
            className="hidden"
            style={{ display: 'none' }}
          />

          {/* Add Class Modal - Global Overlay */}
          {showAdd && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-6 z-50">
              <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-8 transform transition-all scale-100">
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Add New Class</h2>
                <p className="text-slate-500 text-sm mb-6">Enter the details below to track a new course.</p>

                <div className="space-y-5">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Class Name</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Introduction to Psychology"
                      value={form.name}
                      onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Professor</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Dr. Smith"
                      value={form.professor}
                      onChange={(e) => setForm((f) => ({ ...f, professor: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Semester</label>
                    <input
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400"
                      placeholder="e.g. Fall 2024"
                      value={form.semester}
                      onChange={(e) => setForm((f) => ({ ...f, semester: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                  <button
                    onClick={() => setShowAdd(false)}
                    className="px-5 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateClass}
                    className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 text-sm font-medium rounded-xl shadow-lg shadow-slate-900/20 transition-all hover:-translate-y-0.5"
                  >
                    Create Class
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
