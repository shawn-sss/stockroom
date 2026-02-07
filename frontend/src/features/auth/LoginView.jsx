import { useEffect } from "react";
import "./LoginView.css";

export default function LoginView({ onLogin, busy, notice, error }) {
  useEffect(() => {
    document.body.classList.add("login-view");
    return () => {
      document.body.classList.remove("login-view");
    };
  }, []);

  return (
    <div className="app-shell">
      {(notice || error) ? (
        <div className="toast-stack" role="status" aria-live="polite">
          {notice ? <div className="notice">{notice}</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </div>
      ) : null}

      <div className="panel login-panel">
        <a
          href="#/inventory"
          style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, textDecoration: "none", color: "inherit" }}
          title="Go to homepage"
        >
          <img src="/logo.png" alt="Stockroom" style={{ width: 40, height: 40 }} />
          <h1 className="title" style={{ margin: 0 }}>Stockroom</h1>
        </a>
        <p className="subtitle">Sign in to manage inventory and deployments.</p>
        <form onSubmit={onLogin} className="form-grid">
          <label>
            Username
            <input name="username" type="text" autoComplete="username" required autoFocus />
          </label>
          <label>
            Password
            <input name="password" type="password" autoComplete="current-password" required />
          </label>
          <button type="submit" disabled={busy} title="Sign in">Sign in</button>
        </form>
      </div>
    </div>
  );
}
