import Modal from "../../components/Modal";
import { getSortableTime } from "../../utils/formatters";

export default function UserManagementModal({
  isOpen,
  onClose,
  username,
  role,
  isOwner,
  canCreateUsers,
  userManagementView,
  setUserManagementView,
  users,
  userForm,
  setUserForm,
  resetPasswordForm,
  setResetPasswordForm,
  editingUserRole,
  setEditingUserRole,
  userAuditLogs,
  busy,
  handleCreateUser,
  handleResetPassword,
  handleUpdateRole,
  loadUserAuditLogs,
  formatDate,
}) {
  if (!isOpen) {
    return null;
  }

  const handleClose = () => {
    onClose();
    setUserManagementView("view");
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="row modal-header">
          <div>
            <h2 style={{ margin: 0 }}>Settings</h2>
            <p className="muted" style={{ margin: "6px 0 0" }}>
              Application settings and user management
            </p>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              handleClose();
            }}
            aria-label="Close"
            title="Close"
          >
            &times;
          </button>
        </div>
        <div className="divider" />
        <div className="modal-grid user-modal-grid">
          <div className="panel stack" style={{ border: "none", padding: 0, boxShadow: "none", background: "transparent" }}>
            <div className="stack" style={{ gap: 8 }}>
              <button
                type="button"
                className={userManagementView === "view" ? "" : "secondary"}
                onClick={() => setUserManagementView("view")}
                style={{ padding: "12px 16px", textAlign: "left", justifyContent: "flex-start" }}
                title="View users"
              >
                View Users
              </button>
              {canCreateUsers ? (
                <button
                  type="button"
                  className={userManagementView === "create" ? "" : "secondary"}
                  onClick={() => setUserManagementView("create")}
                  style={{ padding: "12px 16px", textAlign: "left", justifyContent: "flex-start" }}
                  title="Create user"
                >
                  Create User
                </button>
              ) : null}
              <button
                type="button"
                className={userManagementView === "reset-password" ? "" : "secondary"}
                onClick={() => setUserManagementView("reset-password")}
                style={{ padding: "12px 16px", textAlign: "left", justifyContent: "flex-start" }}
                title="Reset password"
              >
                Reset Password
              </button>
              {canCreateUsers ? (
                <button
                  type="button"
                  className={userManagementView === "logs" ? "" : "secondary"}
                  onClick={async () => {
                    setUserManagementView("logs");
                    await loadUserAuditLogs();
                  }}
                  style={{ padding: "12px 16px", textAlign: "left", justifyContent: "flex-start" }}
                  title="View user logs"
                >
                  View User Logs
                </button>
              ) : null}
            </div>
          </div>

          <div className="panel stack" style={{ border: "none", padding: 0, boxShadow: "none", background: "transparent" }}>
            {userManagementView === "view" ? (
              <>
                <h3 style={{ margin: 0 }}>View Users</h3>
                <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
                  {isOwner ? "View all users and change their roles" : "View all users"}
                </p>
                {users.length === 0 ? (
                  <p className="muted">No users found.</p>
                ) : (
                  <div className="list">
                    {[...users].sort((a, b) => {
                      const roleOrder = { owner: 0, admin: 1, user: 2 };
                      const roleCompare = roleOrder[a.role] - roleOrder[b.role];
                      if (roleCompare !== 0) return roleCompare;
                      return getSortableTime(a.created_at) - getSortableTime(b.created_at);
                    }).map((u) => (
                      <div key={u.id} className="item-card" style={{ cursor: "default" }}>
                        <div className="row" style={{ alignItems: "flex-start" }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700 }}>{u.username}</div>
                            <div className="muted" style={{ marginTop: 4 }}>Created: {formatDate(u.created_at)}</div>
                          </div>
                          {isOwner && editingUserRole.userId === u.id ? (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <select
                                name="editingRole"
                                value={editingUserRole.newRole}
                                onChange={(event) => setEditingUserRole({ ...editingUserRole, newRole: event.target.value })}
                                style={{ padding: "6px 10px", fontSize: "13px" }}
                              >
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                              </select>
                              <button
                                type="button"
                                onClick={() => handleUpdateRole(u.id, editingUserRole.newRole)}
                                disabled={busy}
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                                title="Save role changes"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="secondary"
                                onClick={() => setEditingUserRole({ userId: null, newRole: "user" })}
                                style={{ padding: "6px 12px", fontSize: "13px" }}
                                title="Cancel role changes"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                              <span
                                className={`badge ${
                                  u.role === "owner" ? "danger" : u.role === "admin" ? "warning" : "success"
                                }`}
                              >
                                {u.role === "owner" ? "Owner" : u.role === "admin" ? "Admin" : "User"}
                              </span>
                              {isOwner && u.role !== "owner" ? (
                                <button
                                  type="button"
                                  className="secondary"
                                  onClick={() => setEditingUserRole({ userId: u.id, newRole: u.role })}
                                  style={{ padding: "6px 10px", fontSize: "12px" }}
                                  title="Change user role"
                                >
                                  Change Role
                                </button>
                              ) : null}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : userManagementView === "create" ? (
              <>
                <h3 style={{ margin: 0 }}>Create User</h3>
                <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
                  {isOwner ? "Create a new user account with any role" : "Create a new user account"}
                </p>
                <form onSubmit={handleCreateUser} className="form-grid">
                  <label>
                    Username
                    <input
                      name="createUsername"
                      value={userForm.username}
                      onChange={(event) => setUserForm({ ...userForm, username: event.target.value })}
                      required
                    />
                  </label>
                  <label>
                    Password
                    <input
                      name="createPassword"
                      type="password"
                      value={userForm.password}
                      onChange={(event) => setUserForm({ ...userForm, password: event.target.value })}
                      required
                    />
                  </label>
                  {isOwner ? (
                    <label>
                      Role
                      <select
                        name="createRole"
                        value={userForm.role}
                        onChange={(event) => setUserForm({ ...userForm, role: event.target.value })}
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>
                    </label>
                  ) : (
                    <div className="muted" style={{ fontSize: 12, padding: "10px 12px", background: "var(--surface-soft)", borderRadius: "10px" }}>
                      Admins can only create users with the "User" role.
                    </div>
                  )}
                  <button type="submit" disabled={busy} title="Create user">
                    Create user
                  </button>
                </form>
              </>
            ) : userManagementView === "reset-password" ? (
              <>
                <h3 style={{ margin: 0 }}>Reset Password</h3>
                <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
                  Reset a user's password
                </p>
                <form onSubmit={handleResetPassword} className="form-grid">
                  <label>
                    Username
                    <select
                      name="resetUsername"
                      value={resetPasswordForm.username}
                      onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, username: event.target.value })}
                      required
                    >
                      <option value="">Select a user...</option>
                      {users.filter((u) => {
                        if (role === "owner") return true;
                        if (role === "admin") return u.username === username || u.role === "user";
                        return u.username === username;
                      }).map((u) => (
                        <option key={u.id} value={u.username}>
                          {u.username}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    New Password
                    <input
                      name="resetPassword"
                      type="password"
                      value={resetPasswordForm.newPassword}
                      onChange={(event) => setResetPasswordForm({ ...resetPasswordForm, newPassword: event.target.value })}
                      required
                    />
                  </label>
                  <button type="submit" disabled={busy} title="Reset password">
                    Reset password
                  </button>
                </form>
              </>
            ) : userManagementView === "logs" ? (
              <>
                {!canCreateUsers ? (
                  <p className="muted">You do not have permission to view audit logs.</p>
                ) : (
                  <>
                    <h3 style={{ margin: 0 }}>View User Logs</h3>
                    <p className="muted" style={{ margin: "0 0 14px", fontSize: 13 }}>
                      User management audit logs showing all role changes, user creations, and password resets
                    </p>
                    {userAuditLogs.length === 0 ? (
                      <p className="muted">No audit logs found.</p>
                    ) : (
                      <div className="list">
                        {userAuditLogs.map((log) => (
                          <div key={log.id} className="item-card" style={{ cursor: "default" }}>
                            <div className="row" style={{ alignItems: "flex-start", marginBottom: 6 }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700 }}>
                                  {log.action === "user_created" ? "User Created" :
                                   log.action === "role_changed" ? "Role Changed" :
                                   log.action === "password_reset" ? "Password Reset" :
                                   log.action}
                                </div>
                                <div className="muted" style={{ marginTop: 4, fontSize: 13 }}>
                                  <strong>{log.actor}</strong> {log.action === "user_created" ? "created" :
                                    log.action === "role_changed" ? "changed role of" :
                                    log.action === "password_reset" ? "reset password for" : "acted on"} <strong>{log.target_user}</strong>
                                </div>
                                {log.details ? (
                                  <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>
                                    {log.details}
                                  </div>
                                ) : null}
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div className="muted" style={{ fontSize: 11 }}>
                                  {formatDate(log.timestamp)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <p className="muted">Select an option from the left menu</p>
              </div>
            )}
          </div>
        </div>
    </Modal>
  );
}
