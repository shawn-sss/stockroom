import Modal from "../../components/Modal.jsx";
import { STATUS_DEPLOYED } from "../../constants/status.js";

export default function QuickActionModal({
  quickActionItem,
  quickActionForm,
  setQuickActionForm,
  onClose,
  onSubmit,
  busy,
}) {
  if (!quickActionItem) {
    return null;
  }

  return (
    <Modal isOpen onClose={onClose} contentStyle={{ maxWidth: 500 }}>
      <div className="row modal-header">
        <div>
          <h2 style={{ margin: 0 }}>
            {quickActionItem.status === STATUS_DEPLOYED ? "Return item" : "Deploy item"}
          </h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {quickActionItem.category} - {quickActionItem.make} {quickActionItem.model}
          </p>
        </div>
        <button
          type="button"
          className="secondary"
          onClick={onClose}
          aria-label="Close"
          title="Close"
        >
          &times;
        </button>
      </div>
      <div className="divider" />
      <form onSubmit={onSubmit} className="form-grid">
        {quickActionItem.status !== STATUS_DEPLOYED ? (
          <label>
            Assigned user (required)
            <input
              placeholder="Who is this going to?"
              value={quickActionForm.assignedUser}
              onChange={(event) =>
                setQuickActionForm({ ...quickActionForm, assignedUser: event.target.value })
              }
              required
            />
          </label>
        ) : null}
        <label>
          Note (optional)
          <input
            placeholder={
              quickActionItem.status === STATUS_DEPLOYED
                ? "Any notes about the return (optional)"
                : "Any notes about the deployment (optional)"
            }
            value={quickActionForm.note}
            onChange={(event) =>
              setQuickActionForm({ ...quickActionForm, note: event.target.value })
            }
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          title={quickActionItem.status === STATUS_DEPLOYED ? "Mark as in stock" : "Mark as deployed"}
        >
          {quickActionItem.status === STATUS_DEPLOYED ? "Mark as in stock" : "Mark as deployed"}
        </button>
      </form>
    </Modal>
  );
}
