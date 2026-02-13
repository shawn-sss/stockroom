import {
  DEFAULT_FILTER_CATEGORY,
  DEFAULT_FILTER_STATUS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
} from "../../constants/inventory";

export const ALLOWED_USER_VIEWS = new Set(["view", "create", "reset-password", "logs"]);

export function normalizeHash(value: string) {
  if (!value || value === "#") {
    return "#/inventory";
  }
  return value.startsWith("#") ? value : `#${value}`;
}

export function parseHash(hash: string) {
  const raw = normalizeHash(hash || "");
  const trimmed = raw.replace(/^#/, "");
  const [pathPart, queryPart = ""] = trimmed.split("?");
  const segments = pathPart.split("/").filter(Boolean);
  return { segments, params: new URLSearchParams(queryPart) };
}

type BuildInventoryHashArgs = {
  view: string | null;
  viewId: number | null;
  viewAction: string | null;
  search: string;
  filterStatus: string;
  filterCategory: string;
  hideRetired: boolean;
  sortField: string;
  sortDirection: string;
  pageSize: number;
  page: number;
  userView: string;
};

export function buildInventoryHash({
  view,
  viewId,
  viewAction,
  search,
  filterStatus,
  filterCategory,
  hideRetired,
  sortField,
  sortDirection,
  pageSize,
  page,
  userView,
}: BuildInventoryHashArgs) {
  const segments = ["inventory"];
  if (view === "users") {
    segments.push("users");
  } else if (view === "add") {
    segments.push("add");
  } else if (view === "item" && viewId) {
    segments.push("item", String(viewId));
    if (viewAction) {
      segments.push(viewAction);
    }
  }

  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (filterStatus && filterStatus !== DEFAULT_FILTER_STATUS) params.set("status", filterStatus);
  if (filterCategory && filterCategory !== DEFAULT_FILTER_CATEGORY) params.set("category", filterCategory);
  if (hideRetired) params.set("hideRetired", "1");
  if (sortField && sortField !== DEFAULT_SORT_FIELD) params.set("sort", sortField);
  if (sortDirection && sortDirection !== DEFAULT_SORT_DIRECTION) params.set("dir", sortDirection);
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));
  if (page !== 1) params.set("page", String(page));
  if (userView && view === "users") params.set("view", userView);

  const query = params.toString();
  return `#/${segments.join("/")}${query ? `?${query}` : ""}`;
}
