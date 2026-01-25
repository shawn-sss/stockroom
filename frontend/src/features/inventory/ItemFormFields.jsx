import { useEffect, useMemo } from "react";
import { getPredefinedMakes, getPredefinedModels } from "../../constants/catalog.js";

export default function ItemFormFields({
  form,
  setForm,
  useDropdowns,
  setUseDropdowns,
  predefinedCategories,
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
    note = "Why / where / anything helpful",
  } = placeholders;

  const categoryValue = form.category ?? "";
  const makeValue = form.make ?? "";
  const modelValue = form.model ?? "";
  const isKnownCategory = predefinedCategories.includes(categoryValue);
  const showNotApplicable = categoryValue && (!isKnownCategory || categoryValue === "Part");
  const requiredProps = required ? { required: true } : {};
  const inputLockProps = disabled
    ? { readOnly: true, "aria-readonly": true, className: "input-locked" }
    : {};
  const availableMakes = useMemo(
    () => (categoryValue ? getPredefinedMakes(categoryValue) : []),
    [categoryValue]
  );
  const availableModels = useMemo(
    () => (categoryValue && makeValue ? getPredefinedModels(categoryValue, makeValue) : []),
    [categoryValue, makeValue]
  );

  useEffect(() => {
    if (!useDropdowns.make) {
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
    if (!useDropdowns.model) {
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
            disabled={disabled}
            title={useDropdowns.category ? "Type custom" : "Use dropdown"}
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
            disabled={disabled}
          >
            <option value="">Select category...</option>
            {predefinedCategories.map((cat) => (
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
            disabled={disabled}
            title={useDropdowns.make ? "Type custom" : "Use dropdown"}
          >
            {useDropdowns.make ? "Type custom" : "Use dropdown"}
          </button>
        </div>
        {useDropdowns.make ? (
          <select
            value={makeValue}
            onChange={(event) =>
              setForm({ ...form, make: capitalizeFirst(event.target.value) })
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
              setForm({ ...form, make: capitalizeFirst(event.target.value) })
            }
            {...requiredProps}
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
            disabled={disabled}
            title={useDropdowns.model ? "Type custom" : "Use dropdown"}
          >
            {useDropdowns.model ? "Type custom" : "Use dropdown"}
          </button>
        </div>
        {useDropdowns.model ? (
          <select
            value={modelValue}
            onChange={(event) =>
              setForm({ ...form, model: capitalizeFirst(event.target.value) })
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
              setForm({ ...form, model: capitalizeFirst(event.target.value) })
            }
            {...requiredProps}
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
          {...inputLockProps}
        />
      </label>
    </>
  );
}
