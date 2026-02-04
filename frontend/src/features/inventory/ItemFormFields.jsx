import { useEffect, useMemo, useRef } from "react";

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
  const userOverrideRef = useRef({ category: false, make: false, model: false });
  const showNotApplicable =
    Boolean(categoryValue) &&
    Boolean(makeValue) &&
    Boolean(modelValue) &&
    categoryValue !== "Desktop" &&
    categoryValue !== "Laptop";
  const hideNotApplicableChip =
    serviceTagValue.trim().toLowerCase() === "n/a";
  const requiredProps = required ? { required: true } : {};
  const inputLockProps = disabled
    ? { readOnly: true, "aria-readonly": true, className: "input-locked" }
    : {};
  const availableMakes = useMemo(() => {
    if (!categoryValue) {
      return [];
    }
    return makeOptionsByCategory[categoryValue] || [];
  }, [categoryValue, makeOptionsByCategory]);
  const availableModels = useMemo(() => {
    if (!categoryValue || !makeValue) {
      return [];
    }
    const modelsByMake = modelOptionsByCategoryMake[categoryValue] || {};
    return modelsByMake[makeValue] || [];
  }, [categoryValue, makeValue, modelOptionsByCategoryMake]);
  const canUseCategoryDropdown = !disabled && categoryOptions.length > 0;
  const canUseMakeDropdown =
    !disabled && Boolean(categoryValue) && availableMakes.length > 0;
  const canUseModelDropdown =
    !disabled && Boolean(categoryValue) && Boolean(makeValue) && availableModels.length > 0;
  const isMakeDisabled = disabled || !categoryValue;
  const isModelDisabled = disabled || !categoryValue || !makeValue;

  useEffect(() => {
    if (!useDropdowns.make) {
      return;
    }
    if (categoryValue && availableMakes.length === 0) {
      setUseDropdowns((prev) => ({ ...prev, make: false }));
      return;
    }
    if (!categoryValue) {
      if (makeValue || modelValue) {
        setForm((prev) => ({ ...prev, make: "", model: "" }));
      }
      return;
    }
    if (makeValue && !availableMakes.includes(makeValue)) {
      setForm((prev) => ({ ...prev, make: "", model: "" }));
    }
  }, [useDropdowns.make, categoryValue, makeValue, modelValue, availableMakes, setForm]);

  useEffect(() => {
    if (useDropdowns.make) {
      return;
    }
    if (
      !userOverrideRef.current.make &&
      !makeValue &&
      categoryValue &&
      availableMakes.length > 0
    ) {
      setUseDropdowns((prev) => ({ ...prev, make: true }));
    }
  }, [useDropdowns.make, makeValue, categoryValue, availableMakes, setUseDropdowns]);

  useEffect(() => {
    if (!useDropdowns.model) {
      return;
    }
    if (categoryValue && makeValue && availableModels.length === 0) {
      setUseDropdowns((prev) => ({ ...prev, model: false }));
      return;
    }
    if (!categoryValue || !makeValue) {
      if (modelValue) {
        setForm((prev) => ({ ...prev, model: "" }));
      }
      return;
    }
    if (modelValue && !availableModels.includes(modelValue)) {
      setForm((prev) => ({ ...prev, model: "" }));
    }
  }, [useDropdowns.model, categoryValue, makeValue, modelValue, availableModels, setForm]);

  useEffect(() => {
    if (useDropdowns.model) {
      return;
    }
    if (
      !userOverrideRef.current.model &&
      !modelValue &&
      categoryValue &&
      makeValue &&
      availableModels.length > 0
    ) {
      setUseDropdowns((prev) => ({ ...prev, model: true }));
    }
  }, [useDropdowns.model, modelValue, categoryValue, makeValue, availableModels, setUseDropdowns]);

  useEffect(() => {
    if (!categoryValue || !makeValue) {
      userOverrideRef.current.model = false;
    }
  }, [categoryValue, makeValue]);

  useEffect(() => {
    if (!isMakeDisabled) {
      return;
    }
    if (!useDropdowns.make) {
      userOverrideRef.current.make = false;
      setUseDropdowns((prev) => ({ ...prev, make: true }));
    }
  }, [isMakeDisabled, useDropdowns.make, setUseDropdowns]);

  useEffect(() => {
    if (!isModelDisabled) {
      return;
    }
    if (!useDropdowns.model) {
      userOverrideRef.current.model = false;
      setUseDropdowns((prev) => ({ ...prev, model: true }));
    }
  }, [isModelDisabled, useDropdowns.model, setUseDropdowns]);

  useEffect(() => {
    if (!useDropdowns.category) {
      return;
    }
    if (categoryOptions.length === 0) {
      setUseDropdowns((prev) => ({ ...prev, category: false }));
    }
  }, [useDropdowns.category, categoryOptions, setUseDropdowns]);

  useEffect(() => {
    if (useDropdowns.category) {
      return;
    }
    if (!userOverrideRef.current.category && !categoryValue && categoryOptions.length > 0) {
      setUseDropdowns((prev) => ({ ...prev, category: true }));
    }
  }, [useDropdowns.category, categoryValue, categoryOptions, setUseDropdowns]);

  return (
    <>
      <div style={{ display: "grid", gap: 6 }}>
        <div className="field-header">
          <span>Category</span>
          {canUseCategoryDropdown ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                userOverrideRef.current.category = true;
                setUseDropdowns({ ...useDropdowns, category: !useDropdowns.category });
              }}
              className="secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              title={useDropdowns.category ? "Type custom" : "Use dropdown"}
            >
              {useDropdowns.category ? "Type custom" : "Use dropdown"}
            </button>
          ) : null}
        </div>
        {useDropdowns.category ? (
          <select
            value={categoryValue}
            onChange={(event) =>
              setForm({ ...form, category: capitalizeFirst(event.target.value) })
            }
            {...requiredProps}
            disabled={disabled}
          >
            <option value="">Select category...</option>
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
          {canUseMakeDropdown ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                userOverrideRef.current.make = true;
                setUseDropdowns({ ...useDropdowns, make: !useDropdowns.make });
              }}
              className="secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              title={useDropdowns.make ? "Type custom" : "Use dropdown"}
            >
              {useDropdowns.make ? "Type custom" : "Use dropdown"}
            </button>
          ) : null}
        </div>
        {useDropdowns.make ? (
          <select
            value={makeValue}
            onChange={(event) =>
              setForm({ ...form, make: event.target.value })
            }
            {...requiredProps}
            disabled={disabled || !categoryValue}
          >
            <option value="">Select make...</option>
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
          {canUseModelDropdown ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                userOverrideRef.current.model = true;
                setUseDropdowns({ ...useDropdowns, model: !useDropdowns.model });
              }}
              className="secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              title={useDropdowns.model ? "Type custom" : "Use dropdown"}
            >
              {useDropdowns.model ? "Type custom" : "Use dropdown"}
            </button>
          ) : null}
        </div>
        {useDropdowns.model ? (
          <select
            value={modelValue}
            onChange={(event) =>
              setForm({ ...form, model: event.target.value })
            }
            {...requiredProps}
            disabled={disabled || !categoryValue || !makeValue}
          >
            <option value="">Select model...</option>
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
          {showNotApplicable && !hideNotApplicableChip ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setForm({ ...form, serviceTag: "N/A" });
              }}
              className="secondary"
              style={{ padding: "4px 8px", fontSize: "11px" }}
              disabled={disabled}
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
          disabled={disabled || !categoryValue || !makeValue || !modelValue}
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
          disabled={disabled || !categoryValue || !makeValue || !modelValue}
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
          disabled={disabled || !categoryValue || !makeValue || !modelValue}
          {...inputLockProps}
        />
      </label>
    </>
  );
}
