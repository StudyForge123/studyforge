// Point to the Python backend
const API_BASE = "http://localhost:8000";

async function request(path, options = {}) {
  // Ensure path starts with /
  const url = `${API_BASE}${path}`;
  const headers = options.headers || {};

  // Handle Content-Type for JSON, but skip for FormData (browser sets existing boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(url, { ...options, headers });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}: ${text}`);
  }

  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const api = {
  // CLASS MANAGEMENT
  listClasses: () => request("/api/classes"),

  // Alias for components that use getClasses
  getClasses: async () => {
    const data = await request("/api/classes");
    return data.classes || [];
  },

  createClass: (payload) => {
    const body = typeof payload === "string"
      ? { name: payload }
      : {
          name: payload?.name || "",
          professor: payload?.professor || null,
          semester_label: payload?.semester_label || null,
        };
    return request("/api/classes", {
      method: "POST",
      body: JSON.stringify(body)
    });
  },

  deleteClass: (classId) => request(`/api/classes/${classId}`, {
    method: "DELETE"
  }),

  // FILE MANAGEMENT
  uploadFile: (classId, fileObj, fileType = "material") => {
    const formData = new FormData();
    formData.append("file", fileObj);
    return request(`/api/classes/${classId}/upload?file_type=${fileType}`, {
      method: "POST",
      body: formData
    });
  },

  // Legacy support or alias
  uploadSyllabus: (classId, fileObj) => api.uploadFile(classId, fileObj, "syllabus"),

  // List files for a class
  listFiles: (classId, fileType = null) => {
    const params = fileType ? `?file_type=${fileType}` : "";
    return request(`/api/classes/${classId}/files${params}`);
  },

  deleteFile: (classId, fileId) => request(`/api/classes/${classId}/files/${fileId}`, {
    method: "DELETE"
  }),

  // CALENDAR
  // Fetch cached events (instant load)
  getCalendar: async () => {
    const { classes } = await api.listClasses();
    if (!classes || classes.length === 0) return [];

    const classIds = classes.map(c => c.id).join(",");
    const result = await request(`/api/calendar/events?class_ids=${classIds}`);
    return result.events || [];
  },

  generateCalendar: (classIds, defaultYear = new Date().getFullYear()) =>
    request("/api/calendar/generate", {
      method: "POST",
      body: JSON.stringify({ class_ids: classIds, default_year: defaultYear })
    }),

  // QUIZ
  generateQuiz: (params) => request("/api/quiz/generate", {
    method: "POST",
    body: JSON.stringify({
      class_id: params.class_id,
      num_questions: params.num_questions || 5,
      difficulty: params.difficulty || "medium",
      topic: params.topic || null,
      instructions: params.instructions || null,
      file_id: params.file_id || null
    })
  }),

  // STUDY SESSION
  startStudySession: (params) => request("/api/study/session", {
    method: "POST",
    body: JSON.stringify({
      class_id: params.class_id,
      topic: params.topic,
      file_id: params.file_id || null
    })
  }),

  // DASHBOARD
  getDashboard: () => request("/api/dashboard"),

  // CHAT
  sendChatMessage: (params) => request("/api/chat/send", {
    method: "POST",
    body: JSON.stringify({
      class_id: params.class_id,
      message: params.message,
      file_id: params.file_id || null
    })
  }),

  getChatHistory: (classId) => request(`/api/chat/history?class_id=${classId}`),

  // Legacy alias
  chat: (params) => api.sendChatMessage(params),
};
