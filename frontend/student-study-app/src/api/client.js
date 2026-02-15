const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

async function uploadFile(path, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: form,
    headers: {},
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

export const api = {
  getDashboard: () => request("/api/dashboard"),
  listClasses: () => request("/api/classes").then((d) => d.classes),
  createClass: (payload) =>
    request("/api/classes", { method: "POST", body: JSON.stringify({ name: payload.name || payload.className }) }),
  getClass: (id) => request(`/api/classes/${id}`),
  listClassFiles: (classId, fileType) =>
    request(`/api/classes/${classId}/files${fileType ? `?file_type=${fileType}` : ""}`).then((d) => d.files),

  uploadSyllabus: (classId, file) => uploadFile(`/api/classes/${classId}/upload/syllabus`, file),
  uploadMaterial: (classId, file) => uploadFile(`/api/classes/${classId}/upload/material`, file),
  uploadAssessment: (classId, file) => uploadFile(`/api/classes/${classId}/upload/assessment`, file),

  generateCalendar: (classIds, defaultYear) =>
    request("/api/calendar/generate", {
      method: "POST",
      body: JSON.stringify({ class_ids: Array.isArray(classIds) ? classIds : [classIds], default_year: defaultYear ?? new Date().getFullYear() }),
    }).then((d) => d.events || []),
  getCalendar: (classIds, defaultYear) =>
    request(`/api/calendar?class_ids=${(Array.isArray(classIds) ? classIds : [classIds]).join(",")}&default_year=${defaultYear ?? new Date().getFullYear()}`).then((d) => d.events || []),

  generateQuiz: (payload) =>
    request("/api/quiz/generate", { method: "POST", body: JSON.stringify(payload) }).then((d) => d.questions || []),
  generateStudySession: (payload) =>
    request("/api/study/session", { method: "POST", body: JSON.stringify(payload) }),

  sendChat: (classId, message, sessionId) =>
    request("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({ class_id: classId, message, session_id: sessionId || undefined }),
    }).then((d) => d.reply),
  getChatHistory: (classId, sessionId, limit) =>
    request(`/api/chat/history?class_id=${classId}${sessionId ? `&session_id=${sessionId}` : ""}&limit=${limit ?? 100}`).then((d) => d.messages || []),
};
