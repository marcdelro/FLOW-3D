import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export type UserRole = "admin" | "user";

export interface AuthUser {
  username: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  mustChangePassword: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  changePassword: (newPassword: string) => Promise<void>;
  registerUser: (username: string, password: string, role: UserRole) => Promise<void>;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY       = "flow3d_token";
const EXTRA_USERS_KEY = "flow3d_mock_users";
const MUST_CHANGE_KEY = "flow3d_must_change";
const USE_MOCK        = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL         = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const MOCK_CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: "admin123", role: "admin" },
  user:  { password: "user123",  role: "user"  },
};

/* ── Mock user store helpers ──────────────────────────────────────────────── */

type ExtraUser = { password: string; role: UserRole };

function getExtras(): Record<string, ExtraUser> {
  try { return JSON.parse(localStorage.getItem(EXTRA_USERS_KEY) ?? "{}") as Record<string, ExtraUser>; }
  catch { return {}; }
}

function setExtras(data: Record<string, ExtraUser>): void {
  localStorage.setItem(EXTRA_USERS_KEY, JSON.stringify(data));
}

function getMustChangeList(): string[] {
  try { return JSON.parse(localStorage.getItem(MUST_CHANGE_KEY) ?? "[]") as string[]; }
  catch { return []; }
}

function setMustChangeList(list: string[]): void {
  localStorage.setItem(MUST_CHANGE_KEY, JSON.stringify(list));
}

function isMustChange(username: string): boolean {
  return getMustChangeList().includes(username);
}

function addMustChange(username: string): void {
  const list = getMustChangeList();
  if (!list.includes(username)) setMustChangeList([...list, username]);
}

function removeMustChange(username: string): void {
  setMustChangeList(getMustChangeList().filter((u) => u !== username));
}

function lookupMock(username: string): { password: string; role: UserRole } | null {
  const extras = getExtras();
  if (extras[username]) return extras[username];
  if (MOCK_CREDENTIALS[username]) return MOCK_CREDENTIALS[username];
  return null;
}

/* ── JWT helpers ──────────────────────────────────────────────────────────── */

function makeMockJwt(username: string, role: UserRole): string {
  const header  = btoa(JSON.stringify({ alg: "none", typ: "JWT" })).replace(/=/g, "");
  const exp     = Math.floor(Date.now() / 1000) + 60 * 480;
  const payload = btoa(JSON.stringify({ sub: username, role, exp })).replace(/=/g, "");
  return `${header}.${payload}.mock`;
}

function decodeToken(token: string): AuthUser | null {
  try {
    const raw    = token.split(".")[1];
    const padded = raw + "=".repeat((4 - (raw.length % 4)) % 4);
    const obj    = JSON.parse(atob(padded)) as { sub: string; role: UserRole; exp: number };
    if (obj.exp * 1000 < Date.now()) return null;
    return { username: obj.sub, role: obj.role };
  } catch {
    return null;
  }
}

/* ── Provider ─────────────────────────────────────────────────────────────── */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return null;
    if (!decodeToken(stored)) {
      localStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return stored;
  });

  const [mustChangePassword, setMustChangePassword] = useState<boolean>(() => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return false;
    const decoded = decodeToken(stored);
    if (!decoded) return false;
    return isMustChange(decoded.username);
  });

  const user = useMemo<AuthUser | null>(
    () => (token ? decodeToken(token) : null),
    [token],
  );

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    if (USE_MOCK) {
      await new Promise<void>((r) => setTimeout(r, 650));
      const entry = lookupMock(username.toLowerCase());
      if (!entry || entry.password !== password) {
        throw new Error("Invalid username or password.");
      }
      const uname = username.toLowerCase();
      const t = makeMockJwt(uname, entry.role);
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
      setMustChangePassword(isMustChange(uname));
      return;
    }
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail ?? "Invalid username or password.");
    }
    const data = await res.json() as { access_token: string; must_change_password?: boolean };
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
    setMustChangePassword(data.must_change_password ?? false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
    setMustChangePassword(false);
  }, []);

  const changePassword = useCallback(async (newPassword: string): Promise<void> => {
    if (!user) throw new Error("Not authenticated.");
    if (USE_MOCK) {
      await new Promise<void>((r) => setTimeout(r, 500));
      const extras = getExtras();
      const existing = lookupMock(user.username);
      if (!existing) throw new Error("User not found.");
      extras[user.username] = { password: newPassword, role: existing.role };
      setExtras(extras);
      removeMustChange(user.username);
      setMustChangePassword(false);
      return;
    }
    const res = await fetch(`${API_URL}/api/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ new_password: newPassword }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as { detail?: string };
      throw new Error(body.detail ?? "Failed to change password.");
    }
    setMustChangePassword(false);
  }, [user, token]);

  const registerUser = useCallback(async (
    username: string, password: string, role: UserRole,
  ): Promise<void> => {
    if (USE_MOCK) {
      await new Promise<void>((r) => setTimeout(r, 500));
      const uname = username.trim().toLowerCase();
      if (lookupMock(uname)) throw new Error("Username already taken.");
      const extras = getExtras();
      extras[uname] = { password, role };
      setExtras(extras);
      addMustChange(uname);
      return;
    }
    const res = await fetch(`${API_URL}/api/admin/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ username: username.trim(), password, role }),
    });
    if (res.status === 409) throw new Error("Username already taken.");
    if (!res.ok) throw new Error("Failed to create user.");
  }, [token]);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, mustChangePassword, login, logout, changePassword, registerUser, isAdmin: user?.role === "admin" }),
    [user, token, mustChangePassword, login, logout, changePassword, registerUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
