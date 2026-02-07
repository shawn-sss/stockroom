import ItemFormFields from "./ItemFormFields";
import Modal from "../../components/Modal";

export default function AddItemModal({
  isOpen,
  onClose,
  onSubmit,
  addForm,
  setAddForm,
  useDropdowns,
  setUseDropdowns,
  categoryOptions,
  makeOptionsByCategory,
  modelOptionsByCategoryMake,
  capitalizeFirst,
  busy,
}) {
  if (!isOpen) {
    return null;
  }

  const canSubmit =
    addForm.category?.trim() &&
    addForm.make?.trim() &&
    addForm.model?.trim() &&
    addForm.serviceTag?.trim();

  return (
    <Modal isOpen={isOpen} onClose={onClose} contentClassName="modal modal-narrow">
      <div className="row modal-header">
        <div>
          <h2 style={{ margin: 0 }}>Add new item</h2>
          <p className="muted" style={{ margin: "6px 0 0" }}>
            Add a new item to the inventory
          </p>
        </div>
        <button type="button" className="secondary" onClick={onClose} aria-label="Close" title="Close">
          &times;
        </button>
      </div>
      <div className="divider" />
      <form onSubmit={onSubmit} className="form-grid">
        <ItemFormFields
          form={addForm}
          setForm={setAddForm}
          useDropdowns={useDropdowns}
          setUseDropdowns={setUseDropdowns}
          categoryOptions={categoryOptions}
          makeOptionsByCategory={makeOptionsByCategory}
          modelOptionsByCategoryMake={modelOptionsByCategoryMake}
          capitalizeFirst={capitalizeFirst}
          required
        />
        <button type="submit" disabled={busy || !canSubmit} title="Add to inventory">
          Add to inventory
        </button>
      </form>
    </Modal>
  );
}
