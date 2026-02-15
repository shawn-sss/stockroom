import "./LoginView.css";
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_TEXT,
  USERNAME_PATTERN,
  USERNAME_RULE_TEXT,
} from "../../constants/auth";

export default function LoginView({ onLogin, busy, notice, error }) {
  return (
    <div className="login-view">
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
          className="login-brand"
          title="Go to homepage"
        >
          <img src="/logo.png" alt="Stockroom" className="login-brand-logo" />
          <h1 className="title">Stockroom</h1>
        </a>
        <p className="subtitle">Sign in to manage inventory and deployments.</p>
        <form onSubmit={onLogin} className="form-grid">
          <label>
            Username
            <input
              name="username"
              type="text"
              autoComplete="username"
              pattern={USERNAME_PATTERN}
              title={USERNAME_RULE_TEXT}
              required
              autoFocus
            />
          </label>
          <label>
            Password
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              pattern={PASSWORD_PATTERN}
              title={PASSWORD_RULE_TEXT}
              required
            />
          </label>
          <button type="submit" disabled={busy} title="Sign in">Sign in</button>
        </form>
      </div>
      </div>
    </div>
  );
}
