import Modal from "../../components/Modal";
import { STATUS_RETIRED } from "../../constants/status";
import { formatCableEnds, formatCableLength, isCableCategory } from "./cable";

export default function RetireItemModal({
  item,
  form,
  setForm,
  onClose,
  onSubmit,
  busy,
}) {
  if (!item) {
    return null;
  }

  const isRetired = item.status === STATUS_RETIRED;
  const title = isRetired ? "Restore item" : "Retire item";
  const isCable = isCableCategory(item.category);
  const cableQuantity = Number.isFinite(Number(item.quantity)) ? Number(item.quantity) : 0;
  const canZeroCableStock = !isRetired && isCable && cableQuantity > 0;
  const subtitle = isCableCategory(item.category)
    ? `${item.category} - ${formatCableEnds(item.make)} (${formatCableLength(item.model)})`
    : `${item.category} - ${item.make} ${item.model}`;
  const notePlaceholder = isRetired
    ? "Optional note about restoring"
    : "Optional note about retiring";

  return (
    <Modal isOpen onClose={onClose} contentStyle={{ maxWidth: 500 }}>
      <div className="row modal-header">
        <div>
          <h2 style={{ margin: 0 }}>{title}</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {subtitle}
          </p>
        </div>
        <button type="button" className="secondary" onClick={onClose} aria-label="Close" title="Close">
          &times;
        </button>
      </div>
      <div className="divider" />
      <form onSubmit={onSubmit} className="form-grid">
        <label>
          Note (optional)
          <input
            name="retireNote"
            placeholder={notePlaceholder}
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </label>
        {canZeroCableStock ? (
          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              name="retireZeroStock"
              type="checkbox"
              checked={Boolean(form.zeroStock)}
              onChange={(event) => setForm({ ...form, zeroStock: event.target.checked })}
            />
            <span>Set cable stock quantity to 0 on retire</span>
          </label>
        ) : null}
        <button type="submit" disabled={busy} title={isRetired ? "Restore to in stock" : "Mark as retired"}>
          {isRetired ? "Restore to in stock" : "Mark as retired"}
        </button>
      </form>
    </Modal>
  );
}
