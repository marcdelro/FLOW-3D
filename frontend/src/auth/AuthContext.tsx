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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = "flow3d_token";
const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

const MOCK_CREDENTIALS: Record<string, { password: string; role: UserRole }> = {
  admin: { password: "admin123", role: "admin" },
  user:  { password: "user123",  role: "user"  },
};

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

  const user = useMemo<AuthUser | null>(
    () => (token ? decodeToken(token) : null),
    [token],
  );

  const login = useCallback(async (username: string, password: string): Promise<void> => {
    if (USE_MOCK) {
      await new Promise<void>((r) => setTimeout(r, 650));
      const entry = MOCK_CREDENTIALS[username.toLowerCase()];
      if (!entry || entry.password !== password) {
        throw new Error("Invalid username or password.");
      }
      const t = makeMockJwt(username.toLowerCase(), entry.role);
      localStorage.setItem(TOKEN_KEY, t);
      setToken(t);
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
    const data = await res.json() as { access_token: string };
    localStorage.setItem(TOKEN_KEY, data.access_token);
    setToken(data.access_token);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, login, logout, isAdmin: user?.role === "admin" }),
    [user, token, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
