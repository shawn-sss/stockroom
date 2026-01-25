import { useState } from "react";
import { apiRequest, getApiErrorMessage } from "../../api/client.js";

const initialUserForm = { username: "", password: "", role: "user" };
const initialResetForm = { username: "", newPassword: "" };

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
  const [userForm, setUserForm] = useState(initialUserForm);
  const [resetPasswordForm, setResetPasswordForm] = useState(initialResetForm);
  const [editingUserRole, setEditingUserRole] = useState({ userId: null, newRole: "user" });
  const [userAuditLogs, setUserAuditLogs] = useState([]);

  const isOwner = role === "owner";
  const isAdmin = role === "admin";
  const canCreateUsers = isOwner || isAdmin;

  const resetUserManagementState = () => {
    setShowUsers(false);
    setUserManagementView("view");
    setUsers([]);
    setUserForm(initialUserForm);
    setResetPasswordForm(initialResetForm);
    setEditingUserRole({ userId: null, newRole: "user" });
    setUserAuditLogs([]);
  };

  const closeUserModal = () => {
    setShowUsers(false);
    setUserManagementView("view");
    setUserForm(initialUserForm);
    setResetPasswordForm(initialResetForm);
    setEditingUserRole({ userId: null, newRole: "user" });
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
    setBusy(true);
    setError("");
    try {
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
        const data = await res.json();
        throw new Error(getApiErrorMessage(data, "Failed to create user"));
      }
      setUserForm(initialUserForm);
      await loadUsersList();
      setNotice("User created");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    if (!isOwner) {
      setError("Only owners can change user roles");
      return;
    }
    setBusy(true);
    setError("");
    try {
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
        const data = await res.json();
        throw new Error(getApiErrorMessage(data, "Failed to update role"));
      }
      await loadUsersList();
      setEditingUserRole({ userId: null, newRole: "user" });
      setNotice("User role updated");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
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
        const data = await res.json();
        throw new Error(getApiErrorMessage(data, "Failed to reset password"));
      }
      setResetPasswordForm(initialResetForm);
      setNotice("Password reset successfully");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
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
