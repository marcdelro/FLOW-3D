import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import type { UserRole } from "../auth/AuthContext";

/* ─── Types ──────────────────────────────────────────────────────────────── */

interface UserRow {
  id: number;
  username: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  last_login: string | null;
}

interface LogRow {
  id: number;
  username: string;
  action: string;
  performed_by: string | null;
  ip_address: string | null;
  detail: string | null;
  created_at: string;
}

/* ─── Mock data ───────────────────────────────────────────────────────────── */

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL  = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const INITIAL_MOCK_USERS: UserRow[] = [
  { id: 1, username: "admin",       role: "admin", is_active: true,  created_at: "2026-01-15T08:00:00Z", last_login: "2026-05-12T09:30:00Z" },
  { id: 2, username: "user",        role: "user",  is_active: true,  created_at: "2026-02-01T10:00:00Z", last_login: "2026-05-11T14:22:00Z" },
  { id: 3, username: "dispatcher1", role: "user",  is_active: true,  created_at: "2026-03-10T09:00:00Z", last_login: "2026-05-10T11:05:00Z" },
  { id: 4, username: "driver_jay",  role: "user",  is_active: false, created_at: "2026-04-01T08:00:00Z", last_login: "2026-04-30T16:00:00Z" },
];

const INITIAL_MOCK_LOGS: LogRow[] = [
  { id: 1, username: "admin",       action: "login_ok",        performed_by: null,    ip_address: "192.168.1.10",  detail: null,                        created_at: "2026-05-12T09:30:00Z" },
  { id: 2, username: "user",        action: "login_ok",        performed_by: null,    ip_address: "192.168.1.15",  detail: null,                        created_at: "2026-05-11T14:22:00Z" },
  { id: 3, username: "dispatcher1", action: "login_ok",        performed_by: null,    ip_address: "10.0.0.5",      detail: null,                        created_at: "2026-05-10T11:05:00Z" },
  { id: 4, username: "unknown",     action: "login_fail",      performed_by: null,    ip_address: "203.0.113.42",  detail: "Invalid credentials",       created_at: "2026-05-09T22:11:00Z" },
  { id: 5, username: "driver_jay",  action: "user_deactivated",performed_by: "admin", ip_address: null,            detail: "Account deactivated",       created_at: "2026-05-01T10:00:00Z" },
  { id: 6, username: "dispatcher1", action: "user_created",    performed_by: "admin", ip_address: null,            detail: "New account created",       created_at: "2026-03-10T09:01:00Z" },
];

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

function fmt(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" });
}

const ACTION_CLS: Record<string, string> = {
  login_ok:        "text-green-400",
  login_fail:      "text-red-400",
  logout:          "text-gray-400",
  user_created:    "text-blue-400",
  user_modified:   "text-blue-300",
  user_deactivated:"text-amber-400",
};

const ACTION_LABEL: Record<string, string> = {
  login_ok:        "Login",
  login_fail:      "Login failed",
  logout:          "Logout",
  user_created:    "User created",
  user_modified:   "User modified",
  user_deactivated:"User deactivated",
};

type Tab = "users" | "logs";

/* ─── Component ───────────────────────────────────────────────────────────── */

export function AdminDashboard() {
  const { user, token, logout } = useAuth();
  const navigate                = useNavigate();
  const [lightMode, setLightMode] = useState(true);
  const [tab,       setTab]       = useState<Tab>("users");

  /* Users state */
  const [users,    setUsers]    = useState<UserRow[]>([]);
  const [logs,     setLogs]     = useState<LogRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [netError, setNetError] = useState<string | null>(null);

  /* Toast */
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function showToast(msg: string, ok = true) {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ msg, ok });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }

  /* Add-user modal */
  const [addOpen,    setAddOpen]    = useState(false);
  const [addUsername,setAddUsername]= useState("");
  const [addPassword,setAddPassword]= useState("");
  const [addRole,    setAddRole]    = useState<UserRole>("user");
  const [addError,   setAddError]   = useState<string | null>(null);
  const [addSaving,  setAddSaving]  = useState(false);

  /* Edit-user modal */
  const [editUser,   setEditUser]   = useState<UserRow | null>(null);
  const [editUsername,setEditUsername]= useState("");
  const [editPassword,setEditPassword]= useState("");
  const [editRole,   setEditRole]   = useState<UserRole>("user");
  const [editSaving, setEditSaving] = useState(false);
  const [editError,  setEditError]  = useState<string | null>(null);

  /* Deactivate confirmation popover */
  const [pendingDeactivate, setPendingDeactivate] = useState<number | null>(null);

  /* ── Data fetch ─────────────────────────────────────────────────────────── */
  useEffect(() => {
    async function load() {
      setLoading(true);
      setNetError(null);
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 400));
        setUsers(INITIAL_MOCK_USERS);
        setLogs(INITIAL_MOCK_LOGS);
        setLoading(false);
        return;
      }
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [uRes, lRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/users`,  { headers }),
          fetch(`${API_URL}/api/admin/logs`,   { headers }),
        ]);
        if (uRes.status === 401 || lRes.status === 401) { logout(); navigate("/login", { state: { expired: true } }); return; }
        if (!uRes.ok || !lRes.ok) throw new Error("Failed to load data.");
        setUsers(await uRes.json() as UserRow[]);
        setLogs(await lRes.json() as LogRow[]);
      } catch (e) {
        setNetError(e instanceof Error ? e.message : "Network error.");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [token, logout, navigate]);

  /* ── Add user ───────────────────────────────────────────────────────────── */
  function openAdd() { setAddUsername(""); setAddPassword(""); setAddRole("user"); setAddError(null); setAddOpen(true); }

  async function submitAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addUsername.trim() || !addPassword) { setAddError("All fields are required."); return; }
    setAddError(null); setAddSaving(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 500));
        const conflict = users.find((u) => u.username === addUsername.trim().toLowerCase());
        if (conflict) { setAddError("Username already taken."); return; }
        const newUser: UserRow = {
          id: Math.max(0, ...users.map((u) => u.id)) + 1,
          username: addUsername.trim().toLowerCase(),
          role: addRole, is_active: true,
          created_at: new Date().toISOString(), last_login: null,
        };
        setUsers((prev) => [newUser, ...prev]);
        setLogs((prev) => [{
          id: prev.length + 1, username: newUser.username, action: "user_created",
          performed_by: user?.username ?? "admin", ip_address: null,
          detail: "New account created", created_at: new Date().toISOString(),
        }, ...prev]);
        setAddOpen(false);
        showToast(`User "${newUser.username}" created.`);
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/users`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ username: addUsername.trim(), password: addPassword, role: addRole }),
      });
      if (res.status === 409) { setAddError("Username already taken."); return; }
      if (!res.ok) throw new Error("Failed to create user.");
      const created = await res.json() as UserRow;
      setUsers((prev) => [created, ...prev]);
      setAddOpen(false);
      showToast(`User "${created.username}" created.`);
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setAddSaving(false);
    }
  }

  /* ── Edit user ──────────────────────────────────────────────────────────── */
  function openEdit(u: UserRow) {
    setEditUser(u); setEditUsername(u.username); setEditPassword(""); setEditRole(u.role); setEditError(null);
  }

  async function submitEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editUser) return;
    if (!editUsername.trim()) { setEditError("Username is required."); return; }
    setEditError(null); setEditSaving(true);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 500));
        setUsers((prev) => prev.map((u) =>
          u.id === editUser.id ? { ...u, username: editUsername.trim(), role: editRole } : u,
        ));
        setLogs((prev) => [{
          id: prev.length + 1, username: editUsername.trim(), action: "user_modified",
          performed_by: user?.username ?? "admin", ip_address: null,
          detail: "Account details updated", created_at: new Date().toISOString(),
        }, ...prev]);
        showToast(`User "${editUsername.trim()}" updated.`);
        setEditUser(null);
        return;
      }
      const body: Record<string, string> = { username: editUsername.trim(), role: editRole };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`${API_URL}/api/admin/users/${editUser.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update user.");
      const updated = await res.json() as UserRow;
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      showToast(`User "${updated.username}" updated.`);
      setEditUser(null);
    } catch (e) {
      setEditError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setEditSaving(false);
    }
  }

  /* ── Deactivate ─────────────────────────────────────────────────────────── */
  async function confirmDeactivate(id: number) {
    setPendingDeactivate(null);
    try {
      if (USE_MOCK) {
        await new Promise<void>((r) => setTimeout(r, 400));
        const target = users.find((u) => u.id === id);
        setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: false } : u)));
        setLogs((prev) => [{
          id: prev.length + 1, username: target?.username ?? String(id), action: "user_deactivated",
          performed_by: user?.username ?? "admin", ip_address: null,
          detail: "Account deactivated", created_at: new Date().toISOString(),
        }, ...prev]);
        showToast("User deactivated.", true);
        return;
      }
      const res = await fetch(`${API_URL}/api/admin/users/${id}`, {
        method: "DELETE", headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to deactivate user.");
      setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, is_active: false } : u)));
      showToast("User deactivated.", true);
    } catch (e) {
      showToast(e instanceof Error ? e.message : "Something went wrong.", false);
    }
  }

  /* ── Theme tokens ───────────────────────────────────────────────────────── */
  const shell      = lightMode ? "bg-slate-50 text-slate-900"  : "bg-gray-950 text-gray-100";
  const sideBg     = lightMode ? "bg-white"                    : "bg-gray-950";
  const border     = lightMode ? "border-slate-200"            : "border-gray-800";
  const cardBg     = lightMode ? "bg-white"                    : "bg-gray-900";
  const mutedText  = lightMode ? "text-slate-500"              : "text-gray-500";
  const secondText = lightMode ? "text-slate-600"              : "text-gray-400";
  const headText   = lightMode ? "text-slate-900"              : "text-gray-100";

  /* ── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div className={`h-screen grid grid-cols-[280px_1fr] ${shell} overflow-hidden`}>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <aside className={`border-r ${border} ${sideBg} flex flex-col overflow-hidden`}>
        {/* Header */}
        <div className={`px-5 py-4 border-b ${border} shrink-0 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${lightMode ? "bg-blue-600" : "bg-blue-700"}`}>
              <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 7.5L12 3l10 4.5v9L12 21 2 16.5v-9z" />
                <path d="M12 3v18M2 7.5l10 4.5 10-4.5" />
              </svg>
            </div>
            <div>
              <div className={`text-xl font-bold tracking-tight ${headText}`}>FLOW-3D</div>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`text-xs ${secondText}`}>Admin Panel</span>
                <span className="text-xs font-bold px-1.5 py-0.5 rounded-full bg-violet-950 text-violet-300 border border-violet-800">ADMIN</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setLightMode((m) => !m)}
            aria-label="Toggle theme"
            className={`p-2 rounded-full border-2 transition ${lightMode ? "border-slate-200 text-slate-600 hover:bg-slate-100" : "border-gray-700 text-gray-400 hover:bg-gray-800"}`}
          >
            {lightMode ? (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
              </svg>
            )}
          </button>
        </div>

        {/* Signed-in user */}
        <div className={`px-5 py-4 border-b ${border} shrink-0`}>
          <div className={`text-xs font-semibold uppercase tracking-wider ${mutedText} mb-2`}>Signed in as</div>
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${lightMode ? "bg-violet-100 text-violet-700" : "bg-violet-950 text-violet-300"}`}>
              {(user?.username ?? "A").charAt(0).toUpperCase()}
            </div>
            <div>
              <div className={`text-sm font-bold ${headText}`}>{user?.username}</div>
              <div className={`text-xs ${mutedText}`}>Administrator</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {(["users", "logs"] as Tab[]).map((t) => {
            const labels  = { users: "Users", logs: "Audit Logs" };
            const active  = tab === t;
            return (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
                  active
                    ? lightMode ? "bg-blue-50 text-blue-700" : "bg-blue-950/40 text-blue-300"
                    : lightMode ? "text-slate-700 hover:bg-slate-100" : "text-gray-300 hover:bg-gray-800"
                }`}
              >
                {t === "users" ? (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" />
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><polyline points="14 2 14 8 20 8" />
                    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
                  </svg>
                )}
                {labels[t]}
              </button>
            );
          })}
        </nav>

        {/* Bottom actions */}
        <div className={`px-3 py-4 border-t ${border} space-y-1 shrink-0`}>
          <Link
            to="/app"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition ${
              lightMode ? "text-slate-700 hover:bg-slate-100" : "text-gray-300 hover:bg-gray-800"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 5l-7 7 7 7" />
            </svg>
            Open Simulator
          </Link>
          <button
            onClick={() => { logout(); navigate("/login", { replace: true }); }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-left transition ${
              lightMode ? "text-red-600 hover:bg-red-50" : "text-red-400 hover:bg-red-950/30"
            }`}
          >
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main area ───────────────────────────────────────────────────────── */}
      <main className="flex flex-col overflow-hidden">
        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : netError ? (
          <div className="flex-1 flex items-center justify-center px-8">
            <div className={`rounded-2xl border-2 p-8 text-center max-w-sm ${lightMode ? "border-red-200 bg-red-50 text-red-800" : "border-red-900/50 bg-red-950/40 text-red-300"}`}>
              <p className="font-bold text-lg mb-2">Could not load data</p>
              <p className="text-sm">{netError}</p>
            </div>
          </div>
        ) : tab === "users" ? (
          <UsersTab
            users={users}
            lightMode={lightMode}
            border={border}
            cardBg={cardBg}
            headText={headText}
            secondText={secondText}
            mutedText={mutedText}
            pendingDeactivate={pendingDeactivate}
            setPendingDeactivate={setPendingDeactivate}
            onAdd={openAdd}
            onEdit={openEdit}
            onConfirmDeactivate={confirmDeactivate}
          />
        ) : (
          <LogsTab
            logs={logs}
            lightMode={lightMode}
            border={border}
            cardBg={cardBg}
            headText={headText}
            secondText={secondText}
            mutedText={mutedText}
          />
        )}
      </main>

      {/* ── Add user modal ───────────────────────────────────────────────────── */}
      {addOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className={`rounded-2xl border-2 ${border} ${cardBg} p-6 w-full max-w-sm shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold mb-5 ${headText}`}>Add User</h2>
            <form onSubmit={submitAdd} className="space-y-4">
              {addError && (
                <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${lightMode ? "border-red-300 bg-red-50 text-red-800" : "border-red-900/50 bg-red-950/40 text-red-300"}`}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {addError}
                </div>
              )}
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>Username</label>
                <input value={addUsername} onChange={(e) => { setAddUsername(e.target.value); setAddError(null); }} disabled={addSaving}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${lightMode ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400" : "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-600"}`}
                  placeholder="Enter username" />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>Password</label>
                <input type="password" value={addPassword} onChange={(e) => setAddPassword(e.target.value)} disabled={addSaving}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${lightMode ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400" : "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-600"}`}
                  placeholder="Enter password" />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>Role</label>
                <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${lightMode ? "border-slate-200 bg-slate-100" : "border-gray-700 bg-gray-800"}`}>
                  {(["user", "admin"] as UserRole[]).map((r) => (
                    <button type="button" key={r} onClick={() => setAddRole(r)}
                      className={`py-2 rounded-lg text-sm font-semibold capitalize transition ${addRole === r
                        ? r === "admin" ? "bg-violet-600 text-white" : "bg-blue-600 text-white"
                        : lightMode ? "text-slate-600 hover:text-slate-900" : "text-gray-400 hover:text-gray-200"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setAddOpen(false)} disabled={addSaving}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border-2 transition ${lightMode ? "border-slate-200 text-slate-700 hover:bg-slate-100" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}>
                  Cancel
                </button>
                <button type="submit" disabled={addSaving || !addUsername.trim() || !addPassword}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {addSaving ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Creating…</> : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit user modal ──────────────────────────────────────────────────── */}
      {editUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
          <div className={`rounded-2xl border-2 ${border} ${cardBg} p-6 w-full max-w-sm shadow-2xl`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold mb-5 ${headText}`}>Edit User</h2>
            <form onSubmit={submitEdit} className="space-y-4">
              {editError && (
                <div className={`rounded-xl border px-4 py-3 text-sm flex items-center gap-2 ${lightMode ? "border-red-300 bg-red-50 text-red-800" : "border-red-900/50 bg-red-950/40 text-red-300"}`}>
                  <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  {editError}
                </div>
              )}
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>Username</label>
                <input value={editUsername} onChange={(e) => { setEditUsername(e.target.value); setEditError(null); }} disabled={editSaving}
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${lightMode ? "border-slate-200 bg-white text-slate-900" : "border-gray-700 bg-gray-800 text-gray-100"}`} />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>New password <span className={`font-normal ${mutedText}`}>(leave blank to keep)</span></label>
                <input type="password" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} disabled={editSaving}
                  placeholder="Enter new password"
                  className={`w-full rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${lightMode ? "border-slate-200 bg-white text-slate-900 placeholder-slate-400" : "border-gray-700 bg-gray-800 text-gray-100 placeholder-gray-600"}`} />
              </div>
              <div>
                <label className={`block text-sm font-semibold mb-1.5 ${secondText}`}>Role</label>
                <div className={`grid grid-cols-2 gap-2 rounded-xl border p-1 ${lightMode ? "border-slate-200 bg-slate-100" : "border-gray-700 bg-gray-800"}`}>
                  {(["user", "admin"] as UserRole[]).map((r) => (
                    <button type="button" key={r} onClick={() => setEditRole(r)}
                      className={`py-2 rounded-lg text-sm font-semibold capitalize transition ${editRole === r
                        ? r === "admin" ? "bg-violet-600 text-white" : "bg-blue-600 text-white"
                        : lightMode ? "text-slate-600 hover:text-slate-900" : "text-gray-400 hover:text-gray-200"}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditUser(null)} disabled={editSaving}
                  className={`flex-1 rounded-xl py-2.5 text-sm font-semibold border-2 transition ${lightMode ? "border-slate-200 text-slate-700 hover:bg-slate-100" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}>
                  Cancel
                </button>
                <button type="submit" disabled={editSaving || !editUsername.trim()}
                  className="flex-1 rounded-xl py-2.5 text-sm font-semibold bg-blue-600 hover:bg-blue-500 text-white transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                  {editSaving ? <><svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>Saving…</> : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 rounded-xl border-2 px-4 py-3 flex items-center gap-3 shadow-xl text-sm font-semibold transition-all ${
          toast.ok
            ? lightMode ? "border-green-300 bg-green-50 text-green-800" : "border-green-800 bg-green-950 text-green-200"
            : lightMode ? "border-red-300 bg-red-50 text-red-800"       : "border-red-800 bg-red-950 text-red-200"
        }`}>
          {toast.ok ? (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          )}
          {toast.msg}
        </div>
      )}
    </div>
  );
}

/* ─── Users tab ───────────────────────────────────────────────────────────── */

function UsersTab({
  users, lightMode, border, cardBg, headText, secondText, mutedText,
  pendingDeactivate, setPendingDeactivate, onAdd, onEdit, onConfirmDeactivate,
}: {
  users: UserRow[];
  lightMode: boolean;
  border: string; cardBg: string; headText: string; secondText: string; mutedText: string;
  pendingDeactivate: number | null;
  setPendingDeactivate: (id: number | null) => void;
  onAdd: () => void;
  onEdit: (u: UserRow) => void;
  onConfirmDeactivate: (id: number) => void;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className={`rounded-2xl border-2 ${border} ${cardBg} overflow-hidden`}>
        {/* Header */}
        <div className={`px-6 py-4 border-b ${border} flex items-center justify-between`}>
          <div>
            <h2 className={`text-lg font-bold ${headText}`}>Users</h2>
            <p className={`text-sm ${mutedText}`}>{users.length} account{users.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold rounded-xl px-4 py-2.5 transition"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${border}`}>
                {["Username", "Role", "Status", "Last Login", "Actions"].map((h) => (
                  <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-inherit">
              {users.map((u) => (
                <tr key={u.id} className={`${lightMode ? "divide-slate-100 hover:bg-slate-50" : "divide-gray-800 hover:bg-gray-800/40"} transition`}>
                  <td className={`px-6 py-4 font-semibold ${headText}`}>
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${u.role === "admin" ? lightMode ? "bg-violet-100 text-violet-700" : "bg-violet-950 text-violet-300" : lightMode ? "bg-blue-100 text-blue-700" : "bg-blue-950 text-blue-300"}`}>
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      {u.username}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${u.role === "admin"
                      ? lightMode ? "bg-violet-100 text-violet-800 border-violet-300" : "bg-violet-950 text-violet-200 border-violet-800"
                      : lightMode ? "bg-teal-100 text-teal-800 border-teal-300"       : "bg-teal-950 text-teal-200 border-teal-800"}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${u.is_active
                      ? lightMode ? "bg-green-100 text-green-800 border-green-300" : "bg-green-950 text-green-200 border-green-800"
                      : lightMode ? "bg-slate-100 text-slate-500 border-slate-300"  : "bg-gray-800 text-gray-500 border-gray-700"}`}>
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className={`px-6 py-4 font-mono text-xs ${secondText}`}>{fmt(u.last_login)}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onEdit(u)}
                        className={`p-1.5 rounded-lg transition ${lightMode ? "text-slate-500 hover:text-blue-600 hover:bg-blue-50" : "text-gray-500 hover:text-blue-400 hover:bg-blue-950/30"}`}
                        aria-label="Edit"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      <div className="relative">
                        <button
                          disabled={!u.is_active}
                          onClick={() => setPendingDeactivate(pendingDeactivate === u.id ? null : u.id)}
                          className={`p-1.5 rounded-lg transition disabled:opacity-30 disabled:cursor-not-allowed ${
                            pendingDeactivate === u.id
                              ? "text-red-500 bg-red-50 dark:bg-red-950/30"
                              : lightMode ? "text-slate-500 hover:text-red-600 hover:bg-red-50" : "text-gray-500 hover:text-red-400 hover:bg-red-950/30"
                          }`}
                          aria-label="Deactivate"
                        >
                          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                        {pendingDeactivate === u.id && (
                          <div className={`absolute bottom-full right-0 mb-2 w-48 rounded-xl shadow-xl border-2 p-3 z-20 ${lightMode ? "bg-white border-red-300" : "bg-gray-900 border-red-900/60"}`}>
                            <p className={`text-sm font-bold mb-1 ${lightMode ? "text-slate-900" : "text-gray-100"}`}>Deactivate?</p>
                            <p className={`text-xs mb-3 ${mutedText}`}>"{u.username}" will lose access immediately.</p>
                            <div className="flex gap-2">
                              <button onClick={() => setPendingDeactivate(null)}
                                className={`flex-1 text-xs font-semibold rounded-lg py-1.5 border transition ${lightMode ? "border-slate-200 text-slate-700 hover:bg-slate-100" : "border-gray-700 text-gray-300 hover:bg-gray-800"}`}>
                                Cancel
                              </button>
                              <button onClick={() => onConfirmDeactivate(u.id)}
                                className="flex-1 text-xs font-semibold rounded-lg py-1.5 bg-red-600 hover:bg-red-500 text-white transition">
                                Deactivate
                              </button>
                            </div>
                            <div className={`absolute bottom-[-6px] right-4 w-3 h-3 rotate-45 border-r-2 border-b-2 ${lightMode ? "bg-white border-red-300" : "bg-gray-900 border-red-900/60"}`} />
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ─── Logs tab ────────────────────────────────────────────────────────────── */

function LogsTab({
  logs, lightMode, border, cardBg, headText, secondText, mutedText,
}: {
  logs: LogRow[];
  lightMode: boolean;
  border: string; cardBg: string; headText: string; secondText: string; mutedText: string;
}) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className={`rounded-2xl border-2 ${border} ${cardBg} overflow-hidden`}>
        <div className={`px-6 py-4 border-b ${border}`}>
          <h2 className={`text-lg font-bold ${headText}`}>Audit Log</h2>
          <p className={`text-sm ${mutedText}`}>Last {logs.length} events</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className={`border-b ${border}`}>
                {["Timestamp", "User", "Action", "Performed By", "IP", "Detail"].map((h) => (
                  <th key={h} className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider ${mutedText}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id} className={`border-b ${border} ${lightMode ? "hover:bg-slate-50" : "hover:bg-gray-800/40"} transition`}>
                  <td className={`px-6 py-3 font-mono text-xs ${secondText} whitespace-nowrap`}>{fmt(l.created_at)}</td>
                  <td className={`px-6 py-3 font-semibold ${headText}`}>{l.username}</td>
                  <td className="px-6 py-3">
                    <span className={`text-xs font-bold ${ACTION_CLS[l.action] ?? "text-gray-400"}`}>
                      {ACTION_LABEL[l.action] ?? l.action}
                    </span>
                  </td>
                  <td className={`px-6 py-3 text-xs ${mutedText}`}>{l.performed_by ?? "—"}</td>
                  <td className={`px-6 py-3 font-mono text-xs ${mutedText}`}>{l.ip_address ?? "—"}</td>
                  <td className={`px-6 py-3 text-xs ${secondText}`}>{l.detail ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default AdminDashboard;
