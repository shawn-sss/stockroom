import Modal from "../../components/Modal";
import { formatDate } from "../../utils/formatters";
import { STATUS_RETIRED } from "../../constants/status";
import { formatCableEnds, formatCableLength, parseQuantityValue } from "./cable";

export default function CableOverviewModal({
  isOpen,
  category,
  items,
  history,
  onClose,
  onAdjustQuantity,
  onRequestSetQuantity,
  onOpenItem,
  onRequestRestore,
  busy,
}) {
  if (!isOpen) {
    return null;
  }

  const sortedItems = [...items].sort((a, b) => {
    const aRetired = a.status === STATUS_RETIRED ? 1 : 0;
    const bRetired = b.status === STATUS_RETIRED ? 1 : 0;
    if (aRetired !== bRetired) {
      return aRetired - bRetired;
    }
    const endsCompare = formatCableEnds(a.make).localeCompare(formatCableEnds(b.make));
    if (endsCompare !== 0) {
      return endsCompare;
    }
    const lengthCompare = formatCableLength(a.model).localeCompare(formatCableLength(b.model));
    if (lengthCompare !== 0) {
      return lengthCompare;
    }
    return Number(a.id) - Number(b.id);
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
        <div className="row modal-header">
          <div>
            <h2 style={{ margin: 0 }}>{category} overview</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Fast stock adjustments with full change history
            </p>
          </div>
          <button type="button" className="secondary" onClick={onClose} aria-label="Close" title="Close">
            &times;
          </button>
        </div>
        <div className="divider" />
        <div className="modal-grid">
          <div className="stack">
            <h3 style={{ margin: 0 }}>Cable counts</h3>
            {items.length === 0 ? (
              <p className="muted">No cable entries found.</p>
            ) : (
              <div className="list">
                {sortedItems.map((item) => (
                  <div key={item.id} className="item-card" style={{ cursor: "default" }}>
                    <div className="row">
                      <div>
                        <div style={{ fontWeight: 600 }}>
                          {formatCableEnds(item.make)} ({formatCableLength(item.model)})
                        </div>
                        {item.status !== STATUS_RETIRED ? (
                          <>
                            <div className="muted">Qty: {parseQuantityValue(item.quantity, 0)}</div>
                            <div className="muted">Row: {item.row ? String(item.row) : "-"}</div>
                          </>
                        ) : null}
                      </div>
                      <div className="actions">
                        {item.status === STATUS_RETIRED ? (
                          <button
                            type="button"
                            className="secondary"
                            disabled={busy}
                            onClick={() => onRequestRestore(item)}
                            title="Restore cable"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy}
                              onClick={() => onOpenItem(item.id)}
                              aria-label="View or edit item"
                              title="Open item view/edit"
                            >
                              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true" style={{ display: "block" }}>
                                <path
                                  d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" strokeWidth="2" />
                              </svg>
                            </button>
                            <button
                              type="button"
                              className="secondary"
                              disabled={busy}
                              onClick={() => onRequestSetQuantity(item)}
                              aria-label="Adjust quantity options"
                              title="Adjust quantity options"
                            >
                              ...
                            </button>
                        <button
                          type="button"
                          disabled={busy || parseQuantityValue(item.quantity, 0) <= 0}
                          onClick={() => onAdjustQuantity(item.id, -1)}
                          title="Remove one"
                        >
                          -1
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onAdjustQuantity(item.id, 1)}
                              title="Add one"
                            >
                              +1
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="stack">
            <h3 style={{ margin: 0 }}>History</h3>
            {history.length === 0 ? (
              <p className="muted">No history yet.</p>
            ) : (
              <div className="list">
                {history.map((event) => {
                  const labels = {
                    category: "Category",
                    make: "Cable ends",
                    model: "Length",
                    service_tag: "Service tag",
                    quantity: "Quantity",
                    row: "Row",
                    note: "Note",
                    status: "Status",
                    assigned_user: "Assigned user",
                  };
                  const normalizeRaw = (value) =>
                    value === null || value === undefined ? "" : String(value).trim();
                  const formatHistoryValue = (key, value) => {
                    const normalized = normalizeRaw(value);
                    if (!normalized) {
                      return "";
                    }
                    if (key === "make") {
                      return formatCableEnds(normalized);
                    }
                    if (key === "model") {
                      return formatCableLength(normalized);
                    }
                    return normalized;
                  };
                  const toDisplayValue = (value) => (value ? value : "-");
                  const changeEntries = Object.entries(event?.changes || {})
                    .filter(([key]) => key !== "assigned_user")
                    .map(([key, value]) => {
                      const oldValue = formatHistoryValue(key, value?.old);
                      const newValue = formatHistoryValue(key, value?.new);
                      if (oldValue === newValue) {
                        return null;
                      }
                      return {
                        key,
                        label: labels[key] || key,
                        oldValue: toDisplayValue(oldValue),
                        newValue: toDisplayValue(newValue),
                      };
                    })
                    .filter(Boolean);
                  return (
                    <div key={event.id} className="item-card" style={{ cursor: "default" }}>
                      <div style={{ fontWeight: 600 }}>
                        {event.item_label} ({event.actor})
                      </div>
                      <div className="meta-stack">
                        <div className="muted">{formatDate(event.timestamp)}</div>
                        <div className="muted">{String(event.action).toUpperCase()}</div>
                        {changeEntries.length > 0
                          ? changeEntries.map((entry) => (
                              <div key={`${event.id}-${entry.key}`} className="muted">
                                {entry.label}: {entry.oldValue} -&gt; {entry.newValue}
                              </div>
                            ))
                          : null}
                        {event.note ? (
                          <div className="muted">Action note: {event.note}</div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
}
