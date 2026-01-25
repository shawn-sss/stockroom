export function parseIsoTimestamp(iso) {
  if (!iso) return null;
  const normalized = /Z$|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function getSortableTime(iso) {
  const date = parseIsoTimestamp(iso);
  return date ? date.getTime() : 0;
}

export function formatDate(iso) {
  if (!iso) return "";
  const date = parseIsoTimestamp(iso);
  if (!date) return iso;
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function capitalizeFirst(value) {
  if (!value) {
    return value;
  }
  return value[0].toUpperCase() + value.slice(1);
}

export function capitalizeWords(value) {
  if (!value) {
    return value;
  }
  return value
    .trim()
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}
