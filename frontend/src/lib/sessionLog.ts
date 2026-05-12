const LOG_KEY    = "flow3d_session_logs";
const MAX_ENTRIES = 500;

export interface SessionLogEntry {
  id:        string;
  username:  string;
  action:    string;
  detail:    string | null;
  timestamp: string;
}

export function appendSessionLog(
  username: string,
  action:   string,
  detail:   string | null = null,
): void {
  const entry: SessionLogEntry = {
    id:        `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    username,
    action,
    detail,
    timestamp: new Date().toISOString(),
  };
  const updated = [entry, ...getSessionLogs()].slice(0, MAX_ENTRIES);
  try {
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch {
    localStorage.setItem(LOG_KEY, JSON.stringify(updated.slice(0, MAX_ENTRIES / 2)));
  }
}

export function getSessionLogs(): SessionLogEntry[] {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) ?? "[]") as SessionLogEntry[];
  } catch {
    return [];
  }
}
