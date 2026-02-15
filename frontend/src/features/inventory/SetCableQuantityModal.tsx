import Modal from "../../components/Modal";
import { formatCableEnds, formatCableLength, parseQuantityValue } from "./cable";

export default function SetCableQuantityModal({
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

  return (
    <Modal isOpen onClose={onClose} contentStyle={{ maxWidth: 560 }}>
      <div className="row modal-header">
        <div>
          <h2 style={{ margin: 0 }}>Adjust cable quantity</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            {formatCableEnds(item.make)} ({formatCableLength(item.model)})
          </p>
          <p className="muted" style={{ margin: "4px 0 0" }}>
            Current quantity: {parseQuantityValue(item.quantity, 0)}
          </p>
        </div>
        <button type="button" className="secondary" onClick={onClose} aria-label="Close" title="Close">
          &times;
        </button>
      </div>
      <div className="divider" />
      <form
        onSubmit={async (event) => {
          event.preventDefault();
          await onSubmit();
        }}
        className="form-grid"
      >
        <label>
          Action
          <select
            name="setCableQuantityOperation"
            value={form.operation}
            onChange={(event) => setForm({ ...form, operation: event.target.value })}
          >
            <option value="set">Set to exact quantity</option>
            <option value="add">Add exact amount</option>
            <option value="subtract">Subtract exact amount</option>
          </select>
        </label>
        <label>
          {form.operation === "set"
            ? "Quantity"
            : form.operation === "add"
            ? "Amount to add"
            : "Amount to subtract"}
          <input
            name="setCableQuantity"
            type="number"
            min={0}
            step={1}
            value={form.quantity}
            onChange={(event) => setForm({ ...form, quantity: event.target.value })}
            required
          />
        </label>
        <label>
          Note (optional)
          <input
            name="setCableQuantityNote"
            placeholder="Add any helpful context"
            value={form.note}
            onChange={(event) => setForm({ ...form, note: event.target.value })}
          />
        </label>
        <button
          type="submit"
          disabled={busy || parseQuantityValue(form.quantity, -1) < 0}
          title="Apply quantity adjustment"
        >
          Apply
        </button>
      </form>
    </Modal>
  );
}
