import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Shield, LogOut, Plus, Search, MapPin, Clock, X, Trash2, Download,
  ChevronDown, FileText, Pencil, Check, Upload, HardDriveDownload, ArrowLeft,
} from "lucide-react";
import { api } from "./api/client";

const ACTIVITY_TYPES = ["Investigation", "Patrol", "Arrest", "Complaint Follow-up", "Court Duty", "Other"];
const STATUSES = ["Ongoing", "Pending", "Completed"];

const STATUS_COLOR = {
  Ongoing: "var(--steel)",
  Pending: "var(--rust)",
  Completed: "var(--moss)",
};
const STATUS_LABEL = { Ongoing: "ONG", Pending: "PEND", Completed: "OK" };

function pad(n) {
  return String(n).padStart(2, "0");
}
function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function nowStr() {
  const d = new Date();
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
function fmtDate(dstr) {
  const d = new Date(dstr + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [officers, setOfficers] = useState([]);
  const [officer, setOfficer] = useState(null); // logged-in officer
  const [authed, setAuthed] = useState(false);
  const [entries, setEntries] = useState([]);
  const [errorMsg, setErrorMsg] = useState("");

  // login flow state
  const [loginMode, setLoginMode] = useState("pick"); // "pick" | "pin" | "create"
  const [selectedOfficer, setSelectedOfficer] = useState(null);
  const [nameInput, setNameInput] = useState("");
  const [badgeInput, setBadgeInput] = useState("");
  const [pinInput, setPinInput] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [loginError, setLoginError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deletePin, setDeletePin] = useState("");
  const [deleteError, setDeleteError] = useState("");

  // dashboard state
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportFrom, setReportFrom] = useState(todayStr());
  const [reportTo, setReportTo] = useState(todayStr());
  const [reportData, setReportData] = useState(null);

  const [fDate, setFDate] = useState(todayStr());
  const [fTime, setFTime] = useState(nowStr());
  const [fType, setFType] = useState(ACTIVITY_TYPES[0]);
  const [fLocation, setFLocation] = useState("");
  const [fStatus, setFStatus] = useState("Ongoing");
  const [fNotes, setFNotes] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const fileInputRef = useRef(null);
  const [showDeleteAccount, setShowDeleteAccount] = useState(false);
  const [deleteAccountPin, setDeleteAccountPin] = useState("");
  const [deleteAccountError, setDeleteAccountError] = useState("");

  const recentLocations = useMemo(() => {
    const seen = [];
    for (const e of entries) {
      if (!seen.includes(e.location) && e.location) seen.push(e.location);
      if (seen.length >= 5) break;
    }
    return seen;
  }, [entries]);

  async function loadOfficers() {
    try {
      const list = await api.getOfficers();
      setOfficers(list);
    } catch (e) {
      setErrorMsg("Could not reach the server. Is it running on http://localhost:4000?");
    }
  }

  useEffect(() => {
    (async () => {
      try {
        const me = await api.me();
        setOfficer(me);
        setAuthed(true);
      } catch (e) {
        await loadOfficers();
      }
      setLoading(false);
    })();
  }, []);

  async function refreshEntries() {
    try {
      const list = await api.getEntries();
      setEntries(list);
    } catch (e) {
      setErrorMsg(e.message);
    }
  }

  useEffect(() => {
    if (authed && officer) refreshEntries();
  }, [authed, officer]);

  function pickOfficer(o) {
    setSelectedOfficer(o);
    setPinInput("");
    setLoginError("");
    setLoginMode("pin");
  }
  function startCreateOfficer() {
    setNameInput("");
    setBadgeInput("");
    setPinInput("");
    setConfirmPin("");
    setLoginError("");
    setLoginMode("create");
  }
  function backToPick() {
    setLoginMode("pick");
    setSelectedOfficer(null);
    setLoginError("");
  }

  function askDeleteOfficer(o) {
    setDeleteTarget(o);
    setDeletePin("");
    setDeleteError("");
  }
  async function confirmDeleteOfficer() {
    try {
      await api.deleteOfficer(deleteTarget.id, deletePin);
      setDeleteTarget(null);
      setDeletePin("");
      await loadOfficers();
    } catch (e) {
      setDeleteError(e.message || "Incorrect PIN");
    }
  }

  async function handleCreateOfficer() {
    if (!nameInput.trim() || !badgeInput.trim() || pinInput.length !== 4 || pinInput !== confirmPin) {
      setLoginError(pinInput !== confirmPin ? "PINs do not match" : "Fill all fields with a 4-digit PIN");
      return;
    }
    try {
      const o = await api.createOfficer({ name: nameInput.trim(), badgeNo: badgeInput.trim(), pin: pinInput });
      setOfficer(o);
      setAuthed(true);
    } catch (e) {
      setLoginError(e.message);
    }
  }
  async function handleUnlock() {
    try {
      const o = await api.login(selectedOfficer.id, pinInput);
      setOfficer(o);
      setAuthed(true);
      setLoginError("");
    } catch (e) {
      setLoginError(e.message || "Incorrect PIN");
      setPinInput("");
    }
  }
  async function handleLogout() {
    try {
      await api.logout();
    } catch (e) { }
    setAuthed(false);
    setOfficer(null);
    setEntries([]);
    setLoginMode("pick");
    setSelectedOfficer(null);
    await loadOfficers();
  }

  async function confirmDeleteOwnAccount() {
    try {
      await api.deleteOfficer(officer.id, deleteAccountPin);
      setShowDeleteAccount(false);
      setDeleteAccountPin("");
      await handleLogout();
    } catch (e) {
      setDeleteAccountError(e.message || "Incorrect PIN");
    }
  }

  function openNewEntry() {
    setEditingId(null);
    setFDate(todayStr());
    setFTime(nowStr());
    setFType(ACTIVITY_TYPES[0]);
    setFLocation("");
    setFStatus("Ongoing");
    setFNotes("");
    setShowEntryForm(true);
  }
  function openEditEntry(entry) {
    setEditingId(entry.id);
    setFDate(entry.date);
    setFTime(entry.time);
    setFType(entry.type);
    setFLocation(entry.location);
    setFStatus(entry.status);
    setFNotes(entry.notes);
    setShowEntryForm(true);
  }
  async function handleSaveEntry() {
    if (!fLocation.trim()) return;
    const payload = { date: fDate, time: fTime, type: fType, location: fLocation.trim(), status: fStatus, notes: fNotes.trim() };
    try {
      if (editingId) {
        await api.updateEntry(editingId, payload);
      } else {
        const created = await api.createEntry(payload);
        setOfficer((p) => ({ ...p, nextEntryNo: created.regNo + 1 }));
      }
      await refreshEntries();
      setShowEntryForm(false);
      setEditingId(null);
    } catch (e) {
      setErrorMsg(e.message);
    }
  }
  async function handleDelete(id) {
    try {
      await api.deleteEntry(id);
      await refreshEntries();
      setConfirmDeleteId(null);
    } catch (e) {
      setErrorMsg(e.message);
    }
  }

  async function exportBackup() {
    const payload = await api.exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duty-register-${officer.badgeNo}-${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function importBackup(file) {
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = JSON.parse(evt.target.result);
        await api.importBackup(data);
        await refreshEntries();
      } catch (e) {
        setErrorMsg("Could not restore backup — invalid file.");
      }
    };
    reader.readAsText(file);
  }

  const filtered = useMemo(() => {
    return entries
      .filter((e) => (statusFilter === "All" ? true : e.status === statusFilter))
      .filter((e) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return e.location.toLowerCase().includes(q) || e.notes.toLowerCase().includes(q) || e.type.toLowerCase().includes(q);
      })
      .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  }, [entries, search, statusFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = entries.filter((e) => {
      const d = new Date(e.date + "T00:00:00");
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    const pending = entries.filter((e) => e.status === "Pending").length;
    return { total: entries.length, thisMonth, pending };
  }, [entries]);

  function generateReport() {
    const list = entries
      .filter((e) => e.date >= reportFrom && e.date <= reportTo)
      .sort((a, b) => (a.date + a.time > b.date + b.time ? 1 : -1));
    setReportData(list);
    setTimeout(() => window.print(), 150);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ink-950)]">
        <div className="text-[var(--paper-dim)] font-mono text-sm">loading register…</div>
      </div>
    );
  }

  if (errorMsg && officers.length === 0 && !authed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--ink-950)] p-6">
        <div className="text-[var(--rust)] font-mono text-sm text-center max-w-sm">{errorMsg}</div>
      </div>
    );
  }

  // ---------- LOGIN / OFFICER SELECT ----------
  if (!authed) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[var(--ink-950)] p-6 relative overflow-hidden">
        <div className="relative w-full max-w-sm">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 rounded-full border-2 border-[var(--brass)] flex items-center justify-center mb-4">
              <Shield size={26} color="var(--brass)" strokeWidth={1.5} />
            </div>
            <div className="text-[var(--brass)] text-xl text-center underline tracking-[0.35em] uppercase" style={{ fontFamily: "Oswald, sans-serif" }}>
              J.P Road police station Duty Register
            </div>
          </div>

          <div className="bg-[var(--ink-800)] border border-[var(--ink-600)] rounded-sm p-6">
            {loginMode === "pick" && (
              <>
                <div className="text-[var(--paper)] text-sm mb-4" style={{ fontFamily: "Oswald, sans-serif" }}>SELECT OFFICER</div>
                {officers.length === 0 && (
                  <div className="text-[var(--paper-dim)] text-xs mb-4">No officers set up yet. Create the first profile below.</div>
                )}
                <div className="space-y-2 mb-4">
                  {officers.map((o) => (
                    <div key={o.id}
                      className="w-full flex items-center gap-3 bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm px-3 py-2.5 hover:border-[var(--brass)] transition-colors">
                      <button onClick={() => pickOfficer(o)} className="flex items-center gap-3 flex-1 text-left">
                        <div className="w-8 h-8 rounded-full border border-[var(--brass)] flex items-center justify-center shrink-0">
                          <Shield size={14} color="var(--brass)" />
                        </div>
                        <div>
                          <div className="text-[var(--paper)] text-sm font-medium">{o.name}</div>
                          <div className="text-[var(--paper-dim)] text-xs font-mono">{o.badgeNo}</div>
                        </div>
                      </button>
                      <button onClick={() => askDeleteOfficer(o)} className="text-[var(--paper-dim)] hover:text-[var(--rust)] p-1 shrink-0">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
                <button onClick={startCreateOfficer}
                  className="w-full flex items-center justify-center gap-2 border border-dashed border-[var(--khaki)] text-[var(--khaki)] py-2.5 rounded-sm text-sm hover:border-[var(--brass)] hover:text-[var(--brass)] transition-colors">
                  <Plus size={15} /> New Officer
                </button>
              </>
            )}

            {loginMode === "create" && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <button onClick={backToPick} className="text-[var(--paper-dim)]"><ArrowLeft size={16} /></button>
                  <div className="text-[var(--paper)] text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>CREATE PROFILE</div>
                </div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Name</label>
                <input value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-4 outline-none focus:border-[var(--brass)] font-mono text-sm"
                  placeholder="Officer name" />
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Badge / Service No.</label>
                <input value={badgeInput} onChange={(e) => setBadgeInput(e.target.value)}
                  className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-4 outline-none focus:border-[var(--brass)] font-mono text-sm"
                  placeholder="e.g. GJ-04521" />
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Set 4-digit PIN</label>
                <input value={pinInput} maxLength={4} onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-4 outline-none focus:border-[var(--brass)] font-mono text-sm tracking-[0.5em]"
                  placeholder="••••" type="password" />
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Confirm PIN</label>
                <input value={confirmPin} maxLength={4} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
                  className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-5 outline-none focus:border-[var(--brass)] font-mono text-sm tracking-[0.5em]"
                  placeholder="••••" type="password" />
                {loginError && <div className="text-[var(--rust)] text-xs mb-3 font-mono">{loginError}</div>}
                <button onClick={handleCreateOfficer}
                  className="w-full bg-[var(--brass)] text-[var(--ink-950)] py-2.5 rounded-sm text-sm font-semibold tracking-wide hover:bg-[#d8ab57] transition-colors"
                  style={{ fontFamily: "Oswald, sans-serif" }}>CREATE PROFILE</button>
              </>
            )}

            {loginMode === "pin" && selectedOfficer && (
              <>
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={backToPick} className="text-[var(--paper-dim)]"><ArrowLeft size={16} /></button>
                  <div className="text-[var(--paper)] text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>WELCOME BACK</div>
                </div>
                <div className="text-[var(--brass)] text-lg mb-5 font-semibold pl-1">{selectedOfficer.name}</div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Enter PIN</label>
                <input value={pinInput} maxLength={4} autoFocus onChange={(e) => setPinInput(e.target.value.replace(/\D/g, ""))}
                  onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
                  className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-4 outline-none focus:border-[var(--brass)] font-mono text-lg tracking-[0.6em] text-center"
                  placeholder="••••" type="password" />
                {loginError && <div className="text-[var(--rust)] text-xs mb-3 font-mono text-center">{loginError}</div>}
                <button onClick={handleUnlock}
                  className="w-full bg-[var(--brass)] text-[var(--ink-950)] py-2.5 rounded-sm text-sm font-semibold tracking-wide hover:bg-[#d8ab57] transition-colors"
                  style={{ fontFamily: "Oswald, sans-serif" }}>UNLOCK REGISTER</button>
                <div className="mt-4 border border-[var(--ink-600)] rounded-sm px-3 py-2.5 text-center">
                  <div className="text-[var(--paper-dim)] text-xs">
                    Forgot your PIN? Contact the developer Shailyarajsinh Mahida — they can retrieve it for you.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {deleteTarget && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
            <div className="bg-[var(--ink-800)] border border-[var(--rust)] w-full max-w-xs rounded-sm p-5">
              <div className="text-[var(--paper)] text-sm mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>DELETE OFFICER?</div>
              <div className="text-[var(--paper-dim)] text-xs mb-4">
                This permanently deletes <span className="text-[var(--brass)]">{deleteTarget.name}</span> and all of their logged entries. Enter their PIN to confirm.
              </div>
              <input value={deletePin} maxLength={4} autoFocus onChange={(e) => setDeletePin(e.target.value.replace(/\D/g, ""))}
                onKeyDown={(e) => e.key === "Enter" && confirmDeleteOfficer()}
                className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-3 outline-none focus:border-[var(--rust)] font-mono text-lg tracking-[0.6em] text-center"
                placeholder="••••" type="password" />
              {deleteError && <div className="text-[var(--rust)] text-xs mb-3 font-mono text-center">{deleteError}</div>}
              <div className="flex gap-2">
                <button onClick={() => setDeleteTarget(null)}
                  className="flex-1 border border-[var(--ink-600)] text-[var(--paper-dim)] py-2 rounded-sm text-sm">Cancel</button>
                <button onClick={confirmDeleteOfficer}
                  className="flex-1 bg-[var(--rust)] text-[var(--paper)] py-2 rounded-sm text-sm font-semibold">Delete</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ---------- DASHBOARD ----------
  const groups = [];
  let lastDate = null;
  for (const e of filtered) {
    if (e.date !== lastDate) {
      groups.push({ date: e.date, items: [] });
      lastDate = e.date;
    }
    groups[groups.length - 1].items.push(e);
  }

  return (
    <div className="min-h-screen w-full bg-[var(--ink-950)]">
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-only { display: block !important; }
          body { background: white; }
        }
        .print-only { display: none; }
      `}</style>

      <div className="no-print">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--ink-600)]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full border border-[var(--brass)] flex items-center justify-center">
              <Shield size={16} color="var(--brass)" strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-[var(--paper)] text-sm font-semibold leading-tight">{officer.name}</div>
              <div className="text-[var(--paper-dim)] text-xs font-mono leading-tight">{officer.badgeNo}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input ref={fileInputRef} type="file" accept="application/json" style={{ display: "none" }}
              onChange={(e) => { if (e.target.files[0]) importBackup(e.target.files[0]); e.target.value = ""; }} />
            <button onClick={() => fileInputRef.current && fileInputRef.current.click()} title="Restore backup"
              className="text-[var(--paper-dim)] hover:text-[var(--brass)] p-2"><Upload size={16} /></button>
            <button onClick={exportBackup} title="Backup data as JSON"
              className="text-[var(--paper-dim)] hover:text-[var(--brass)] p-2"><HardDriveDownload size={16} /></button>
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-1.5 text-[var(--paper-dim)] hover:text-[var(--brass)] text-xs border border-[var(--ink-600)] rounded-sm px-3 py-2 transition-colors"
              style={{ fontFamily: "Oswald, sans-serif" }}><Download size={14} /> PDF</button>
            <button onClick={() => setShowDeleteAccount(true)} title="Delete my account"
              className="text-[var(--paper-dim)] hover:text-[var(--rust)] p-2"><Trash2 size={16} /></button>
            <button onClick={handleLogout} className="text-[var(--paper-dim)] hover:text-[var(--rust)] p-2"><LogOut size={16} /></button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 px-5 py-4">
          {[
            { label: "TOTAL", value: stats.total, color: "var(--brass)" },
            { label: "THIS MONTH", value: stats.thisMonth, color: "var(--steel)" },
            { label: "PENDING", value: stats.pending, color: "var(--rust)" },
          ].map((s) => (
            <div key={s.label} className="bg-[var(--ink-800)] border border-[var(--ink-600)] rounded-sm py-3 flex flex-col items-center">
              <div className="font-mono text-2xl font-semibold" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[var(--paper-dim)] text-[10px] tracking-[0.2em] mt-1" style={{ fontFamily: "Oswald, sans-serif" }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 px-5 pb-3">
          <div className="flex-1 flex items-center gap-2 bg-[var(--ink-800)] border border-[var(--ink-600)] rounded-sm px-3 py-2">
            <Search size={14} color="var(--paper-dim)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search location, notes, type…"
              className="bg-transparent outline-none text-[var(--paper)] text-sm w-full placeholder:text-[var(--paper-dim)]" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-[var(--ink-800)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm pl-3 pr-8 py-2 outline-none">
              <option>All</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
            <ChevronDown size={14} color="var(--paper-dim)" className="absolute right-2.5 top-2.5 pointer-events-none" />
          </div>
        </div>

        <div className="px-5 pb-24">
          {filtered.length === 0 ? (
            <div className="text-center py-16">
              <FileText size={28} color="var(--paper-dim)" className="mx-auto mb-3" />
              <div className="text-[var(--paper-dim)] text-sm">Your register is empty.</div>
              <div className="text-[var(--paper-dim)] text-xs mt-1">Log your first duty entry to begin.</div>
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.date} className="mb-5">
                <div className="text-[var(--khaki)] text-[11px] tracking-[0.15em] mb-2 pb-1 border-b border-[var(--ink-600)]" style={{ fontFamily: "Oswald, sans-serif" }}>
                  {fmtDate(g.date).toUpperCase()}
                </div>
                <div className="relative pl-4 border-l border-[var(--ink-600)]">
                  {g.items.map((e) => (
                    <div key={e.id} className="relative mb-3 group">
                      <div className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full border-2"
                        style={{ borderColor: STATUS_COLOR[e.status], background: "var(--ink-950)" }} />
                      <div className="bg-[var(--ink-800)] border border-[var(--ink-600)] rounded-sm p-3">
                        <div className="flex items-start justify-between mb-1.5">
                          <div className="flex items-center gap-2 font-mono text-xs text-[var(--paper-dim)]">
                            <span className="text-[var(--brass)]">No. {String(e.regNo).padStart(3, "0")}</span>
                            <span className="flex items-center gap-1"><Clock size={11} /> {e.time}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <div className="text-[10px] font-mono px-2 py-0.5 rounded-full border"
                              style={{ color: STATUS_COLOR[e.status], borderColor: STATUS_COLOR[e.status] }}>{STATUS_LABEL[e.status]}</div>
                            <button onClick={() => openEditEntry(e)} className="text-[var(--paper-dim)] hover:text-[var(--brass)]"><Pencil size={13} /></button>
                            {confirmDeleteId === e.id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(e.id)} className="text-[var(--rust)]"><Check size={14} /></button>
                                <button onClick={() => setConfirmDeleteId(null)} className="text-[var(--paper-dim)]"><X size={14} /></button>
                              </div>
                            ) : (
                              <button onClick={() => setConfirmDeleteId(e.id)} className="text-[var(--paper-dim)] hover:text-[var(--rust)]"><Trash2 size={13} /></button>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 border border-[var(--khaki)] rounded-sm text-[var(--khaki)]" style={{ fontFamily: "Oswald, sans-serif" }}>{e.type}</span>
                          <span className="flex items-center gap-1 text-[var(--paper)] text-xs"><MapPin size={11} color="var(--paper-dim)" /> {e.location}</span>
                        </div>
                        {e.notes && <div className="text-[var(--paper-dim)] text-xs mt-1.5 leading-relaxed">{e.notes}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <button onClick={openNewEntry}
          className="fixed bottom-6 right-6 bg-[var(--brass)] text-[var(--ink-950)] rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-[#d8ab57] transition-colors">
          <Plus size={24} strokeWidth={2.5} />
        </button>
      </div>

      {showEntryForm && (
        <div className="no-print fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-[var(--ink-800)] border border-[var(--ink-600)] w-full sm:max-w-md rounded-t-lg sm:rounded-sm p-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[var(--paper)] text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>
                {editingId ? "EDIT ENTRY" : `NEW ENTRY · No. ${String(officer.nextEntryNo).padStart(3, "0")}`}
              </div>
              <button onClick={() => setShowEntryForm(false)} className="text-[var(--paper-dim)]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Date</label>
                <input type="date" value={fDate} onChange={(e) => setFDate(e.target.value)}
                  className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 outline-none focus:border-[var(--brass)]" />
              </div>
              <div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Time</label>
                <input type="time" value={fTime} onChange={(e) => setFTime(e.target.value)}
                  className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 outline-none focus:border-[var(--brass)]" />
              </div>
            </div>
            <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Activity Type</label>
            <select value={fType} onChange={(e) => setFType(e.target.value)}
              className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 mb-3 outline-none focus:border-[var(--brass)]">
              {ACTIVITY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
            <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Location</label>
            <input value={fLocation} onChange={(e) => setFLocation(e.target.value)} placeholder="e.g. 14 Ring Road, Sector 7"
              className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 mb-2 outline-none focus:border-[var(--brass)] placeholder:text-[var(--paper-dim)]" />
            {recentLocations.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {recentLocations.map((loc) => (
                  <button key={loc} onClick={() => setFLocation(loc)}
                    className="text-[10px] px-2 py-1 border border-[var(--khaki)] text-[var(--khaki)] rounded-full truncate max-w-[140px]">{loc}</button>
                ))}
              </div>
            )}
            <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Status</label>
            <div className="flex gap-2 mb-3">
              {STATUSES.map((s) => (
                <button key={s} onClick={() => setFStatus(s)} className="flex-1 text-xs py-1.5 rounded-sm border transition-colors"
                  style={{ borderColor: STATUS_COLOR[s], background: fStatus === s ? STATUS_COLOR[s] : "transparent", color: fStatus === s ? "var(--ink-950)" : STATUS_COLOR[s] }}>{s}</button>
              ))}
            </div>
            <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">Notes</label>
            <textarea value={fNotes} onChange={(e) => setFNotes(e.target.value)} rows={3} placeholder="Quick notes…"
              className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 mb-4 outline-none focus:border-[var(--brass)] placeholder:text-[var(--paper-dim)] resize-none" />
            <button onClick={handleSaveEntry}
              className="w-full bg-[var(--brass)] text-[var(--ink-950)] py-2.5 rounded-sm text-sm font-semibold hover:bg-[#d8ab57] transition-colors"
              style={{ fontFamily: "Oswald, sans-serif" }}>SAVE ENTRY</button>
          </div>
        </div>
      )}

      {showReport && (
        <div className="no-print fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-[var(--ink-800)] border border-[var(--ink-600)] w-full sm:max-w-sm rounded-t-lg sm:rounded-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="text-[var(--paper)] text-sm" style={{ fontFamily: "Oswald, sans-serif" }}>DOWNLOAD REPORT</div>
              <button onClick={() => setShowReport(false)} className="text-[var(--paper-dim)]"><X size={18} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">From</label>
                <input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)}
                  className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 outline-none focus:border-[var(--brass)]" />
              </div>
              <div>
                <label className="block text-[var(--paper-dim)] text-xs mb-1 font-mono">To</label>
                <input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)}
                  className="w-full bg-[var(--ink-700)] border border-[var(--ink-600)] rounded-sm text-[var(--paper)] text-sm px-2 py-1.5 outline-none focus:border-[var(--brass)]" />
              </div>
            </div>
            <div className="flex gap-2 mb-4">
              {[
                ["Today", todayStr(), todayStr()],
                ["This month", `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-01`, todayStr()],
                ["All", "0000-01-01", "9999-12-31"],
              ].map(([label, f, t]) => (
                <button key={label} onClick={() => { setReportFrom(f); setReportTo(t); }}
                  className="text-xs px-2.5 py-1 border border-[var(--khaki)] text-[var(--khaki)] rounded-full">{label}</button>
              ))}
            </div>
            <button onClick={generateReport}
              className="w-full flex items-center justify-center gap-2 bg-[var(--brass)] text-[var(--ink-950)] py-2.5 rounded-sm text-sm font-semibold hover:bg-[#d8ab57] transition-colors"
              style={{ fontFamily: "Oswald, sans-serif" }}><Download size={15} /> DOWNLOAD AS PDF</button>
            <div className="text-[var(--paper-dim)] text-[11px] mt-2 text-center">Opens your browser's print dialog — choose "Save as PDF" as the destination.</div>
          </div>
        </div>
      )}

      {showDeleteAccount && (
        <div className="no-print fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[var(--ink-800)] border border-[var(--rust)] w-full max-w-xs rounded-sm p-5">
            <div className="text-[var(--paper)] text-sm mb-1" style={{ fontFamily: "Oswald, sans-serif" }}>DELETE MY ACCOUNT?</div>
            <div className="text-[var(--paper-dim)] text-xs mb-4">
              This permanently deletes your profile (<span className="text-[var(--brass)]">{officer.name}</span>) and every entry you've logged. This can't be undone — consider downloading a backup first. Enter your PIN to confirm.
            </div>
            <input value={deleteAccountPin} maxLength={4} autoFocus onChange={(e) => setDeleteAccountPin(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && confirmDeleteOwnAccount()}
              className="w-full bg-transparent border-b border-[var(--khaki)] text-[var(--paper)] py-1.5 mb-3 outline-none focus:border-[var(--rust)] font-mono text-lg tracking-[0.6em] text-center"
              placeholder="••••" type="password" />
            {deleteAccountError && <div className="text-[var(--rust)] text-xs mb-3 font-mono text-center">{deleteAccountError}</div>}
            <div className="flex gap-2">
              <button onClick={() => { setShowDeleteAccount(false); setDeleteAccountPin(""); setDeleteAccountError(""); }}
                className="flex-1 border border-[var(--ink-600)] text-[var(--paper-dim)] py-2 rounded-sm text-sm">Cancel</button>
              <button onClick={confirmDeleteOwnAccount}
                className="flex-1 bg-[var(--rust)] text-[var(--paper)] py-2 rounded-sm text-sm font-semibold">Delete</button>
            </div>
          </div>
        </div>
      )}

      {reportData && (

        <div className="print-only p-8 bg-white text-black" style={{ fontFamily: "Inter, sans-serif" }}>
          <div className="text-xl font-bold tracking-wide text-wrap text-center pb-5">J.P ROAD POLICE STATION VADODARA CITY </div>
          <div className="flex items-center justify-between border-b-2 border-black pb-3 mb-4">
            <div>
              <div className="text-xl font-bold tracking-wide text-wrap">DUTY REGISTER — OFFICIAL REPORT</div>
              <div className="text-sm mt-1">{officer.name} &nbsp;·&nbsp; Badge {officer.badgeNo}</div>
            </div>
            <div className="text-sm text-right">
              <div>Period: {fmtDate(reportFrom)} – {fmtDate(reportTo)}</div>
              <div>Generated: {fmtDate(todayStr())}</div>
            </div>
          </div>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1.5 pr-2">No.</th><th className="py-1.5 pr-2">Date</th><th className="py-1.5 pr-2">Time</th>
                <th className="py-1.5 pr-2">Type</th><th className="py-1.5 pr-2">Location</th><th className="py-1.5 pr-2">Status</th><th className="py-1.5">Notes</th>
              </tr>
            </thead>
            <tbody>
              {reportData.map((e) => (
                <tr key={e.id} className="border-b border-gray-300 align-top">
                  <td className="py-1.5 pr-2">{String(e.regNo).padStart(3, "0")}</td>
                  <td className="py-1.5 pr-2">{fmtDate(e.date)}</td>
                  <td className="py-1.5 pr-2">{e.time}</td>
                  <td className="py-1.5 pr-2">{e.type}</td>
                  <td className="py-1.5 pr-2">{e.location}</td>
                  <td className="py-1.5 pr-2">{e.status}</td>
                  <td className="py-1.5">{e.notes}</td>
                </tr>
              ))}
              {reportData.length === 0 && (
                <tr><td colSpan={7} className="py-4 text-center text-gray-500">No entries in this period.</td></tr>
              )}
            </tbody>
          </table>
          <div className="mt-8 text-xs text-gray-500">Total entries: {reportData.length}</div>
        </div>
      )}
    </div>
  );
}
