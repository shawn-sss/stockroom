import { useMemo } from "react";
import {
  capitalizeFirst,
  formatDate,
} from "../../utils/formatters.js";
import {
  STATUS_DEPLOYED,
  STATUS_IN_STOCK,
  STATUS_RETIRED,
} from "../../constants/status.js";
import AddItemModal from "./AddItemModal.jsx";
import ItemFormFields from "./ItemFormFields.jsx";
import QuickActionModal from "./QuickActionModal.jsx";
import RetireItemModal from "./RetireItemModal.jsx";

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
    sortField,
    sortDirection,
    pageSize,
    useDropdowns,
    useEditDropdowns,
    editUnlocked,
    historySortDirection,
    retireItem,
    retireForm,
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
  } = actions;

  const isNewestFirst = useMemo(
    () => sortDirection === "desc",
    [sortDirection]
  );

  return (
    <div className="app-shell">
      <style>{`
        :root {
          --bg: #0b1220;
          --surface: #0f172a;
          --card: #0b1220;
          --panel: #111a2e;
          --border: rgba(255, 255, 255, 0.10);
          --text: rgba(255, 255, 255, 0.92);
          --muted: rgba(255, 255, 255, 0.65);
          --primary: #3b82f6;
          --primary-2: #2563eb;
          --danger: #ef4444;
          --success: #22c55e;
          --warning: #f59e0b;
        }

        * { box-sizing: border-box; }
        body { margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, "Apple Color Emoji", "Segoe UI Emoji"; background: radial-gradient(1100px 600px at 10% 0%, rgba(59,130,246,0.25), transparent 55%), var(--bg); color: var(--text); min-height: 100vh; background-attachment: fixed; }
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
          background: linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03));
          border: 1px solid var(--border);
          border-radius: 16px;
          padding: 16px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.25);
          backdrop-filter: blur(10px);
        }
        .stack { display: grid; gap: 12px; }
        .list { display: grid; gap: 10px; }
        .muted { color: var(--muted); font-size: 12px; }
        .meta-stack { display: grid; gap: 4px; margin-top: 4px; }
        .meta-row { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
        .meta-line { font-size: 11px; line-height: 1.2; }
        .item-card, .meta-line, .muted { overflow-wrap: anywhere; word-break: break-word; }

        .row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
        .modal-header { align-items: flex-start; }
        .actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .filter-row { align-items: flex-start; }
        .filter-label { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; min-height: 22px; }
        .filter-label .label-spacer { width: 28px; height: 22px; }
        .filter-toggle { padding: 4px 8px; font-size: 14px; line-height: 1; }
        .filter-select { padding: 8px 12px; min-height: 38px; }

        .item-card {
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.02);
          padding: 12px;
          border-radius: 14px;
          cursor: pointer;
          transition: transform 120ms ease, border-color 120ms ease, background 120ms ease;
        }
        .item-card:hover { transform: translateY(-1px); background: rgba(255,255,255,0.04); }
        .item-card.active { border-color: rgba(59,130,246,0.7); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }

        .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 999px; font-size: 12px; border: 1px solid var(--border); background: rgba(255,255,255,0.04); }
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
          background: radial-gradient(120px 80px at 10% 0%, rgba(59,130,246,0.18), rgba(255,255,255,0.02));
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02);
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
          font-size: 11px;
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
          background: rgba(2,6,23,0.55);
          color: var(--text);
          font: inherit;
          outline: none;
        }
        input[type="checkbox"] { width: 16px; height: 16px; accent-color: var(--primary); }
        input::placeholder, textarea::placeholder { color: rgba(255,255,255,0.45); }
        input:not([type="checkbox"]):focus, textarea:focus, select:focus { border-color: rgba(59,130,246,0.75); box-shadow: 0 0 0 3px rgba(59,130,246,0.15); }
        input.input-locked {
          color: var(--muted);
          background: rgba(2,6,23,0.35);
        }
        select:disabled {
          color: var(--muted);
          background: rgba(2,6,23,0.35);
          opacity: 1;
        }
        button {
          padding: 10px 12px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.10);
          background: linear-gradient(180deg, var(--primary), var(--primary-2));
          color: white;
          font-weight: 700;
          cursor: pointer;
          transition: filter 120ms ease, transform 120ms ease;
        }
        button:hover { filter: brightness(1.05); transform: translateY(-1px); }
        button:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
        button.secondary { background: rgba(255,255,255,0.08); color: var(--text); border-color: var(--border); }
        button.danger { background: linear-gradient(180deg, var(--danger), #b91c1c); }

        .notice {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(34,197,94,0.25);
          background: rgba(34,197,94,0.12);
          color: rgba(255,255,255,0.92);
        }
        .error {
          margin-top: 14px;
          padding: 10px 12px;
          border-radius: 12px;
          border: 1px solid rgba(239,68,68,0.25);
          background: rgba(239,68,68,0.12);
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
          background: rgba(0,0,0,0.55);
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: clamp(16px, 4vw, 48px);
          z-index: 20;
        }
        .modal {
          width: min(900px, calc(100vw - 24px));
          background: rgba(17,26,46,0.95);
          border: 1px solid var(--border);
          border-radius: 18px;
          box-shadow: 0 24px 60px rgba(0,0,0,0.5);
          padding: 16px;
          max-height: calc(100vh - 96px);
          overflow: auto;
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
          background: rgba(255, 255, 255, 0.04);
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
          fill: var(--text);
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
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
            <img src="/logo.png" alt="Stockroom" style={{ width: 40, height: 40 }} />
            <h1 className="title" style={{ margin: 0 }}>Stockroom</h1>
          </div>
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
                  <div key={category} className="category-count-card">
                    <div className="category-count-number">{count}</div>
                    <div className="category-count-name">{category}</div>
                    <div className="category-count-meta">
                      In stock: {inStock}
                      <br />
                      Deployed: {deployed}
                      <br />
                      Retired: {retired}
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
                          {item.category} - {item.make} {item.model}
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
                        item.status === STATUS_RETIRED
                          ? "Item is retired"
                          : item.status === STATUS_DEPLOYED
                          ? "Return item"
                          : "Deploy item"
                      }
                    >
                      {item.status === STATUS_RETIRED
                        ? "Retired"
                        : item.status === STATUS_DEPLOYED
                        ? "Return"
                        : "Deploy"}
                    </button>
                  </div>
                  <div className="muted">Service tag: {item.service_tag}</div>
                  {item.row ? <div className="muted">Row: {item.row}</div> : null}
                  <div className="meta-stack">
                    <div className="muted meta-line">Created: {formatDate(item.created_at)}</div>
                    <div className="meta-row">
                      <div className="muted meta-line">
                        Updated: {formatDate(item.updated_at || item.created_at)}
                      </div>
                      {item.assigned_user ? (
                        <div className="muted meta-line">Assigned: {item.assigned_user}</div>
                      ) : null}
                    </div>
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
            <div className="row modal-header">
              <div>
                <h2 style={{ margin: "0 0 4px", display: "flex", alignItems: "center", gap: 10 }}>
                  <span>{selectedItem.category} - {selectedItem.make} {selectedItem.model}</span>
                  <span
                    className={`badge ${helpers.getStatusBadgeClass(selectedItem.status)}`}
                  >
                    {selectedItem.status}
                  </span>
                </h2>
                <div className="meta-stack">
                  <div className="row" style={{ justifyContent: "flex-start", gap: 8 }}>
                    {selectedItem.status !== STATUS_RETIRED ? (
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
                    <span className="muted">
                      {selectedItem.assigned_user
                        ? `Assigned to ${selectedItem.assigned_user}`
                        : "Unassigned"}
                    </span>
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
                        setRetireForm({ note: "" });
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
                          {event.note ? <div className="muted">Note: {event.note}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
          setQuickActionForm(constants.emptyQuickActionForm);
        }}
        onSubmit={handleQuickActionSubmit}
        busy={busy}
      />

      <RetireItemModal
        item={retireItem}
        form={retireForm}
        setForm={setRetireForm}
        onClose={() => {
          setRetireItem(null);
          setRetireForm({ note: "" });
        }}
        onSubmit={handleRetireSubmit}
        busy={busy}
      />
    </div>
  );
}
