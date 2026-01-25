export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

export function getApiErrorMessage(data, fallback) {
  if (!data) {
    return fallback;
  }
  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => (entry && entry.msg ? String(entry.msg) : ""))
      .filter(Boolean);
    if (messages.length > 0) {
      return messages.join(", ");
    }
  }
  if (detail && typeof detail === "object") {
    try {
      return JSON.stringify(detail);
    } catch (err) {
      return fallback;
    }
  }
  return fallback;
}

export async function apiRequest(path, options = {}, token) {
  const { skipAuthEvent, ...fetchOptions } = options;
  const headers = new Headers(fetchOptions.headers || {});
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const response = await fetch(`${API_BASE}${path}`, { ...fetchOptions, headers });
  if (!skipAuthEvent && response.status === 401 && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("auth:expired"));
  }
  return response;
}
