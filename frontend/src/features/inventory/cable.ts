export const CABLE_CATEGORY = "Cable";

export function isCableCategory(value?: string | null) {
  const normalized = (value || "").trim().toLowerCase();
  return normalized === CABLE_CATEGORY.toLowerCase();
}

export function parseCableEnds(value?: string | null) {
  const normalized = (value || "").trim();
  if (!normalized) {
    return { endA: "", endB: "" };
  }
  const dashIndex = normalized.indexOf("-");
  if (dashIndex < 0) {
    return { endA: normalized, endB: "" };
  }
  const endA = normalized.slice(0, dashIndex).trim();
  const endB = normalized.slice(dashIndex + 1).trim();
  return { endA, endB };
}

export function buildCableEnds(endA?: string | null, endB?: string | null) {
  const left = (endA || "").trim();
  const right = (endB || "").trim();
  if (left && right) {
    return `${left}-${right}`;
  }
  if (left) {
    return left;
  }
  if (right) {
    return right;
  }
  return "";
}

export function normalizeCableEnds(value?: string | null) {
  const { endA, endB } = parseCableEnds(value);
  if (!endA || !endB) {
    return (value || "").trim();
  }
  const ordered = [endA, endB].sort((left, right) =>
    left.localeCompare(right, undefined, { sensitivity: "base" })
  );
  return `${ordered[0]}-${ordered[1]}`;
}

export function hasCompleteCableEnds(value?: string | null) {
  const { endA, endB } = parseCableEnds(value);
  return Boolean(endA && endB);
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
