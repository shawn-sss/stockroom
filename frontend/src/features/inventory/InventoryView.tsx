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
import "./InventoryView.css";

export default function InventoryView({
  username,
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
