import { useEffect, useMemo, useRef, useState } from "react";
import { apiRequest, getApiErrorMessage } from "../../api/client.js";
import {
  capitalizeWords,
  formatDate,
  getSortableTime,
} from "../../utils/formatters.js";
import {
  STATUS_DEPLOYED,
  STATUS_IN_STOCK,
  STATUS_RETIRED,
} from "../../constants/status.js";
import {
  DEFAULT_FILTER_CATEGORY,
  DEFAULT_FILTER_STATUS,
  DEFAULT_PAGE_SIZE,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
} from "../../constants/inventory.js";

const emptyItemForm = {
  category: "",
  make: "",
  model: "",
  serviceTag: "",
  row: "",
  note: "",
};
const createItemForm = () => ({ ...emptyItemForm });
const createQuickActionForm = () => ({ assignedUser: "", note: "" });
const createDropdownState = () => ({ category: true, make: true, model: true });
const createRetireForm = () => ({ note: "" });

const hasRequiredItemFields = (form) =>
  Boolean(
    form?.category?.trim() &&
      form?.make?.trim() &&
      form?.model?.trim() &&
      form?.serviceTag?.trim()
  );

const buildItemActionPath = (itemId, action) => {
  const normalizedId = Number(itemId);
  if (!Number.isFinite(normalizedId)) {
    throw new Error("Invalid item id");
  }
  if (!["deploy", "return", "retire", "restore"].includes(action)) {
    throw new Error("Invalid item action");
  }
  return `/items/${normalizedId}/${action}`;
};

export default function useInventory({
  token,
  username,
  setError,
  setNotice,
  setBusy,
}) {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [allItems, setAllItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [history, setHistory] = useState([]);
  const [addForm, setAddForm] = useState(createItemForm);
  const [editForm, setEditForm] = useState(createItemForm);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [quickActionItem, setQuickActionItem] = useState(null);
  const [quickActionForm, setQuickActionForm] = useState(createQuickActionForm);
  const [filterStatus, setFilterStatus] = useState(DEFAULT_FILTER_STATUS);
  const [filterCategory, setFilterCategory] = useState(DEFAULT_FILTER_CATEGORY);
  const [sortField, setSortField] = useState(DEFAULT_SORT_FIELD);
  const [sortDirection, setSortDirection] = useState(DEFAULT_SORT_DIRECTION);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [page, setPage] = useState(1);
  const [useDropdowns, setUseDropdowns] = useState(createDropdownState);
  const [useEditDropdowns, setUseEditDropdowns] = useState(createDropdownState);
  const [editUnlocked, setEditUnlocked] = useState(false);
  const [historySortDirection, setHistorySortDirection] = useState("desc");
  const itemModalMouseDown = useRef(false);
  const prefsLoadedForUser = useRef(null);
  const [retireItem, setRetireItem] = useState(null);
  const [retireForm, setRetireForm] = useState(createRetireForm);

  const getApiFailure = async (res, fallbackMessage) => {
    let data = null;
    try {
      data = await res.json();
    } catch (err) {
      data = null;
    }
    return getApiErrorMessage(data, fallbackMessage);
  };

  const runBusyAction = async (action) => {
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(err.message || "Unexpected error");
    } finally {
      setBusy(false);
    }
  };

  const getStatusBadgeClass = (status) => {
    if (status === STATUS_IN_STOCK) {
      return "success";
    }
    if (status === STATUS_RETIRED) {
      return "danger";
    }
    return "warning";
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];

    if (filterStatus !== "all") {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    if (filterCategory !== "all") {
      filtered = filtered.filter(item => item.category === filterCategory);
    }

    filtered.sort((a, b) => {
      let timeA, timeB;
      if (sortField === "updated") {
        timeA = getSortableTime(a.updated_at || a.created_at);
        timeB = getSortableTime(b.updated_at || b.created_at);
      } else {
        timeA = getSortableTime(a.created_at);
        timeB = getSortableTime(b.created_at);
      }
      return sortDirection === "desc"
        ? timeB - timeA
        : timeA - timeB;
    });

    return filtered;
  }, [items, filterStatus, filterCategory, sortField, sortDirection]);

  const totalItems = filteredAndSortedItems.length;
  const totalPages = pageSize === 0 ? 1 : Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = pageSize === 0 ? 1 : Math.min(page, totalPages);
  const startIndex = pageSize === 0 ? 0 : (safePage - 1) * pageSize;
  const endIndex = pageSize === 0 ? totalItems : Math.min(startIndex + pageSize, totalItems);
  const pagedItems = filteredAndSortedItems.slice(startIndex, endIndex);

  useEffect(() => {
    setPage(1);
  }, [filterStatus, filterCategory, sortField, sortDirection, search]);

  useEffect(() => {
    if (pageSize === 0 && page !== 1) {
      setPage(1);
      return;
    }
    if (pageSize !== 0 && page > totalPages) {
      setPage(totalPages);
    }
  }, [page, pageSize, totalPages]);

  const uniqueCategories = useMemo(() => {
    const categories = new Set();
    allItems.forEach((item) => {
      const rawCategory = typeof item.category === "string" ? item.category.trim() : "";
      if (rawCategory) {
        categories.add(rawCategory);
      }
    });
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    allItems.forEach((item) => {
      if (item.status) {
        statuses.add(item.status);
      }
    });
    return [...statuses].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const formCategoryOptions = useMemo(() => {
    const categories = new Set();
    allItems.forEach((item) => {
      const rawCategory = typeof item.category === "string" ? item.category.trim() : "";
      if (rawCategory) {
        categories.add(rawCategory);
      }
    });
    return [...categories].sort((a, b) => a.localeCompare(b));
  }, [allItems]);

  const formMakeOptionsByCategory = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => {
      const rawCategory = typeof item.category === "string" ? item.category.trim() : "";
      const rawMake = typeof item.make === "string" ? item.make.trim() : "";
      if (!rawCategory || !rawMake) {
        return;
      }
      if (!map.has(rawCategory)) {
        map.set(rawCategory, new Set());
      }
      map.get(rawCategory).add(rawMake);
    });
    const result = {};
    map.forEach((makes, category) => {
      result[category] = [...makes].sort((a, b) => a.localeCompare(b));
    });
    return result;
  }, [allItems]);

  const formModelOptionsByCategoryMake = useMemo(() => {
    const map = new Map();
    allItems.forEach((item) => {
      const rawCategory = typeof item.category === "string" ? item.category.trim() : "";
      const rawMake = typeof item.make === "string" ? item.make.trim() : "";
      const rawModel = typeof item.model === "string" ? item.model.trim() : "";
      if (!rawCategory || !rawMake || !rawModel) {
        return;
      }
      if (!map.has(rawCategory)) {
        map.set(rawCategory, new Map());
      }
      const makesMap = map.get(rawCategory);
      if (!makesMap.has(rawMake)) {
        makesMap.set(rawMake, new Set());
      }
      makesMap.get(rawMake).add(rawModel);
    });
    const result = {};
    map.forEach((makesMap, category) => {
      const makesResult = {};
      makesMap.forEach((models, make) => {
        makesResult[make] = [...models].sort((a, b) => a.localeCompare(b));
      });
      result[category] = makesResult;
    });
    return result;
  }, [allItems]);

  useEffect(() => {
    if (!username) {
      prefsLoadedForUser.current = null;
      return;
    }
    if (prefsLoadedForUser.current === username) {
      return;
    }
    const storageKey = `stockroom:inventory-preferences:${username}`;
    let prefs = {};
    try {
      const raw = localStorage.getItem(storageKey);
      prefs = raw ? JSON.parse(raw) : {};
    } catch (err) {
      prefs = {};
    }
    const validSortFields = new Set(["created", "updated"]);
    const validSortDirections = new Set(["asc", "desc"]);
    const validStatuses = new Set([DEFAULT_FILTER_STATUS, ...uniqueStatuses]);
    const validPageSizes = new Set([10, 20, 50, 100, 200, 0]);
    const validCategories = new Set([DEFAULT_FILTER_CATEGORY, ...uniqueCategories]);
    const nextSortField = validSortFields.has(prefs.sortField)
      ? prefs.sortField
      : DEFAULT_SORT_FIELD;
    const nextSortDirection = validSortDirections.has(prefs.sortDirection)
      ? prefs.sortDirection
      : DEFAULT_SORT_DIRECTION;
    const nextFilterStatus = validStatuses.has(prefs.filterStatus)
      ? prefs.filterStatus
      : DEFAULT_FILTER_STATUS;
    const nextFilterCategory = validCategories.has(prefs.filterCategory)
      ? prefs.filterCategory
      : DEFAULT_FILTER_CATEGORY;
    const nextPageSize = validPageSizes.has(prefs.pageSize)
      ? prefs.pageSize
      : DEFAULT_PAGE_SIZE;
    setSortField(nextSortField);
    setSortDirection(nextSortDirection);
    setFilterStatus(nextFilterStatus);
    setFilterCategory(nextFilterCategory);
    setPageSize(nextPageSize);
    prefsLoadedForUser.current = username;
  }, [username, uniqueCategories, uniqueStatuses]);

  useEffect(() => {
    if (!username) {
      return;
    }
    const storageKey = `stockroom:inventory-preferences:${username}`;
    const payload = {
      sortField,
      sortDirection,
      filterStatus,
      filterCategory,
      pageSize,
    };
    localStorage.setItem(storageKey, JSON.stringify(payload));
  }, [username, sortField, sortDirection, filterStatus, filterCategory, pageSize]);

  useEffect(() => {
    if (filterCategory !== DEFAULT_FILTER_CATEGORY && !uniqueCategories.includes(filterCategory)) {
      setFilterCategory(DEFAULT_FILTER_CATEGORY);
    }
  }, [filterCategory, uniqueCategories]);

  const categoryCounts = useMemo(() => {
    const counts = new Map();
    allItems.forEach((item) => {
      const rawCategory = typeof item.category === "string" ? item.category.trim() : "";
      const category = rawCategory || "Uncategorized";
      const current = counts.get(category) || { count: 0, inStock: 0, deployed: 0, retired: 0 };
      const next = {
        count: current.count + 1,
        inStock: current.inStock + (item.status === STATUS_IN_STOCK ? 1 : 0),
        deployed: current.deployed + (item.status === STATUS_DEPLOYED ? 1 : 0),
        retired: current.retired + (item.status === STATUS_RETIRED ? 1 : 0),
      };
      counts.set(category, next);
    });
    return [...counts.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([category, summary]) => ({
      category,
      count: summary.count,
      inStock: summary.inStock,
      deployed: summary.deployed,
      retired: summary.retired,
      }));
  }, [allItems]);

  useEffect(() => {
    if (retireItem && selectedItem && retireItem.id === selectedItem.id && retireItem !== selectedItem) {
      setRetireItem(selectedItem);
    }
  }, [retireItem, selectedItem]);

  const loadItems = async (activeToken = token, query = "") => {
    const queryString = query ? `?q=${encodeURIComponent(query)}` : "";
    const res = await apiRequest(`/items${queryString}`, {}, activeToken);
    if (!res.ok) {
      setError("Failed to load inventory");
      return;
    }
    const data = await res.json();
    setError("");
    setItems(data.items || []);
  };

  const loadAllItems = async (activeToken = token) => {
    const res = await apiRequest("/items", {}, activeToken);
    if (!res.ok) {
      setError("Failed to load inventory totals");
      return;
    }
    const data = await res.json();
    setError("");
    setAllItems(data.items || []);
  };

  const loadItemDetail = async (itemId) => {
    const res = await apiRequest(`/items/${itemId}`, {}, token);
    if (!res.ok) {
      setError("Failed to load item");
      return null;
    }
    const data = await res.json();
    setError("");
    setSelectedItem(data.item);
    setHistory(data.history || []);
    setEditForm({
      category: data.item.category,
      make: data.item.make,
      model: data.item.model,
      serviceTag: data.item.service_tag,
      row: data.item.row ?? "",
      note: "",
    });
    setEditUnlocked(false);
    const categoryOptions = formCategoryOptions;
    const makeOptions = formMakeOptionsByCategory[data.item.category] || [];
    const modelOptions =
      (formModelOptionsByCategoryMake[data.item.category] || {})[data.item.make] || [];
    setUseEditDropdowns({
      category: categoryOptions.includes(data.item.category),
      make: makeOptions.includes(data.item.make),
      model: modelOptions.includes(data.item.model),
    });
    return data.item;
  };

  useEffect(() => {
    if (!token) {
      return;
    }
    loadItems(token, search.trim());
    loadAllItems(token);
  }, [token]);

  useEffect(() => {
    if (!token) {
      return;
    }
    const term = search.trim();
    const handle = window.setTimeout(() => {
      loadItems(token, term);
    }, 300);
    return () => window.clearTimeout(handle);
  }, [search, token]);

  const handleSearchSubmit = async (event) => {
    event.preventDefault();
    await loadItems(token, search.trim());
  };

  const handleAddSubmit = async (event) => {
    event.preventDefault();
    if (!hasRequiredItemFields(addForm)) {
      return;
    }
    await runBusyAction(async () => {
      const res = await apiRequest(
        "/items",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: capitalizeWords(addForm.category),
            make: addForm.make,
            model: addForm.model,
            service_tag: addForm.serviceTag,
            row: addForm.row || null,
            note: addForm.note || null,
          }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to add item"));
      }
      const data = await res.json();
      await loadItems(token, search.trim());
      await loadAllItems(token);
      setAddForm(createItemForm());
      setUseDropdowns(createDropdownState());
      setSelectedId(data.item.id);
      await loadItemDetail(data.item.id);
      setShowAddModal(false);
      setNotice("Item added");
    });
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!selectedId) {
      return;
    }
    if (!hasRequiredItemFields(editForm)) {
      return;
    }
    await runBusyAction(async () => {
      const res = await apiRequest(
        `/items/${selectedId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: capitalizeWords(editForm.category),
            make: editForm.make,
            model: editForm.model,
            service_tag: editForm.serviceTag,
            row: editForm.row || null,
            note: editForm.note || null,
          }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to update item"));
      }
      await loadItems(token, search.trim());
      await loadAllItems(token);
      await loadItemDetail(selectedId);
      setNotice("Edits saved");
    });
  };

  const handleRetireSubmit = async (event) => {
    event.preventDefault();
    if (!retireItem) {
      return;
    }
    await runBusyAction(async () => {
      const isRetired = retireItem.status === STATUS_RETIRED;
      const endpoint = isRetired ? "restore" : "retire";
      let path;
      try {
        path = buildItemActionPath(retireItem.id, endpoint);
      } catch (err) {
        throw new Error(err.message);
      }
      const res = await apiRequest(
        path,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note: retireForm.note || null }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to update status"));
      }
      await loadItems(token, search.trim());
      await loadAllItems(token);
      if (selectedId === retireItem.id) {
        await loadItemDetail(retireItem.id);
      }
      setRetireItem(null);
      setRetireForm(createRetireForm());
      setNotice(isRetired ? "Item restored" : "Item retired");
    });
  };

  const handleQuickActionSubmit = async (event) => {
    event.preventDefault();
    if (!quickActionItem) {
      return;
    }
    await runBusyAction(async () => {
      if (quickActionItem.status === STATUS_DEPLOYED) {
        const res = await apiRequest(
          `/items/${quickActionItem.id}/return`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ note: quickActionForm.note || null }),
          },
          token
        );
        if (!res.ok) {
          throw new Error(await getApiFailure(res, "Failed to return item"));
        }
        setNotice("Item returned to stock");
      } else {
        const res = await apiRequest(
          `/items/${quickActionItem.id}/deploy`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              assigned_user: capitalizeWords(quickActionForm.assignedUser),
              note: quickActionForm.note || null,
            }),
          },
          token
        );
        if (!res.ok) {
          throw new Error(await getApiFailure(res, "Failed to deploy item"));
        }
        setNotice("Item marked as deployed");
      }
      await loadItems(token, search.trim());
      await loadAllItems(token);
      if (selectedId === quickActionItem.id) {
        await loadItemDetail(quickActionItem.id);
      }
      setQuickActionItem(null);
      setQuickActionForm(createQuickActionForm());
    });
  };

  const selectedHistory = useMemo(() => {
    const labels = {
      category: "Category",
      make: "Make",
      model: "Model",
      service_tag: "Service tag",
      row: "Row",
      status: "Status",
      assigned_user: "Assigned user",
    };
    const normalizeHistoryValue = (value) => {
      if (value === null || value === undefined) {
        return "";
      }
      return String(value);
    };
    const fmt = (value) => (normalizeHistoryValue(value) === "" ? "-" : String(value));
    const formatted = history.map((event) => {
      const changes = event.changes || {};
      const changeLines = Object.keys(changes)
        .map((key) => {
          const entry = changes[key];
          if (normalizeHistoryValue(entry.old) === normalizeHistoryValue(entry.new)) {
            return null;
          }
          const label = labels[key] || key;
          return `${label}: ${fmt(entry.old)} -> ${fmt(entry.new)}`;
        })
        .filter(Boolean);
      return { ...event, changeLines, prettyTimestamp: formatDate(event.timestamp) };
    });
    return formatted.sort((a, b) => {
      const delta = getSortableTime(b.timestamp) - getSortableTime(a.timestamp);
      return historySortDirection === "desc" ? delta : -delta;
    });
  }, [history, historySortDirection]);

  const editHasChanges = useMemo(() => {
    if (!selectedItem) {
      return false;
    }
    const hasItemChanges =
      editForm.category !== selectedItem.category ||
      editForm.make !== selectedItem.make ||
      editForm.model !== selectedItem.model ||
      editForm.serviceTag !== selectedItem.service_tag ||
      editForm.row !== (selectedItem.row ?? "");
    const hasNote = Boolean(editForm.note && editForm.note.trim());
    return hasItemChanges || hasNote;
  }, [editForm, selectedItem]);

  const editIsValid = useMemo(() => hasRequiredItemFields(editForm), [editForm]);

  const resetSelectedItemState = () => {
    setSelectedId(null);
    setSelectedItem(null);
    setHistory([]);
    setEditUnlocked(false);
    setRetireItem(null);
    setRetireForm(createRetireForm());
  };

  const closeItemModal = () => {
    setShowItemModal(false);
    resetSelectedItemState();
  };

  const closeAddModal = () => {
    setShowAddModal(false);
    setAddForm(createItemForm());
    setUseDropdowns(createDropdownState());
  };

  const resetInventoryState = () => {
    setItems([]);
    setAllItems([]);
    setSearch("");
    setSelectedId(null);
    setSelectedItem(null);
    setHistory([]);
    setAddForm(createItemForm());
    setEditForm(createItemForm());
    setShowAddModal(false);
    setShowItemModal(false);
    setQuickActionItem(null);
    setQuickActionForm(createQuickActionForm());
    setFilterStatus(DEFAULT_FILTER_STATUS);
    setFilterCategory(DEFAULT_FILTER_CATEGORY);
    setSortField(DEFAULT_SORT_FIELD);
    setSortDirection(DEFAULT_SORT_DIRECTION);
    setPageSize(DEFAULT_PAGE_SIZE);
    setPage(1);
    setUseDropdowns(createDropdownState());
    setUseEditDropdowns(createDropdownState());
    setEditUnlocked(false);
    setHistorySortDirection("desc");
    setRetireItem(null);
    setRetireForm(createRetireForm());
  };

  return {
    state: {
      items,
      search,
      selectedId,
      selectedItem,
      history,
      addForm,
      editForm,
      showAddModal,
      showItemModal,
      quickActionItem,
      quickActionForm,
      filterStatus,
      filterCategory,
      sortField,
      sortDirection,
      pageSize,
      page,
      useDropdowns,
      useEditDropdowns,
      editUnlocked,
      historySortDirection,
      retireItem,
      retireForm,
    },
    derived: {
      filteredAndSortedItems,
      totalItems,
      totalPages,
      safePage,
      startIndex,
      endIndex,
      pagedItems,
      uniqueCategories,
      uniqueStatuses,
      formCategoryOptions,
      formMakeOptionsByCategory,
      formModelOptionsByCategoryMake,
      categoryCounts,
      selectedHistory,
      editHasChanges,
      editIsValid,
    },
    actions: {
      setSearch,
      setSelectedId,
      setAddForm,
      setEditForm,
      setShowAddModal,
      setShowItemModal,
      setQuickActionItem,
      setQuickActionForm,
      setFilterStatus,
      setFilterCategory,
      setSortField,
      setSortDirection,
      setPageSize,
      setPage,
      setUseDropdowns,
      setUseEditDropdowns,
      setEditUnlocked,
      setHistorySortDirection,
      setRetireItem,
      setRetireForm,
      handleSearchSubmit,
      handleAddSubmit,
      handleEditSubmit,
      handleRetireSubmit,
      handleQuickActionSubmit,
      closeItemModal,
      closeAddModal,
      loadItemDetail,
      resetInventoryState,
    },
    refs: {
      itemModalMouseDown,
    },
    helpers: {
      getStatusBadgeClass,
    },
    constants: {
      createQuickActionForm,
    },
  };
}
