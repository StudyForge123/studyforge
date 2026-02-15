import { useState, useEffect, useRef } from "react";
import { api } from "../api/client";

export default function Chat() {
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState("");
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState("Study Session");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const messagesEndRef = useRef(null);

  useEffect(() => {
    async function load() {
      try {
        const data = await api.listClasses();
        setClasses(data);
        if (data.length > 0) {
          setSelectedClass(data[0].id);
          loadHistory(data[0].id);
        }
      } catch (e) {
        setErr(e.message || "Failed to load classes");
      }
    }
    load();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function loadHistory(classId) {
    if (!classId) return;
    try {
      const data = await api.getChatHistory(classId);
      setHistory(data);
    } catch (e) {
      setErr(e.message || "Failed to load chat history");
    }
  }

  async function handleClassChange(classId) {
    setSelectedClass(classId);
    await loadHistory(classId);
  }

  async function handleSend() {
    if (!message.trim() || !selectedClass) return;
    
    const userMsg = message;
    setMessage("");
    setLoading(true);
    setErr("");
    
    // Optimistic update
    const tempUserMsg = {
      role: "user",
      content: userMsg,
      created_at: new Date().toISOString(),
    };
    setHistory([...history, tempUserMsg]);
    
    try {
      const response = await api.sendChatMessage(selectedClass, userMsg, mode);
      
      // Add assistant response
      const assistantMsg = {
        role: "assistant",
        content: response.response,
        created_at: new Date().toISOString(),
      };
      
      setHistory([...history, tempUserMsg, assistantMsg]);
    } catch (e) {
      setErr(e.message || "Failed to send message");
      // Remove optimistic update on error
      setHistory(history);
    } finally {
      setLoading(false);
    }
  }

  async function handleClear() {
    if (!selectedClass) return;
    if (!confirm("Clear all chat history for this class?")) return;
    
    try {
      await api.clearChatHistory(selectedClass);
      setHistory([]);
    } catch (e) {
      setErr(e.message || "Failed to clear history");
    }
  }

  return (
    <div className="px-8 py-10 max-w-5xl mx-auto h-full flex flex-col">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">AI Chat</h1>
        <p className="text-slate-500">
          Chat with AI about your class materials
        </p>
      </div>

      {err && (
        <div className="mb-4 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-red-500" /> {err}
        </div>
      )}

      {/* Controls */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mb-6 flex items-center gap-4">
        <div className="flex-1">
          <select
            value={selectedClass}
            onChange={(e) => handleClassChange(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          >
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex-1">
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
          >
            <option>Study Session</option>
            <option>Practice Quiz</option>
            <option>Practice Exam</option>
          </select>
        </div>

        <button
          onClick={handleClear}
          className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold hover:bg-red-100 transition-all"
        >
          Clear History
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-100 p-6 overflow-y-auto mb-6">
        {history.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="text-4xl mb-4">💬</div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No messages yet</h3>
            <p className="text-sm text-slate-500">
              Start a conversation about your class materials
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-900"
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p
                    className={`text-xs mt-2 ${
                      msg.role === "user" ? "text-indigo-200" : "text-slate-400"
                    }`}
                  >
                    {new Date(msg.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-3">
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
          placeholder="Type your message..."
          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none placeholder:text-slate-400"
        />
        <button
          onClick={handleSend}
          disabled={loading || !message.trim() || !selectedClass}
          className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}
