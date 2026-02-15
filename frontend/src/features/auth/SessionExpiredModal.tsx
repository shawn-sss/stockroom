import Modal from "../../components/Modal";
import {
  PASSWORD_PATTERN,
  PASSWORD_RULE_TEXT,
  USERNAME_PATTERN,
  USERNAME_RULE_TEXT,
} from "../../constants/auth";

export default function SessionExpiredModal({
  isOpen,
  username,
  error,
  busy,
  onReauth,
}) {
  return (
    <Modal isOpen={isOpen} onClose={() => {}} contentClassName="modal modal-narrow">
      <div className="row modal-header">
        <div>
          <h2 style={{ margin: 0 }}>Session expired</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Please sign in again to continue. Your work is still here.
          </p>
        </div>
      </div>
      <div className="divider" />
      <form onSubmit={onReauth} className="form-grid">
        <label>
          Username
          <input
            name="username"
            type="text"
            defaultValue={username || ""}
            pattern={USERNAME_PATTERN}
            title={USERNAME_RULE_TEXT}
            required
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            pattern={PASSWORD_PATTERN}
            title={PASSWORD_RULE_TEXT}
            required
          />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy} title="Sign in">
          Sign in
        </button>
      </form>
    </Modal>
  );
}
