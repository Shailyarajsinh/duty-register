import { Router } from "express";
import db from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Every route below requires a valid session. req.officerId comes from the
// verified cookie, never from the request body/query — so one officer can
// never read or modify another officer's entries by guessing an id.
router.use(requireAuth);

router.get("/", (req, res) => {
  const list = db.data.entries
    .filter((e) => e.officerId === req.officerId)
    .sort((a, b) => (a.date + a.time < b.date + b.time ? 1 : -1));
  res.json(list);
});

router.post("/", async (req, res) => {
  const { date, time, type, location, status, notes } = req.body;
  if (!date || !time || !type || !location || !status) {
    return res.status(400).json({ error: "date, time, type, location and status are required" });
  }
  const officer = db.data.officers.find((o) => o.id === req.officerId);
  if (!officer) return res.status(404).json({ error: "Officer not found" });

  const regNo = officer.nextEntryNo;
  const entry = {
    id: Date.now(),
    officerId: req.officerId,
    regNo,
    date,
    time,
    type,
    location,
    status,
    notes: notes || "",
  };

  db.data.entries.push(entry);
  officer.nextEntryNo = regNo + 1;
  await db.write();

  res.status(201).json(entry);
});

router.put("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const idx = db.data.entries.findIndex((e) => e.id === id);
  if (idx === -1) return res.status(404).json({ error: "Entry not found" });
  if (db.data.entries[idx].officerId !== req.officerId) {
    return res.status(403).json({ error: "Not your entry" });
  }

  const { date, time, type, location, status, notes } = req.body;
  db.data.entries[idx] = {
    ...db.data.entries[idx],
    date: date ?? db.data.entries[idx].date,
    time: time ?? db.data.entries[idx].time,
    type: type ?? db.data.entries[idx].type,
    location: location ?? db.data.entries[idx].location,
    status: status ?? db.data.entries[idx].status,
    notes: notes ?? db.data.entries[idx].notes,
  };
  await db.write();
  res.json(db.data.entries[idx]);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const entry = db.data.entries.find((e) => e.id === id);
  if (entry && entry.officerId !== req.officerId) {
    return res.status(403).json({ error: "Not your entry" });
  }
  db.data.entries = db.data.entries.filter((e) => e.id !== id);
  await db.write();
  res.status(204).end();
});

router.get("/export/backup", (req, res) => {
  const officer = db.data.officers.find((o) => o.id === req.officerId);
  const entries = db.data.entries.filter((e) => e.officerId === req.officerId);
  res.json({ officer, entries, exportedAt: new Date().toISOString() });
});

router.post("/import/backup", async (req, res) => {
  const { entries } = req.body;
  const officer = db.data.officers.find((o) => o.id === req.officerId);
  if (!officer) return res.status(404).json({ error: "Officer not found" });

  if (Array.isArray(entries)) {
    db.data.entries = db.data.entries.filter((e) => e.officerId !== req.officerId);
    db.data.entries.push(...entries.map((e) => ({ ...e, officerId: req.officerId })));
    officer.nextEntryNo = Math.max(officer.nextEntryNo || 1, ...entries.map((e) => (e.regNo || 0) + 1), 1);
  }
  await db.write();
  res.json({ ok: true });
});

export default router;
