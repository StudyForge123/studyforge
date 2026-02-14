const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8080";

import { fetchAuthSession } from "aws-amplify/auth";

async function request(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };

  try {
    const session = await fetchAuthSession();
    if (session.tokens?.accessToken) {
      headers["Authorization"] = `Bearer ${session.tokens.accessToken.toString()}`;
    }
  } catch (error) {
    console.debug("No auth session found", error);
  }

  const res = await fetch(`${API_BASE}${path}`, {
    headers,
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
  listClasses: () => request("/api/classes"),
  createClass: (payload) =>
    request("/api/classes", { method: "POST", body: JSON.stringify(payload) }),
  getClass: (id) => request(`/api/classes/${id}`),

  // Upload syllabus (S3 presigned)
  getUploadUrl: (classId, fileName, contentType) =>
    request(`/api/classes/${classId}/syllabus/upload-url`, {
      method: "POST",
      body: JSON.stringify({ fileName, contentType }),
    }),

  // Calendar / schedule
  generateCalendar: (classId) =>
    request(`/api/classes/${classId}/calendar/generate`, { method: "POST" }),
  getCalendar: () => request("/api/calendar"),

  // Chat / AI
  chat: (payload) =>
    request("/api/chat", { method: "POST", body: JSON.stringify(payload) }),
};
