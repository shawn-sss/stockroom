export const CABLE_CATEGORY = "Cable";

function normalizeCableEndName(value?: string | null) {
  return (value || "").trim().replace(/\s+/g, " ");
}

export function isCableCategory(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === CABLE_CATEGORY.toLowerCase();
}

export function parseCableEnds(value?: string | null) {
  const raw = value ?? "";
  if (raw.trim() === "") {
    return { endA: "", endB: "" };
  }
  const dashIndex = raw.indexOf("-");
  if (dashIndex < 0) {
    return { endA: raw, endB: "" };
  }
  const endA = raw.slice(0, dashIndex);
  const endB = raw.slice(dashIndex + 1);
  return { endA, endB };
}

export function buildCableEnds(endA?: string | null, endB?: string | null) {
  const left = endA ?? "";
  const right = endB ?? "";
  if (left.length > 0 && right.length > 0) {
    return `${left}-${right}`;
  }
  if (left.length > 0) {
    return left;
  }
  if (right.length > 0) {
    return right;
  }
  return "";
}

export function normalizeCableEnds(value?: string | null) {
  const { endA, endB } = parseCableEnds(value);
  const normalizedA = normalizeCableEndName(endA);
  const normalizedB = normalizeCableEndName(endB);
  if (!normalizedA || !normalizedB) {
    return normalizeCableEndName(value);
  }
  const ordered = [normalizedA, normalizedB].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );
  return `${ordered[0]}-${ordered[1]}`;
}

export function hasCompleteCableEnds(value?: string | null) {
  const { endA, endB } = parseCableEnds(value);
  return Boolean((endA || "").trim() && (endB || "").trim());
}

export function formatCableEnds(value?: string | null) {
  const { endA, endB } = parseCableEnds(normalizeCableEnds(value));
  if (endA && endB) {
    return `${endA}-${endB}`;
  }
  return (value || "").trim();
}

export function normalizeCableLength(value?: string | null) {
  const raw = (value || "").trim();
  if (!raw) {
    return "";
  }
  const lower = raw.toLowerCase();
  if (lower.endsWith(" ft")) {
    return `${raw.slice(0, -3).trim()} ft`;
  }
  if (lower.endsWith("ft")) {
    return `${raw.slice(0, -2).trim()} ft`;
  }
  if (/^\d+(\.\d+)?$/.test(raw)) {
    return `${raw} ft`;
  }
  return `${raw} ft`;
}

export function formatCableLength(value?: string | null) {
  return normalizeCableLength(value);
}

export function parseQuantityValue(value: unknown, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  const rounded = Math.floor(numeric);
  return rounded >= 0 ? rounded : fallback;
}
