const BASE = "/api";

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    credentials: "include", // send/receive the session cookie
    ...options,
  });
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(data?.error || `Request failed: ${res.status}`);
  }
  return data;
}

export const api = {
  getOfficers: () => request("/auth/officers"),
  createOfficer: (officer) =>
    request("/auth/officers", { method: "POST", body: JSON.stringify(officer) }),
  login: (id, pin) => request("/auth/login", { method: "POST", body: JSON.stringify({ id, pin }) }),
  me: () => request("/auth/me"),
  logout: () => request("/auth/logout", { method: "POST" }),
  deleteOfficer: (id, pin) =>
    request(`/auth/officers/${id}`, { method: "DELETE", body: JSON.stringify({ pin }) }),

  getEntries: () => request("/entries"),
  createEntry: (entry) => request("/entries", { method: "POST", body: JSON.stringify(entry) }),
  updateEntry: (id, entry) =>
    request(`/entries/${id}`, { method: "PUT", body: JSON.stringify(entry) }),
  deleteEntry: (id) => request(`/entries/${id}`, { method: "DELETE" }),

  exportBackup: () => request("/entries/export/backup"),
  importBackup: (payload) =>
    request("/entries/import/backup", { method: "POST", body: JSON.stringify(payload) }),
};
