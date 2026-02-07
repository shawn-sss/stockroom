import { useEffect, useMemo } from "react";

export default function ItemFormFields({
  form,
  setForm,
  useDropdowns,
  setUseDropdowns,
  categoryOptions,
  makeOptionsByCategory,
  modelOptionsByCategoryMake,
  capitalizeFirst,
  required = false,
  disabled = false,
  placeholders = {},
}) {
  const {
    category = "Laptop / Desktop / Monitor / Dock / Part",
    make = "Dell / Lenovo / HP...",
    model = "Latitude 5440 / ThinkPad T14...",
    serviceTag = "Serial / Service tag",
    row = "Row / shelf identifier",
    note = "Why / where / anything helpful",
  } = placeholders;

  const categoryValue = form.category ?? "";
  const makeValue = form.make ?? "";
  const modelValue = form.model ?? "";
  const serviceTagValue = form.serviceTag ?? "";
  const rowValue = form.row ?? "";
  const hasCategoryValue = categoryValue.trim().length > 0;
  const hasMakeValue = makeValue.trim().length > 0;
  const hasModelValue = modelValue.trim().length > 0;
  const hasServiceTagValue = serviceTagValue.trim().length > 0;
  const showNotApplicable = categoryValue.trim().toLowerCase() === "part";
  const requiredProps = required ? { required: true } : {};
  const inputLockProps = disabled
    ? { readOnly: true, "aria-readonly": true, className: "input-locked" }
    : {};
  const isCategoryDisabled = disabled;
  const isMakeDisabled = disabled || !hasCategoryValue;
  const isModelDisabled = disabled || !hasCategoryValue || !hasMakeValue;
  const isServiceTagDisabled = disabled || !hasCategoryValue || !hasMakeValue || !hasModelValue;
  const isRowAndNoteDisabled =
    disabled || !hasCategoryValue || !hasMakeValue || !hasModelValue || !hasServiceTagValue;
  const availableMakes = useMemo(() => {
    if (!hasCategoryValue) {
      return [];
    }
    return makeOptionsByCategory[categoryValue.trim()] || [];
  }, [categoryValue, hasCategoryValue, makeOptionsByCategory]);
  const availableModels = useMemo(() => {
    if (!hasCategoryValue || !hasMakeValue) {
      return [];
    }
    const modelsByMake = modelOptionsByCategoryMake[categoryValue.trim()] || {};
    return modelsByMake[makeValue.trim()] || [];
  }, [categoryValue, hasCategoryValue, hasMakeValue, makeValue, modelOptionsByCategoryMake]);

  useEffect(() => {
    if (!hasCategoryValue) {
      if (makeValue || modelValue || serviceTagValue) {
        setForm((prev) => ({ ...prev, make: "", model: "", serviceTag: "" }));
      }
      return;
    }
    if (useDropdowns.make && makeValue && !availableMakes.includes(makeValue)) {
      setForm((prev) => ({ ...prev, make: "", model: "", serviceTag: "" }));
    }
  }, [
    availableMakes,
    hasCategoryValue,
    makeValue,
    modelValue,
    serviceTagValue,
    setForm,
    useDropdowns.make,
  ]);

  useEffect(() => {
    if (!hasMakeValue) {
      if (modelValue || serviceTagValue) {
        setForm((prev) => ({ ...prev, model: "", serviceTag: "" }));
      }
      return;
    }
    if (useDropdowns.model && modelValue && !availableModels.includes(modelValue)) {
      setForm((prev) => ({ ...prev, model: "", serviceTag: "" }));
    }
  }, [
    availableModels,
    hasMakeValue,
    modelValue,
    serviceTagValue,
    setForm,
    useDropdowns.model,
  ]);

  useEffect(() => {
    if (!hasModelValue && serviceTagValue) {
      setForm((prev) => ({ ...prev, serviceTag: "" }));
      return;
    }
    if (useDropdowns.category && hasCategoryValue && !categoryOptions.includes(categoryValue.trim())) {
      setForm((prev) => ({ ...prev, category: "", make: "", model: "", serviceTag: "" }));
    }
  }, [categoryOptions, categoryValue, hasCategoryValue, hasModelValue, serviceTagValue, setForm, useDropdowns.category]);

  return (
    <>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Category</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setUseDropdowns({ ...useDropdowns, category: !useDropdowns.category });
            }}
            className="secondary"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            title={useDropdowns.category ? "Type custom" : "Use dropdown"}
            disabled={isCategoryDisabled}
          >
            {useDropdowns.category ? "Type custom" : "Use dropdown"}
          </button>
        </div>
        {useDropdowns.category ? (
          <select
            value={categoryValue}
            onChange={(event) =>
              setForm({ ...form, category: capitalizeFirst(event.target.value) })
            }
            {...requiredProps}
            disabled={isCategoryDisabled}
          >
            <option value="">Select Category...</option>
            {categoryOptions.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        ) : (
          <input
            placeholder={category}
            value={form.category ?? ""}
            onChange={(event) =>
              setForm({ ...form, category: capitalizeFirst(event.target.value) })
            }
            {...requiredProps}
            {...inputLockProps}
          />
        )}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Make</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setUseDropdowns({ ...useDropdowns, make: !useDropdowns.make });
            }}
            className="secondary"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            title={useDropdowns.make ? "Type custom" : "Use dropdown"}
            disabled={isMakeDisabled}
          >
            {useDropdowns.make ? "Type custom" : "Use dropdown"}
          </button>
        </div>
        {useDropdowns.make ? (
          <select
            value={makeValue}
            onChange={(event) =>
              setForm({ ...form, make: event.target.value })
            }
            {...requiredProps}
            disabled={isMakeDisabled}
          >
            <option value="">Select Make...</option>
            {availableMakes.map((makeOption) => (
              <option key={makeOption} value={makeOption}>{makeOption}</option>
            ))}
          </select>
        ) : (
          <input
            placeholder={make}
            value={form.make ?? ""}
            onChange={(event) =>
              setForm({ ...form, make: event.target.value })
            }
            {...requiredProps}
            disabled={isMakeDisabled}
            {...inputLockProps}
          />
        )}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Model</span>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setUseDropdowns({ ...useDropdowns, model: !useDropdowns.model });
            }}
            className="secondary"
            style={{ padding: "4px 8px", fontSize: "11px" }}
            title={useDropdowns.model ? "Type custom" : "Use dropdown"}
            disabled={isModelDisabled}
          >
            {useDropdowns.model ? "Type custom" : "Use dropdown"}
          </button>
        </div>
        {useDropdowns.model ? (
          <select
            value={modelValue}
            onChange={(event) =>
              setForm({ ...form, model: event.target.value })
            }
            {...requiredProps}
            disabled={isModelDisabled}
          >
            <option value="">Select Model...</option>
            {availableModels.map((modelOption) => (
              <option key={modelOption} value={modelOption}>{modelOption}</option>
            ))}
          </select>
        ) : (
          <input
            placeholder={model}
            value={form.model ?? ""}
            onChange={(event) =>
              setForm({ ...form, model: event.target.value })
            }
            {...requiredProps}
            disabled={isModelDisabled}
            {...inputLockProps}
          />
        )}
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Service tag</span>
          {showNotApplicable ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setForm({ ...form, serviceTag: "N/A" });
              }}
              className="secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              disabled={isServiceTagDisabled}
              title="Set service tag to N/A"
            >
              Not applicable
            </button>
          ) : null}
        </div>
        <input
          placeholder={serviceTag}
          value={form.serviceTag ?? ""}
          onChange={(event) =>
            setForm({ ...form, serviceTag: event.target.value })
          }
          {...requiredProps}
          disabled={isServiceTagDisabled}
          {...inputLockProps}
        />
      </div>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Row (optional)</span>
        </div>
        <input
          placeholder={row}
          value={rowValue}
          onChange={(event) =>
            setForm({ ...form, row: event.target.value })
          }
          disabled={isRowAndNoteDisabled}
          {...inputLockProps}
        />
      </div>
      <label>
        Note (optional)
        <input
          placeholder={note}
          value={form.note ?? ""}
          onChange={(event) =>
            setForm({ ...form, note: event.target.value })
          }
          disabled={isRowAndNoteDisabled}
          {...inputLockProps}
        />
      </label>
    </>
  );
}
