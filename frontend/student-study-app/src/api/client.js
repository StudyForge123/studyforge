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
  const formData = new FormData();
  formData.append("file", file);
  
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText} ${text}`);
  }

  return res.json();
}

export const api = {
  // Dashboard
  getDashboard: () => request("/api/dashboard"),

  // Classes
  listClasses: () => request("/api/classes"),
  createClass: (payload) =>
    request("/api/classes", { method: "POST", body: JSON.stringify(payload) }),
  getClass: (id) => request(`/api/classes/${id}`),

  // File uploads
  uploadSyllabus: (classId, file) =>
    uploadFile(`/api/classes/${classId}/upload/syllabus`, file),
  uploadMaterial: (classId, file) =>
    uploadFile(`/api/classes/${classId}/upload/material`, file),
  uploadAssessment: (classId, file) =>
    uploadFile(`/api/classes/${classId}/upload/assessment`, file),
  getClassFiles: (classId) => request(`/api/classes/${classId}/files`),
  getVectorStats: (classId) => request(`/api/classes/${classId}/vector-stats`),

  // Calendar / schedule
  generateCalendar: (payload) =>
    request("/api/calendar/generate", { method: "POST", body: JSON.stringify(payload) }),
  getCalendar: () => request("/api/calendar"),

  // Quiz
  generateQuiz: (payload) =>
    request("/api/quiz/generate", { method: "POST", body: JSON.stringify(payload) }),

  // Study Session
  generateStudySession: (payload) =>
    request("/api/study/session", { method: "POST", body: JSON.stringify(payload) }),

  // Chat / AI
  chat: (payload) =>
    request("/api/chat/send", { method: "POST", body: JSON.stringify(payload) }),
  getChatHistory: (classId, limit = 50) =>
    request(`/api/chat/history?class_id=${classId}&limit=${limit}`),
  clearChatHistory: (classId) =>
    request(`/api/chat/history/${classId}`, { method: "DELETE" }),
};
