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

export const api = {
  // Dashboard
  getDashboard: () => request("/api/dashboard"),

  // Classes
  listClasses: () => request("/api/classes").then(res => res.classes || []),
  createClass: (payload) =>
    request("/api/classes", { method: "POST", body: JSON.stringify(payload) }),
  getClass: (id) => request(`/api/classes/${id}`),
  getClassFiles: (classId, fileType = null) => {
    const url = fileType 
      ? `/api/classes/${classId}/files?file_type=${fileType}`
      : `/api/classes/${classId}/files`;
    return request(url).then(res => res.files || []);
  },

  // Upload PDFs
  uploadSyllabus: (classId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/classes/${classId}/upload/syllabus`, {
      method: "POST",
      body: formData,
    }).then(res => res.json());
  },
  uploadMaterial: (classId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/classes/${classId}/upload/material`, {
      method: "POST",
      body: formData,
    }).then(res => res.json());
  },
  uploadAssessment: (classId, file) => {
    const formData = new FormData();
    formData.append("file", file);
    return fetch(`${API_BASE}/api/classes/${classId}/upload/assessment`, {
      method: "POST",
      body: formData,
    }).then(res => res.json());
  },

  // Calendar
  generateCalendar: (classIds = []) =>
    request("/api/calendar/generate", { 
      method: "POST",
      body: JSON.stringify({ class_ids: classIds, default_year: new Date().getFullYear() })
    }),
  getCalendar: () => request("/api/calendar"),

  // Quiz
  generateQuiz: (classId, numQuestions = 5, difficulty = "medium", topic = null) =>
    request("/api/quiz/generate", {
      method: "POST",
      body: JSON.stringify({
        class_id: classId,
        num_questions: numQuestions,
        difficulty,
        topic,
      }),
    }),

  // Study Session
  createStudySession: (classId, topic) =>
    request("/api/study/session", {
      method: "POST",
      body: JSON.stringify({ class_id: classId, topic }),
    }),

  // Chat
  sendChatMessage: (classId, message, mode = "Study Session") =>
    request("/api/chat/send", {
      method: "POST",
      body: JSON.stringify({ class_id: classId, message, mode }),
    }),
  getChatHistory: (classId, limit = 50) =>
    request(`/api/chat/history?class_id=${classId}&limit=${limit}`).then(res => res.history || []),
  clearChatHistory: (classId) =>
    request(`/api/chat/history/${classId}`, { method: "DELETE" }),
};
