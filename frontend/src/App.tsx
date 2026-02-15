import { useEffect, useRef, useState } from "react";
import LoginView from "./features/auth/LoginView";
import SessionExpiredModal from "./features/auth/SessionExpiredModal";
import InventoryView from "./features/inventory/InventoryView";
import UserManagementModal from "./features/users/UserManagementModal";
import useAuth from "./features/auth/useAuth";
import useInventory from "./features/inventory/useInventory";
import useUserManagement from "./features/users/useUserManagement";
import { formatDate } from "./utils/formatters";
import {
  ALLOWED_USER_VIEWS,
  buildInventoryHash,
  normalizeHash,
  parseHash,
} from "./features/navigation/hashRouting";
import {
  DEFAULT_FILTER_CATEGORY,
  DEFAULT_FILTER_STATUS,
  DEFAULT_SORT_DIRECTION,
  DEFAULT_SORT_FIELD,
} from "./constants/inventory";

const normalizeUserValue = (value) => (value ? String(value).trim().toLowerCase() : "");
const ALLOWED_PAGE_SIZES = new Set([10, 20, 50, 100, 200, 0]);

export default function App() {
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [reauthError, setReauthError] = useState("");
  const [reauthBusy, setReauthBusy] = useState(false);
  const applyingHashRef = useRef(false);

  const auth = useAuth({ setError });
  const inventory = useInventory({
    token: auth.token,
    username: auth.username,
    setError,
    setNotice,
    setBusy,
  });
  const userManagement = useUserManagement({
    token: auth.token,
    role: auth.role,
    setError,
    setNotice,
    setBusy,
  });

  const setHash = (nextHash) => {
    const normalized = normalizeHash(nextHash);
    if (window.location.hash !== normalized) {
      window.history.replaceState(null, "", normalized);
    }
  };

  const applyHashToState = async () => {
    if (!auth.token) {
      return;
    }
    const { segments, params } = parseHash(window.location.hash || "");
    if (segments[0] !== "inventory") {
      setHash("#/inventory");
      return;
    }

    applyingHashRef.current = true;
    const finishApply = () => {
      window.setTimeout(() => {
        applyingHashRef.current = false;
      }, 0);
    };

    try {
      if (params.has("q")) {
        inventory.actions.setSearch(params.get("q") || "");
      }
      if (params.has("status")) {
        inventory.actions.setFilterStatus(params.get("status") || DEFAULT_FILTER_STATUS);
      }
      if (params.has("category")) {
        inventory.actions.setFilterCategory(params.get("category") || DEFAULT_FILTER_CATEGORY);
      }
      if (params.has("hideRetired")) {
        const hideRetiredParam = params.get("hideRetired");
        inventory.actions.setHideRetired(hideRetiredParam === "1" || hideRetiredParam === "true");
      }
      if (params.has("sort")) {
        inventory.actions.setSortField(params.get("sort") || DEFAULT_SORT_FIELD);
      }
      if (params.has("dir")) {
        inventory.actions.setSortDirection(params.get("dir") || DEFAULT_SORT_DIRECTION);
      }
      if (params.has("pageSize")) {
        const pageSizeParam = Number(params.get("pageSize"));
        if (Number.isInteger(pageSizeParam) && ALLOWED_PAGE_SIZES.has(pageSizeParam)) {
          inventory.actions.setPageSize(pageSizeParam);
        }
      }
      if (params.has("page")) {
        const pageParam = Number(params.get("page"));
        if (Number.isFinite(pageParam) && pageParam > 0) {
          inventory.actions.setPage(pageParam);
        }
      }

      const view = segments[1];
      if (view === "users") {
        await userManagement.actions.openUserModal();
        const rawUserView = params.get("view") || "view";
        const userView = ALLOWED_USER_VIEWS.has(rawUserView) ? rawUserView : "view";
        userManagement.actions.setUserManagementView(userView);
        if (userView === "logs") {
          await userManagement.actions.loadUserAuditLogs();
        }
        inventory.actions.closeItemModal();
        inventory.actions.setShowAddModal(false);
        inventory.actions.setQuickActionItem(null);
        inventory.actions.setRetireItem(null);
        return;
      }

      userManagement.actions.closeUserModal();

      if (view === "add") {
        inventory.actions.setShowAddModal(true);
        inventory.actions.closeItemModal();
        inventory.actions.setQuickActionItem(null);
        inventory.actions.setRetireItem(null);
        return;
      }

      inventory.actions.setShowAddModal(false);

      if (view === "item" && segments[2]) {
        const itemId = Number(segments[2]);
        if (!Number.isFinite(itemId)) {
          inventory.actions.closeItemModal();
          inventory.actions.setQuickActionItem(null);
          inventory.actions.setRetireItem(null);
          return;
        }
        inventory.actions.setSelectedId(itemId);
        const item = await inventory.actions.loadItemDetail(itemId);
        const action = segments[3];
        if (action === "quick") {
          const quickCategory = item?.category ? String(item.category).trim().toLowerCase() : "";
          if (quickCategory === "cable") {
            inventory.actions.setQuickActionItem(null);
            inventory.actions.setRetireItem(null);
            inventory.actions.setShowItemModal(true);
            return;
          }
          inventory.actions.setQuickActionItem(item);
          inventory.actions.setQuickActionForm(inventory.constants.createQuickActionForm());
          inventory.actions.setRetireItem(null);
          inventory.actions.setShowItemModal(false);
          return;
        }
        if (action === "retire") {
          inventory.actions.setRetireItem(item);
          inventory.actions.setRetireForm({ note: "", zeroStock: false });
          inventory.actions.setQuickActionItem(null);
          inventory.actions.setShowItemModal(true);
          return;
        }
        inventory.actions.setQuickActionItem(null);
        inventory.actions.setRetireItem(null);
        inventory.actions.setShowItemModal(true);
        return;
      }

      inventory.actions.closeItemModal();
      inventory.actions.setQuickActionItem(null);
      inventory.actions.setRetireItem(null);
    } finally {
      finishApply();
    }
  };

  useEffect(() => {
    if (!auth.token) {
      inventory.actions.resetInventoryState();
      userManagement.actions.resetUserManagementState();
      setNotice("");
      setSessionExpired(false);
      setReauthError("");
      setReauthBusy(false);
      setHash("#/login");
    }
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }
    applyHashToState();
  }, [auth.token]);

  useEffect(() => {
    if (!auth.token) {
      return;
    }
    const handleHashChange = () => {
      applyHashToState();
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [auth.token]);

  useEffect(() => {
    const handleAuthExpired = () => {
      if (!auth.token) {
        return;
      }
      setSessionExpired(true);
    };
    window.addEventListener("auth:expired", handleAuthExpired);
    return () => window.removeEventListener("auth:expired", handleAuthExpired);
  }, [auth.token]);

  useEffect(() => {
    if (!notice) {
      return;
    }
    const handle = window.setTimeout(() => setNotice(""), 5000);
    return () => window.clearTimeout(handle);
  }, [notice]);

  useEffect(() => {
    if (!error) {
      return;
    }
    const handle = window.setTimeout(() => setError(""), 5000);
    return () => window.clearTimeout(handle);
  }, [error]);

  const {
    search,
    selectedId,
    showAddModal,
    showItemModal,
    quickActionItem,
    retireItem,
    filterStatus,
    filterCategory,
    hideRetired,
    sortField,
    sortDirection,
    pageSize,
    page,
  } = inventory.state;
  const { showUsers, userManagementView } = userManagement.state;
  const quickActionItemId = quickActionItem ? quickActionItem.id : null;
  const retireItemId = retireItem ? retireItem.id : null;

  useEffect(() => {
    if (!auth.token || applyingHashRef.current) {
      return;
    }
    const view = showUsers
      ? "users"
      : showAddModal
      ? "add"
      : retireItemId
      ? "item"
      : quickActionItemId
      ? "item"
      : showItemModal && selectedId
      ? "item"
      : null;
    const viewId = retireItemId || quickActionItemId || (showItemModal ? selectedId : null);
    const viewAction = retireItemId
      ? "retire"
      : quickActionItemId
      ? "quick"
      : null;
    const nextHash = buildInventoryHash({
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
      userView: userManagementView,
    });
    setHash(nextHash);
  }, [
    auth.token,
    search,
    filterStatus,
    filterCategory,
    hideRetired,
    sortField,
    sortDirection,
    pageSize,
    page,
    showAddModal,
    showItemModal,
    selectedId,
    quickActionItemId,
    retireItemId,
    showUsers,
    userManagementView,
  ]);

  const handleLogout = () => {
    auth.handleLogout();
    inventory.actions.resetInventoryState();
    userManagement.actions.resetUserManagementState();
    setNotice("");
  };

  const handleReauth = async (event) => {
    event.preventDefault();
    setReauthError("");
    setReauthBusy(true);
    const previousUsername = auth.username;
    const form = new FormData(event.currentTarget);
    const usernameValue = form.get("username");
    const passwordValue = form.get("password");
    const result = await auth.loginWithCredentials(usernameValue, passwordValue, {
      suppressError: true,
    });
    if (result.ok) {
      if (normalizeUserValue(previousUsername) !== normalizeUserValue(usernameValue)) {
        inventory.actions.resetInventoryState();
        userManagement.actions.resetUserManagementState();
        setNotice("");
      }
      setSessionExpired(false);
    } else {
      setReauthError("Login failed");
    }
    setReauthBusy(false);
  };

  if (!auth.token) {
    return <LoginView onLogin={auth.handleLogin} busy={busy} notice={notice} error={error} />;
  }

  return (
    <>
      <InventoryView
        username={auth.username}
        loading={auth.loading}
        notice={notice}
        error={error}
        busy={busy}
        onLogout={handleLogout}
        onOpenUserManagement={userManagement.actions.openUserModal}
        inventory={inventory}
      />

      <UserManagementModal
        isOpen={userManagement.state.showUsers}
        onClose={userManagement.actions.closeUserModal}
        username={auth.username}
        role={auth.role}
        isOwner={userManagement.permissions.isOwner}
        canCreateUsers={userManagement.permissions.canCreateUsers}
        userManagementView={userManagement.state.userManagementView}
        setUserManagementView={userManagement.actions.setUserManagementView}
        users={userManagement.state.users}
        userForm={userManagement.state.userForm}
        setUserForm={userManagement.actions.setUserForm}
        resetPasswordForm={userManagement.state.resetPasswordForm}
        setResetPasswordForm={userManagement.actions.setResetPasswordForm}
        editingUserRole={userManagement.state.editingUserRole}
        setEditingUserRole={userManagement.actions.setEditingUserRole}
        userAuditLogs={userManagement.state.userAuditLogs}
        busy={busy}
        handleCreateUser={userManagement.actions.handleCreateUser}
        handleResetPassword={userManagement.actions.handleResetPassword}
        handleUpdateRole={userManagement.actions.handleUpdateRole}
        loadUserAuditLogs={userManagement.actions.loadUserAuditLogs}
        formatDate={formatDate}
      />

      <SessionExpiredModal
        isOpen={sessionExpired}
        username={auth.username}
        error={reauthError}
        busy={reauthBusy}
        onReauth={handleReauth}
      />
    </>
  );
}
