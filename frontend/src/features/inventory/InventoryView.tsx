import { useMemo, useState } from "react";
import {
  capitalizeFirst,
  formatDate,
} from "../../utils/formatters";
import {
  STATUS_DEPLOYED,
  STATUS_IN_STOCK,
  STATUS_RETIRED,
} from "../../constants/status";
import AddItemModal from "./AddItemModal";
import CableOverviewModal from "./CableOverviewModal";
import ItemFormFields from "./ItemFormFields";
import QuickActionModal from "./QuickActionModal";
import RetireItemModal from "./RetireItemModal";
import SetCableQuantityModal from "./SetCableQuantityModal";
import { formatCableEnds, formatCableLength, isCableCategory, parseQuantityValue } from "./cable";

export default function InventoryView({
  username,
  role,
  loading,
  notice,
  error,
  busy,
  onLogout,
  onOpenUserManagement,
  inventory,
}) {
  const {
    state,
    derived,
    actions,
    refs,
    helpers,
    constants,
  } = inventory;
  const {
    search,
    selectedId,
    selectedItem,
    addForm,
    editForm,
    showAddModal,
    showItemModal,
    quickActionItem,
    quickActionForm,
    filterStatus,
    filterCategory,
    hideRetired,
    sortField,
    sortDirection,
    pageSize,
    useDropdowns,
    useEditDropdowns,
    editUnlocked,
    historySortDirection,
    retireItem,
    retireForm,
    showCableModal,
    cableCategory,
    cableSummaryItems,
    cableSummaryHistory,
  } = state;
  const {
    filteredAndSortedItems,
    totalItems,
    totalPages,
    safePage,
    startIndex,
    endIndex,
    pagedItems,
    uniqueCategories,
    uniqueStatuses,
    hasRetiredItems,
    formCategoryOptions,
    formMakeOptionsByCategory,
    formModelOptionsByCategoryMake,
    categoryCounts,
    selectedHistory,
    editHasChanges,
    editIsValid,
  } = derived;
  const {
    setSearch,
    setSelectedId,
    setShowAddModal,
    setShowItemModal,
    setQuickActionItem,
    setQuickActionForm,
    setFilterStatus,
    setFilterCategory,
    setHideRetired,
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
    setAddForm,
    setEditForm,
    handleSearchSubmit,
    handleAddSubmit,
    handleEditSubmit,
    handleRetireSubmit,
    handleQuickActionSubmit,
    closeItemModal,
    closeAddModal,
    loadItemDetail,
    openCableModal,
    closeCableModal,
    adjustCableQuantity,
    applyCableQuantityChange,
  } = actions;

  const isNewestFirst = useMemo(
    () => sortDirection === "desc",
    [sortDirection]
  );
  const [setCableItem, setSetCableItem] = useState(null);
  const [setCableForm, setSetCableForm] = useState({
    operation: "set",
    quantity: "",
    note: "",
  });

  return (
    <div className="app-shell">
      <style>{`
        :root {
          --bg: #ffffff;
          --surface: #f4fbff;
          --card: #f7fcff;
          --panel: #f1f9ff;
          --border: rgba(3, 98, 165, 0.22);
          --text: #0b2f4a;
          --muted: rgba(11, 47, 74, 0.84);
          --primary: var(--color-blue-bell);
          --primary-2: var(--color-baltic-blue);
          --accent: var(--color-sky-blue);
          --surface-soft: rgba(112, 189, 225, 0.18);
          --field-bg: #ffffff;
          --field-disabled-bg: #eaf2f8;
          --field-disabled-text: #47637b;
          --danger: #ef4444;
          --success: #22c55e;
          --warning: #f59e0b;
        }

        * { box-sizing: border-box; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: radial-gradient(1100px 600px at 6% 0%, rgba(112, 189, 225, 0.24), transparent 60%), radial-gradient(900px 520px at 96% 12%, rgba(5, 151, 208, 0.15), transparent 64%), var(--bg); color: var(--text); min-height: 100vh; background-attachment: fixed; }
        a { color: inherit; }

        .app-shell { max-width: 1160px; margin: 0 auto; padding: clamp(16px, 3vw, 24px); }
        .topbar { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
        .title { margin: 0; font-size: 28px; letter-spacing: 0.2px; }
        .subtitle { margin: 6px 0 0; color: var(--muted); font-size: 13px; }

        .layout { display: grid; grid-template-columns: 340px 1fr; gap: 20px; margin-top: 18px; align-items: start; }
        @media (max-width: 980px) {
          .layout { grid-template-columns: 1fr; }
          .side-stack { position: static; }
        }

        .side-stack {
          display: grid;
          gap: 16px;
          align-content: start;
          position: sticky;
          top: 24px;
        }

        .search-panel {
          position: static;
        }

        .panel {
          background: linear-gradient(170deg, rgba(255, 255, 255, 0.95), rgba(112, 189, 225, 0.1));
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 16px 34px rgba(3, 98, 165, 0.14);
          backdrop-filter: blur(10px);
        }
        .stack { display: grid; gap: 12px; }
        .list { display: grid; gap: 10px; }
        .muted { color: var(--muted); font-size: 12px; }
        .meta-stack { display: grid; gap: 4px; margin-top: 4px; }
        .meta-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .meta-line { font-size: 12px; line-height: 1.3; color: var(--muted); }
        .item-card, .meta-line, .muted { overflow-wrap: anywhere; word-break: break-word; }

        .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .modal-header { align-items: flex-start; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .filter-row { align-items: flex-start; }
        .filter-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; min-height: 22px; }
        .filter-label .muted { color: #24506f; }
        .filter-label .label-spacer { width: 28px; height: 22px; }
        .filter-toggle { padding: 4px 8px; font-size: 14px; line-height: 1; }
        .filter-select { padding: 8px 12px; min-height: 38px; }

        .item-card {
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.9);
          padding: 12px;
          border-radius: 14px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }
        .item-card:hover { transform: translateY(-1px); background: rgba(112, 189, 225, 0.15); }
        .item-card.active { border-color: rgba(112, 189, 225, 0.78); box-shadow: 0 0 0 3px rgba(5, 151, 208, 0.22); }

        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); background: rgba(112, 189, 225, 0.15); }
        .badge.success { border-color: rgba(34,197,94,0.35); background: rgba(34,197,94,0.12); }
        .badge.warning { border-color: rgba(245,158,11,0.35); background: rgba(245,158,11,0.12); }
        .badge.danger { border-color: rgba(239,68,68,0.35); background: rgba(239,68,68,0.12); }

        .category-count-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }
        .category-count-card {
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 12px;
          background: radial-gradient(120px 80px at 10% 0%, rgba(112, 189, 225, 0.24), rgba(255,255,255,0.9));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.75);
        }
        .category-count-card.clickable {
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, box-shadow 120ms ease;
        }
        .category-count-card.clickable:hover {
          transform: translateY(-1px);
          border-color: rgba(112, 189, 225, 0.78);
        }
        .category-count-card.active {
          border-color: rgba(112, 189, 225, 0.9);
          box-shadow: 0 0 0 2px rgba(5, 151, 208, 0.22), inset 0 0 0 1px rgba(255,255,255,0.75);
        }
        .category-count-number { font-size: 24px; font-weight: 700; letter-spacing: 0.3px; }
        .category-count-name {
          margin-top: 4px;
          font-size: 12px;
          color: var(--muted);
          text-transform: uppercase;
          letter-spacing: 0.6px;
        }
        .category-count-meta {
          margin-top: 6px;
          font-size: 12px;
          color: var(--muted);
        }

        .form-grid { display: grid; gap: 10px; }
        .field-header { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .compact-form { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
        .compact-form .span-2 { grid-column: span 2; }
        .compact-form .field-header { display: flex; align-items: center; justify-content: space-between; }
        .compact-form textarea { min-height: 90px; }
        @media (max-width: 720px) {
          .compact-form { grid-template-columns: 1fr; }
          .compact-form .span-2 { grid-column: auto; }
        }
        label { display: grid; gap: 6px; }
        input:not([type="checkbox"]), textarea, select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid var(--border);
          background: var(--field-bg);
          color: var(--text);
          font: inherit;
          outline: none;
        }
        input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
        input::placeholder, textarea::placeholder { color: rgba(11, 47, 74, 0.62); }
        input:-webkit-autofill,
        input:-webkit-autofill:hover,
        input:-webkit-autofill:focus,
        textarea:-webkit-autofill,
        textarea:-webkit-autofill:hover,
        textarea:-webkit-autofill:focus,
        select:-webkit-autofill,
        select:-webkit-autofill:hover,
        select:-webkit-autofill:focus {
          -webkit-text-fill-color: var(--text);
          -webkit-box-shadow: 0 0 0px 1000px var(--field-bg) inset;
          box-shadow: 0 0 0px 1000px var(--field-bg) inset;
          transition: background-color 9999s ease-in-out 0s;
        }
        input:not([type="checkbox"]):focus, textarea:focus, select:focus { border-color: rgba(112, 189, 225, 0.82); box-shadow: 0 0 0 3px rgba(5, 151, 208, 0.2); }
        input.input-locked,
        input:disabled,
        textarea:disabled,
        select:disabled {
          color: var(--field-disabled-text);
          background: var(--field-disabled-bg);
          border-color: rgba(3, 98, 165, 0.22);
          opacity: 1;
          cursor: not-allowed;
        }
        button {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(3,98,165,0.24);
          background: linear-gradient(180deg, var(--primary), var(--primary-2));
          color: white;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          word-break: normal;
          overflow-wrap: normal;
          transition: filter 120ms ease, transform 120ms ease;
        }
        button:hover { filter: brightness(1.05); transform: translateY(-1px); }
        button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        button.secondary { background: linear-gradient(180deg, #ffffff, #edf6fd); color: #1f4e70; border-color: rgba(3, 98, 165, 0.3); }
        button.danger { background: linear-gradient(180deg, var(--danger), #b91c1c); }

        .notice {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(112, 189, 225, 0.65);
          background: rgba(5, 151, 208, 0.92);
          color: #ffffff;
        }
        .error {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(248, 113, 113, 0.55);
          background: rgba(220, 38, 38, 0.92);
          color: #ffffff;
        }
        .toast-stack {
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 40;
          display: grid;
          gap: 8px;
          max-width: min(360px, calc(100vw - 32px));
        }
        .toast-stack .notice,
        .toast-stack .error {
          margin: 0;
          box-shadow: 0 18px 36px rgba(0,0,0,0.35);
          backdrop-filter: blur(6px);
        }

        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(8, 30, 46, 0.72);
          backdrop-filter: blur(2px);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(16px, 4vw, 48px);
          z-index: 20;
        }
        .modal {
          width: min(900px, calc(100vw - 24px));
          background: linear-gradient(170deg, #ffffff, #f3faff);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 24px 52px rgba(3,98,165,0.2);
          overflow: hidden;
        }
        .modal-scroll-body {
          max-height: calc(100vh - 96px);
          overflow: auto;
          padding: 16px 12px 16px 16px;
        }
        .modal-narrow {
          width: min(640px, 100%);
        }
        .modal-grid { display: grid; grid-template-columns: 3fr 2fr; gap: 14px; align-items: start; }
        .user-modal-grid { grid-template-columns: 1fr 3fr; }
        @media (max-width: 900px) { .modal-grid { grid-template-columns: 1fr; } }
        .divider { height: 1px; background: var(--border); margin: 10px 0; }
        .pager {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 6px 8px;
          border: 1px solid var(--border);
          border-radius: 999px;
          background: var(--surface-soft);
        }
        .pager .pager-label {
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.08em;
          color: var(--muted);
          padding: 0 4px;
        }
        .pager .pager-select {
          min-width: 96px;
          min-height: 32px;
          padding: 6px 10px;
          border-radius: 999px;
        }
        .pager .pager-btn {
          min-height: 32px;
          padding: 6px 12px;
          font-size: 12px;
          opacity: 0.9;
        }
        .pager .pager-btn:disabled { opacity: 0.5; }
        .pager .pager-status {
          font-size: 12px;
          min-width: 72px;
          text-align: center;
        }
        .pager-row {
          align-items: flex-end;
        }
        .pager-text {
          align-self: flex-end;
        }
        .sort-icon {
          width: 16px;
          height: 16px;
          display: block;
          fill: #ffffff;
        }
        @media (max-width: 1100px) {
          .layout { grid-template-columns: 300px 1fr; }
          .category-count-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 860px) {
          .topbar { flex-direction: column; align-items: stretch; }
          .actions { justify-content: flex-start; }
          .layout { grid-template-columns: 1fr; }
          .side-stack { position: static; }
          .filter-row { flex-direction: column; align-items: stretch; }
          .filter-row > label { width: 100%; }
        }
        @media (max-width: 720px) {
          .actions button { width: 100%; }
          .title { font-size: 24px; }
          .row { flex-wrap: wrap; }
          .pager-row { flex-direction: column; align-items: stretch; gap: 10px; }
          .pager { width: 100%; justify-content: space-between; flex-wrap: wrap; }
          .pager-text { align-self: flex-start; }
          .modal { padding: 12px; max-height: calc(100vh - 48px); border-radius: 14px; }
        }
        @media (max-width: 520px) {
          .panel { padding: 12px; border-radius: 14px; }
          .title { font-size: 22px; }
          .subtitle { font-size: 12px; }
          .filter-toggle { padding: 4px 6px; }
          .pager { gap: 6px; }
          .pager .pager-select { min-width: 80px; }
        }
        @media (max-width: 420px) {
          .actions button { width: 100%; }
          .item-card { padding: 10px; }
          input:not([type="checkbox"]), textarea, select { padding: 9px 10px; }
          button { padding: 9px 10px; }
        }
      `}</style>
      <div className="topbar">
        <div>
          <a
            href="#/inventory"
            style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6, textDecoration: "none", color: "inherit" }}
            title="Go to homepage"
          >
            <img src="/logo.png" alt="Stockroom" style={{ width: 40, height: 40 }} />
            <h1 className="title" style={{ margin: 0 }}>Stockroom</h1>
          </a>
          <p className="subtitle">
            Signed in as {username}
          </p>
        </div>
        <div className="actions">
          <button type="button" onClick={onLogout} className="secondary" title="Log out">
            Logout
          </button>
          <button
            type="button"
            className="secondary"
            onClick={onOpenUserManagement}
            disabled={busy}
            aria-label="Open settings"
            title="Open settings"
          >
            ⚙️
          </button>
        </div>
      </div>

      {loading ? <p className="muted">Loading session...</p> : null}
      {(notice || error) ? (
        <div className="toast-stack" role="status" aria-live="polite">
          {notice ? <div className="notice">{notice}</div> : null}
          {error ? <div className="error">{error}</div> : null}
        </div>
      ) : null}

      <div className="layout">
        <div className="side-stack">
          <div className="panel stack search-panel">
            <h2 style={{ margin: 0 }}>Search inventory</h2>
            <form onSubmit={handleSearchSubmit} className="form-grid">
              <label className="form-grid">
                <input
                  name="inventorySearch"
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Category, make, model, tag, assigned user..."
                />
              </label>
            </form>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              disabled={busy}
              title="Add item"
            >
              + Add item
            </button>
          </div>

          <div className="panel stack category-count-panel">
            <div className="row">
              <h3 style={{ margin: 0 }}>Category totals</h3>
            </div>
            {categoryCounts.length === 0 ? (
              <p className="muted">No items yet.</p>
            ) : (
              <div className="category-count-grid">
                {categoryCounts.map(({ category, count, inStock, deployed, retired }) => (
                  <div
                    key={category}
                    className={`category-count-card clickable ${filterCategory === category ? "active" : ""}`}
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (isCableCategory(category)) {
                        openCableModal(category);
                        return;
                      }
                      setFilterCategory((prev) => (prev === category ? "all" : category));
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        if (isCableCategory(category)) {
                          openCableModal(category);
                          return;
                        }
                        setFilterCategory((prev) => (prev === category ? "all" : category));
                      }
                    }}
                    title={
                      isCableCategory(category)
                        ? "Open cable stock overview"
                        : filterCategory === category
                        ? "Clear category filter"
                        : `Filter by ${category}`
                    }
                  >
                    <div className="category-count-number">
                      {isCableCategory(category) ? inStock : count}
                    </div>
                    <div className="category-count-name">{category}</div>
                    <div className="category-count-meta">
                      {isCableCategory(category) ? (
                        <>
                          Click this card
                          <br />
                          to open Cable
                          <br />
                          Management
                        </>
                      ) : (
                        <>
                          In stock: {inStock}
                          <br />
                          Deployed: {deployed}
                          <br />
                          Retired: {retired}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="panel stack">
          <div className="row filter-row" style={{ gap: 10, marginBottom: 12 }}>
            <label style={{ flex: 1 }}>
              <div className="filter-label">
                <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Sort
                </span>
                <button
                  type="button"
                  onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
                  className="filter-toggle"
                  aria-label={isNewestFirst ? "Oldest first" : "Newest first"}
                  title={isNewestFirst ? "Oldest first" : "Newest first"}
                >
                  {isNewestFirst ? (
                    <svg className="sort-icon" viewBox="0 0 16 16" aria-hidden="true">
                      <rect x="2" y="10" width="12" height="2" rx="1" />
                      <rect x="4" y="7" width="10" height="2" rx="1" />
                      <rect x="6" y="4" width="8" height="2" rx="1" />
                    </svg>
                  ) : (
                    <svg className="sort-icon" viewBox="0 0 16 16" aria-hidden="true">
                      <rect x="2" y="4" width="12" height="2" rx="1" />
                      <rect x="4" y="7" width="10" height="2" rx="1" />
                      <rect x="6" y="10" width="8" height="2" rx="1" />
                    </svg>
                  )}
                </button>
              </div>
              <select
                name="sortField"
                value={sortField}
                onChange={(e) => setSortField(e.target.value)}
                className="filter-select"
              >
                <option value="created">Created</option>
                <option value="updated">Updated</option>
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <div className="filter-label">
                <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Category
                </span>
                <button
                  type="button"
                  onClick={() => setFilterCategory("all")}
                  className="filter-toggle"
                  aria-label="Reset category to all"
                  title="Reset category to all"
                >
                  ↺
                </button>
              </div>
              <select
                name="filterCategory"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </label>
            <label style={{ flex: 1 }}>
              <div className="filter-label">
                <span className="muted" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Status
                </span>
                <button
                  type="button"
                  onClick={() => setFilterStatus("all")}
                  className="filter-toggle"
                  aria-label="Reset status to all"
                  title="Reset status to all"
                >
                  ↺
                </button>
              </div>
              <select
                name="filterStatus"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All</option>
                {uniqueStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status === STATUS_IN_STOCK
                      ? "In Stock"
                      : status === STATUS_DEPLOYED
                      ? "Deployed"
                      : status === STATUS_RETIRED
                      ? "Retired"
                      : status}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {hasRetiredItems && filterStatus === "all" ? (
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: -2 }}>
              <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={hideRetired}
                  onChange={(event) => setHideRetired(event.target.checked)}
                  title="Hide retired items when Status is All"
                />
                <span className="muted" style={{ fontSize: 12 }}>
                  Hide retired (All)
                </span>
              </label>
            </div>
          ) : null}
          {filteredAndSortedItems.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 20px" }}>
              <p className="muted">No items in inventory yet.</p>
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                disabled={busy}
                style={{ marginTop: 12 }}
                title="Add your first item"
              >
                + Add your first item
              </button>
            </div>
          ) : (
            <div className="list">
              {pagedItems.map((item) => (
                <div
                  key={item.id}
                  className={`item-card ${selectedId === item.id ? "active" : ""}`}
                  onClick={() => {
                    setSelectedId(item.id);
                    loadItemDetail(item.id);
                    setShowItemModal(true);
                  }}
                  title="View item details"
                >
                  <div className="row" style={{ alignItems: "flex-start", marginBottom: 4 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, display: "flex", alignItems: "center" }}>
                        <span>
                          {isCableCategory(item.category)
                            ? `${item.category} - ${formatCableEnds(item.make)} (${formatCableLength(item.model)})`
                            : `${item.category} - ${item.make} ${item.model}`}
                        </span>
                        <span
                          className={`badge ${helpers.getStatusBadgeClass(item.status)}`}
                          style={{ marginLeft: 8 }}
                        >
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isCableCategory(item.category)) {
                          openCableModal(item.category);
                          return;
                        }
                        if (item.status === STATUS_RETIRED) {
                          return;
                        }
                        setQuickActionItem(item);
                        setQuickActionForm({ assignedUser: item.assigned_user || "", note: "" });
                      }}
                      disabled={busy || item.status === STATUS_RETIRED}
                      className={item.status !== STATUS_IN_STOCK ? "secondary" : ""}
                      style={{ padding: "6px 10px", fontSize: "12px" }}
                      title={
                        isCableCategory(item.category)
                          ? "Cables use quantity controls"
                          :
                        item.status === STATUS_RETIRED
                          ? "Item is retired"
                          : item.status === STATUS_DEPLOYED
                          ? "Return item"
                          : "Deploy item"
                      }
                    >
                      {isCableCategory(item.category)
                        ? "Cables"
                        : item.status === STATUS_RETIRED
                        ? "Retired"
                        : item.status === STATUS_DEPLOYED
                        ? "Return"
                        : "Deploy"}
                    </button>
                  </div>
                  <div className="meta-stack item-card-meta">
                    <div className="muted meta-line">
                      {isCableCategory(item.category)
                        ? `Quantity: ${parseQuantityValue(item.quantity, 0)}`
                        : `Service tag: ${item.service_tag}`}
                    </div>
                    <div className="muted meta-line">Created: {formatDate(item.created_at)}</div>
                    <div className="muted meta-line">
                      Updated: {formatDate(item.updated_at || item.created_at)}
                    </div>
                    {item.assigned_user && !isCableCategory(item.category) ? (
                      <div className="muted meta-line">Assigned: {item.assigned_user}</div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="row pager-row" style={{ marginTop: 12 }}>
            <div className="muted pager-text">
              {totalItems === 0 ? "0 items found" : `Showing ${startIndex + 1}-${endIndex} of ${totalItems}`}
            </div>
            <div className="pager">
              <div className="pager-label">Per page</div>
              <select
                name="pageSize"
                value={pageSize === 0 ? "all" : String(pageSize)}
                onChange={(event) => {
                  const value = event.target.value;
                  setPageSize(value === "all" ? 0 : Number(value));
                }}
                className="pager-select"
              >
                <option value="10">10</option>
                <option value="20">20</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
                <option value="all">All</option>
              </select>
              <button
                type="button"
                className="secondary pager-btn"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={pageSize === 0 || safePage <= 1}
                title="Previous page"
              >
                Prev
              </button>
              <div className="muted pager-status">
                {pageSize === 0 ? "All" : `${safePage} / ${totalPages}`}
              </div>
              <button
                type="button"
                className="secondary pager-btn"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={pageSize === 0 || safePage >= totalPages}
                title="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {showItemModal && selectedItem ? (
        <div
          className="modal-backdrop"
          onMouseDown={(event) => {
            refs.itemModalMouseDown.current = event.target === event.currentTarget;
          }}
          onMouseUp={(event) => {
            if (refs.itemModalMouseDown.current && event.target === event.currentTarget) {
              closeItemModal();
            }
            refs.itemModalMouseDown.current = false;
          }}
        >
          <div
            className="modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="modal-scroll-body">
            <div className="row modal-header">
              <div>
                <h2 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>
                    {isCableCategory(selectedItem.category)
                      ? `${selectedItem.category} - ${formatCableEnds(selectedItem.make)} (${formatCableLength(selectedItem.model)})`
                      : `${selectedItem.category} - ${selectedItem.make} ${selectedItem.model}`}
                  </span>
                  <span
                    className={`badge ${helpers.getStatusBadgeClass(selectedItem.status)}`}
                  >
                    {selectedItem.status}
                  </span>
                </h2>
                <div className="meta-stack">
                  <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
                    {selectedItem.status !== STATUS_RETIRED && !isCableCategory(selectedItem.category) ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          setQuickActionItem(selectedItem);
                          setQuickActionForm({
                            assignedUser: selectedItem.assigned_user || "",
                            note: "",
                          });
                        }}
                        disabled={busy}
                        className={selectedItem.status === STATUS_DEPLOYED ? "secondary" : ""}
                        style={{ padding: "4px 8px", fontSize: "11px" }}
                        title={selectedItem.status === STATUS_DEPLOYED ? "Return item" : "Deploy item"}
                      >
                        {selectedItem.status === STATUS_DEPLOYED ? "Return" : "Deploy"}
                      </button>
                    ) : null}
                    {!isCableCategory(selectedItem.category) ? (
                      <span className="muted">
                        {selectedItem.assigned_user
                          ? `Assigned to ${selectedItem.assigned_user}`
                          : "Unassigned"}
                      </span>
                    ) : null}
                    {isCableCategory(selectedItem.category) ? (
                      <div className="actions" style={{ justifyContent: "flex-start" }}>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={async () => {
                            const targetCategory = selectedItem.category;
                            await openCableModal(targetCategory);
                            closeItemModal();
                          }}
                          style={{ padding: "4px 8px", fontSize: "11px" }}
                          title="Cable Management"
                        >
                          Cable Management
                        </button>
                        <span className="muted">
                          Qty: {parseQuantityValue(selectedItem.quantity, 0)}
                        </span>
                      </div>
                    ) : null}
                  </div>
                  <div className="muted">Created {formatDate(selectedItem.created_at)}</div>
                  <div className="muted">
                    Updated {formatDate(selectedItem.updated_at || selectedItem.created_at)}
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  closeItemModal();
                }}
                aria-label="Close"
                title="Close"
              >
                &times;
              </button>
            </div>
            <div className="divider" />

            <div className="modal-grid">
              <div className="panel stack" style={{ border: "none", padding: 0, boxShadow: "none", background: "transparent" }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>Item details</h3>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => {
                        setRetireItem(selectedItem);
                        setRetireForm({ note: "", zeroStock: false });
                      }}
                      disabled={selectedItem.status === STATUS_DEPLOYED}
                      aria-label={selectedItem.status === STATUS_RETIRED ? "Restore item" : "Retire item"}
                      title={
                        selectedItem.status === STATUS_DEPLOYED
                          ? "Return item before retiring"
                          : selectedItem.status === STATUS_RETIRED
                          ? "Restore item"
                          : "Retire item"
                      }
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                      {selectedItem.status === STATUS_RETIRED ? "Restore" : "Retire"}
                    </button>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => setEditUnlocked((prev) => !prev)}
                      aria-label={editUnlocked ? "Lock edits" : "Unlock edits"}
                      title={editUnlocked ? "Lock edits" : "Unlock edits"}
                      style={{ padding: "4px 8px", fontSize: "12px" }}
                    >
                    {editUnlocked ? "🔓" : "🔒"}
                    </button>
                  </div>
                </div>
                <form onSubmit={handleEditSubmit} className="form-grid">
                  <ItemFormFields
                    form={editForm}
                    setForm={setEditForm}
                    useDropdowns={useEditDropdowns}
                    setUseDropdowns={setUseEditDropdowns}
                    categoryOptions={formCategoryOptions}
                    makeOptionsByCategory={formMakeOptionsByCategory}
                    modelOptionsByCategoryMake={formModelOptionsByCategoryMake}
                    capitalizeFirst={capitalizeFirst}
                    disabled={!editUnlocked}
                  />
                  <button
                    type="submit"
                    disabled={busy || !editUnlocked || !editHasChanges || !editIsValid}
                    title="Save edits"
                  >
                    Save edits
                  </button>
                </form>
              </div>

              <div className="panel stack" style={{ border: "none", padding: 0, boxShadow: "none", background: "transparent" }}>
                <div className="row" style={{ alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>History</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setHistorySortDirection((prev) => (prev === "asc" ? "desc" : "asc"))
                    }
                    className="filter-toggle"
                    aria-label="Toggle history sort order"
                    title={historySortDirection === "desc" ? "Oldest first" : "Newest first"}
                  >
                    {historySortDirection === "desc" ? (
                      <svg className="sort-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <rect x="2" y="10" width="12" height="2" rx="1" />
                        <rect x="4" y="7" width="10" height="2" rx="1" />
                        <rect x="6" y="4" width="8" height="2" rx="1" />
                      </svg>
                    ) : (
                      <svg className="sort-icon" viewBox="0 0 16 16" aria-hidden="true">
                        <rect x="2" y="4" width="12" height="2" rx="1" />
                        <rect x="4" y="7" width="10" height="2" rx="1" />
                        <rect x="6" y="10" width="8" height="2" rx="1" />
                      </svg>
                    )}
                  </button>
                </div>
                {selectedHistory.length === 0 ? (
                  <p className="muted">No history yet.</p>
                ) : (
                  <div className="list">
                    {selectedHistory.map((event) => (
                      <div key={event.id} className="item-card" style={{ cursor: "default" }}>
                        <div style={{ fontWeight: 600 }}>
                          {String(event.action).toUpperCase()} - {event.actor}
                        </div>
                        <div className="meta-stack">
                          <div className="muted">{event.prettyTimestamp || formatDate(event.timestamp)}</div>
                          {event.changeLines.length > 0
                            ? event.changeLines.map((line) => (
                                <div key={line} className="muted">{line}</div>
                              ))
                            : null}
                          {event.note && !event.hasNoteFieldChange ? (
                            <div className="muted">Action note: {event.note}</div>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      ) : null}

      <AddItemModal
        isOpen={showAddModal}
        onClose={closeAddModal}
        onSubmit={handleAddSubmit}
        addForm={addForm}
        setAddForm={setAddForm}
        useDropdowns={useDropdowns}
        setUseDropdowns={setUseDropdowns}
        categoryOptions={formCategoryOptions}
        makeOptionsByCategory={formMakeOptionsByCategory}
        modelOptionsByCategoryMake={formModelOptionsByCategoryMake}
        capitalizeFirst={capitalizeFirst}
        busy={busy}
      />

      <QuickActionModal
        quickActionItem={quickActionItem}
        quickActionForm={quickActionForm}
        setQuickActionForm={setQuickActionForm}
        onClose={() => {
          setQuickActionItem(null);
          setQuickActionForm(constants.createQuickActionForm());
        }}
        onSubmit={handleQuickActionSubmit}
        busy={busy}
      />

      <CableOverviewModal
        isOpen={showCableModal}
        category={cableCategory}
        items={cableSummaryItems}
        history={cableSummaryHistory}
        onClose={closeCableModal}
        onAdjustQuantity={adjustCableQuantity}
        onRequestSetQuantity={(item) => {
          setSetCableItem(item);
          setSetCableForm({
            operation: "set",
            quantity: String(parseQuantityValue(item.quantity, 0)),
            note: "",
          });
        }}
        onOpenItem={async (itemId) => {
          setSelectedId(itemId);
          await loadItemDetail(itemId);
          setShowItemModal(true);
          closeCableModal();
        }}
        onRequestRestore={(item) => {
          setRetireItem(item);
          setRetireForm({ note: "", zeroStock: false });
        }}
        busy={busy}
      />

      <RetireItemModal
        item={retireItem}
        form={retireForm}
        setForm={setRetireForm}
        onClose={() => {
          setRetireItem(null);
          setRetireForm({ note: "", zeroStock: false });
        }}
        onSubmit={handleRetireSubmit}
        busy={busy}
      />

      <SetCableQuantityModal
        item={setCableItem}
        form={setCableForm}
        setForm={setSetCableForm}
        onClose={() => {
          setSetCableItem(null);
          setSetCableForm({ operation: "set", quantity: "", note: "" });
        }}
        onSubmit={async () => {
          if (!setCableItem) {
            return;
          }
          await applyCableQuantityChange(
            setCableItem.id,
            setCableForm.operation,
            setCableForm.quantity,
            parseQuantityValue(setCableItem.quantity, 0),
            setCableForm.note
          );
          setSetCableItem(null);
          setSetCableForm({ operation: "set", quantity: "", note: "" });
        }}
        busy={busy}
      />
    </div>
  );
}
