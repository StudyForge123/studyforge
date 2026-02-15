import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function ChatHistory({ classId, classes = [] }) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  function fetchHistory() {
    if (!classId) {
      setMessages([]);
      return;
    }
    setLoading(true);
    setErr("");
    api
      .getChatHistory(classId)
      .then((list) => setMessages(Array.isArray(list) ? list : []))
      .catch((e) => setErr(e.message || "Failed to load history"))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchHistory();
  }, [classId]);

  const selectedName = classes.find((c) => c.id === classId)?.name || "Chat";

  return (
    <div className="px-8 py-10 max-w-3xl mx-auto h-full overflow-y-auto">
      <h1 className="text-3xl font-bold text-slate-900 mb-2 tracking-tight">Chat History</h1>
      <p className="text-slate-500 mb-4">
        {classId ? `History for: ${selectedName}` : "Select a class (bottom bar) to view and send messages."}
      </p>
      {classId && (
        <button
          type="button"
          onClick={fetchHistory}
          disabled={loading}
          className="mb-6 px-4 py-2 text-sm font-medium rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          Refresh
        </button>
      )}

      {err && (
        <div className="mb-6 rounded-xl bg-red-50 border border-red-100 p-4 text-sm text-red-800">
          {err}
        </div>
      )}

      {loading && <div className="text-slate-500">Loading...</div>}

      {!loading && classId && messages.length === 0 && !err && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
          No messages yet. Use the chat bar below to send a message.
        </div>
      )}

      {!loading && messages.length > 0 && (
        <div className="space-y-4">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`rounded-2xl p-4 ${m.role === "user" ? "bg-indigo-50 ml-8 border border-indigo-100" : "bg-slate-100 mr-8 border border-slate-200"}`}
            >
              <span className="text-xs font-semibold text-slate-500 uppercase">{m.role}</span>
              <p className="mt-1 text-slate-800">{m.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
