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

  createClass: (name) => request("/api/classes", {
    method: "POST",
    body: JSON.stringify({ name }) // Backend expects { "name": "..." }
  }),

  // FILE UPLOAD (Direct to Backend)
  uploadSyllabus: (classId, fileObj) => {
    const formData = new FormData();
    formData.append("file", fileObj);
    return request(`/api/classes/${classId}/upload/syllabus`, {
      method: "POST",
      body: formData
    });
  },

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

  // DASHBOARD
  getDashboard: () => request("/api/dashboard"),

  // CHAT
  chat: (params) => request("/api/chat", {
    method: "POST",
    body: JSON.stringify(params)
  }),
};