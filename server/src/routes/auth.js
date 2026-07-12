import { Router } from "express";
import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import "dotenv/config";
import db from "../db/database.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();
const isProd = process.env.NODE_ENV === "production";

function publicOfficer(o) {
  return { id: o.id, name: o.name, badgeNo: o.badgeNo, nextEntryNo: o.nextEntryNo };
}

function setSessionCookie(res, officerId) {
  const token = jwt.sign({ officerId }, process.env.JWT_SECRET, { expiresIn: "12h" });
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: 12 * 60 * 60 * 1000,
  });
}

// Limit login/PIN attempts hard, since a 4-digit PIN has only 10,000 combinations.
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: { error: "Too many attempts — please wait 15 minutes and try again" },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get("/officers", (req, res) => {
  res.json(db.data.officers.map(publicOfficer));
});

router.post("/officers", loginLimiter, async (req, res) => {
  const { name, badgeNo, pin } = req.body;
  if (!name || !badgeNo || !/^\d{4}$/.test(pin || "")) {
    return res.status(400).json({ error: "name, badgeNo and a 4-digit pin are required" });
  }
  if (db.data.officers.some((o) => o.badgeNo.toLowerCase() === badgeNo.toLowerCase())) {
    return res.status(409).json({ error: "An officer with that badge number already exists" });
  }
  const officer = { id: Date.now().toString(), name, badgeNo, pin, nextEntryNo: 1 };
  db.data.officers.push(officer);
  await db.write();
  setSessionCookie(res, officer.id);
  res.status(201).json(publicOfficer(officer));
});

router.post("/login", loginLimiter, (req, res) => {
  const { id, pin } = req.body;
  const officer = db.data.officers.find((o) => o.id === id);
  if (!officer) return res.status(404).json({ error: "Officer not found" });
  if (officer.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });
  setSessionCookie(res, officer.id);
  res.json(publicOfficer(officer));
});

// Confirms whether the current session cookie is still valid, and who it belongs to.
// Lets the app skip straight to the dashboard after a page refresh.
router.get("/me", requireAuth, (req, res) => {
  const officer = db.data.officers.find((o) => o.id === req.officerId);
  if (!officer) return res.status(404).json({ error: "Officer not found" });
  res.json(publicOfficer(officer));
});

router.post("/logout", (req, res) => {
  res.clearCookie("session");
  res.json({ ok: true });
});

router.delete("/officers/:id", loginLimiter, async (req, res) => {
  const { pin } = req.body;
  const officer = db.data.officers.find((o) => o.id === req.params.id);
  if (!officer) return res.status(404).json({ error: "Officer not found" });
  if (officer.pin !== pin) return res.status(401).json({ error: "Incorrect PIN" });

  db.data.officers = db.data.officers.filter((o) => o.id !== req.params.id);
  db.data.entries = db.data.entries.filter((e) => e.officerId !== req.params.id);
  await db.write();
  res.clearCookie("session");
  res.status(204).end();
});

export default router;
