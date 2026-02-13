export const API_BASE = import.meta.env.VITE_API_BASE || "/api";

type ApiRequestOptions = RequestInit & { skipAuthEvent?: boolean };

type ApiErrorEntry = { msg?: unknown };
type ApiErrorPayload = { detail?: unknown } | null | undefined;

export function getApiErrorMessage(data: ApiErrorPayload, fallback: string) {
  if (!data) {
    return fallback;
  }
  const detail = data.detail;
  if (typeof detail === "string" && detail.trim()) {
    return detail;
  }
  if (Array.isArray(detail)) {
    const messages = detail
      .map((entry) => {
        const candidate = entry as ApiErrorEntry | null;
        return candidate && candidate.msg ? String(candidate.msg) : "";
      })
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

export async function readApiErrorMessage(response: Response, fallback: string) {
  try {
    const data = await response.json();
    return getApiErrorMessage(data, fallback);
  } catch (err) {
    return fallback;
  }
}

export async function apiRequest(path: string, options: ApiRequestOptions = {}, token?: string | null) {
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
