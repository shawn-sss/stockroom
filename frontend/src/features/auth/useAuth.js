import { useEffect, useState } from "react";
import { apiRequest } from "../../api/client.js";

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

  const loadSession = async (activeToken) => {
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
    } catch (err) {
      clearSession();
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadSession(token);
    }
  }, [token]);

  const loginWithCredentials = async (usernameValue, passwordValue, options = {}) => {
    const { suppressError = false } = options;
    if (!suppressError) {
      setError("");
    }
    const body = new URLSearchParams({
      username: usernameValue || "",
      password: passwordValue || "",
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

  const handleLogin = async (event) => {
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
