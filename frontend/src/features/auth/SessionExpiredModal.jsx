import Modal from "../../components/Modal.jsx";

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
          <input name="username" type="text" defaultValue={username || ""} required />
        </label>
        <label>
          Password
          <input name="password" type="password" required />
        </label>
        {error ? <div className="error">{error}</div> : null}
        <button type="submit" disabled={busy} title="Sign in">
          Sign in
        </button>
      </form>
    </Modal>
  );
}
