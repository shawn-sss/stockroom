import { useEffect, useState, type FormEvent } from "react";
import { apiRequest } from "../../api/client";

export default function useAuth({ setError }) {
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [username, setUsername] = useState("");
  const [role, setRole] = useState("user");
  const [loading, setLoading] = useState(Boolean(token));

  const clearSession = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUsername("");
    setRole("user");
  };

  const loadSession = async (activeToken: string) => {
    setLoading(true);
    setError("");
    try {
      const meRes = await apiRequest("/me", { skipAuthEvent: true }, activeToken);
      if (!meRes.ok) {
        throw new Error("Session expired");
      }
      const meData = await meRes.json();
      setUsername(meData.username);
      setRole(meData.role);
    } catch (err: unknown) {
      clearSession();
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSession(token);
    }
  }, [token]);

  const loginWithCredentials = async (
    usernameValue: FormDataEntryValue | null,
    passwordValue: FormDataEntryValue | null,
    options: { suppressError?: boolean } = {}
  ) => {
    const { suppressError = false } = options;
    if (!suppressError) {
      setError("");
    }
    const asText = (value: FormDataEntryValue | null) =>
      typeof value === "string" ? value : "";
    const body = new URLSearchParams({
      username: asText(usernameValue),
      password: asText(passwordValue),
    });
    const res = await apiRequest(
      "/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
        skipAuthEvent: true,
      },
      null
    );
    if (!res.ok) {
      if (!suppressError) {
        setError("Login failed");
      }
      return { ok: false };
    }
    const data = await res.json();
    localStorage.setItem("token", data.access_token);
    setToken(data.access_token);
    return { ok: true };
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const usernameValue = form.get("username");
    const passwordValue = form.get("password");
    await loginWithCredentials(usernameValue, passwordValue);
  };

  const handleLogout = () => {
    clearSession();
  };

  return {
    token,
    username,
    role,
    loading,
    loginWithCredentials,
    handleLogin,
    handleLogout,
  };
}
  const getErrorMessage = (error: unknown) =>
    error instanceof Error && error.message ? error.message : "Session expired";
