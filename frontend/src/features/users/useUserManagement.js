import { useState } from "react";
import { apiRequest, getApiErrorMessage } from "../../api/client.js";

const initialUserForm = { username: "", password: "", role: "user" };
const initialResetForm = { username: "", newPassword: "" };
const createUserForm = () => ({ ...initialUserForm });
const createResetForm = () => ({ ...initialResetForm });
const createEditingRoleForm = () => ({ userId: null, newRole: "user" });

export default function useUserManagement({
  token,
  role,
  setError,
  setNotice,
  setBusy,
}) {
  const [showUsers, setShowUsers] = useState(false);
  const [userManagementView, setUserManagementView] = useState("view");
  const [users, setUsers] = useState([]);
  const [userForm, setUserForm] = useState(createUserForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(createResetForm);
  const [editingUserRole, setEditingUserRole] = useState(createEditingRoleForm);
  const [userAuditLogs, setUserAuditLogs] = useState([]);

  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const canCreateUsers = isOwner || isAdmin;

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

  const resetUserManagementState = () => {
    setShowUsers(false);
    setUserManagementView("view");
    setUsers([]);
    setUserForm(createUserForm());
    setResetPasswordForm(createResetForm());
    setEditingUserRole(createEditingRoleForm());
    setUserAuditLogs([]);
  };

  const closeUserModal = () => {
    setShowUsers(false);
    setUserManagementView("view");
    setUserForm(createUserForm());
    setResetPasswordForm(createResetForm());
    setEditingUserRole(createEditingRoleForm());
  };

  const loadUsersList = async () => {
    const res = await apiRequest("/users", {}, token);
    if (!res.ok) {
      setError("Failed to load users");
      return;
    }
    const data = await res.json();
    setError("");
    setUsers(data.users || []);
  };

  const loadUserAuditLogs = async () => {
    const res = await apiRequest("/user-audit-logs", {}, token);
    if (!res.ok) {
      setError("Failed to load audit logs");
      return;
    }
    const data = await res.json();
    setError("");
    setUserAuditLogs(data.logs || []);
  };

  const openUserModal = async () => {
    setShowUsers(true);
    setUserManagementView("view");
    await loadUsersList();
  };

  const handleCreateUser = async (event) => {
    event.preventDefault();
    if (!canCreateUsers) {
      return;
    }
    await runBusyAction(async () => {
      const res = await apiRequest(
        "/users",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: userForm.username,
            password: userForm.password,
            role: isOwner ? userForm.role : "user",
          }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to create user"));
      }
      setUserForm(createUserForm());
      await loadUsersList();
      setNotice("User created");
    });
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (!isOwner) {
      setError("Only owners can change user roles");
      return;
    }
    await runBusyAction(async () => {
      const res = await apiRequest(
        `/users/${userId}/role`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role: newRole }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to update role"));
      }
      await loadUsersList();
      setEditingUserRole(createEditingRoleForm());
      setNotice("User role updated");
    });
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    await runBusyAction(async () => {
      const res = await apiRequest(
        `/users/${resetPasswordForm.username}/reset-password`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ new_password: resetPasswordForm.newPassword }),
        },
        token
      );
      if (!res.ok) {
        throw new Error(await getApiFailure(res, "Failed to reset password"));
      }
      setResetPasswordForm(createResetForm());
      setNotice("Password reset successfully");
    });
  };

  return {
    state: {
      showUsers,
      userManagementView,
      users,
      userForm,
      resetPasswordForm,
      editingUserRole,
      userAuditLogs,
    },
    actions: {
      setShowUsers,
      setUserManagementView,
      setUserForm,
      setResetPasswordForm,
      setEditingUserRole,
      loadUserAuditLogs,
      openUserModal,
      closeUserModal,
      handleCreateUser,
      handleResetPassword,
      handleUpdateRole,
      resetUserManagementState,
    },
    permissions: {
      isOwner,
      isAdmin,
      canCreateUsers,
    },
  };
}
