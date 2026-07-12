import { JSONFilePreset } from "lowdb/node";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// DATA_DIR lets us point at a persistent disk mount in production (e.g. Render Disks).
// Falls back to a local ./data folder for development on your own PC.
const dataDir = process.env.DATA_DIR || path.join(__dirname, "..", "..", "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const dbPath = path.join(dataDir, "duty-register.json");

const defaultData = { officers: [], entries: [] };

const db = await JSONFilePreset(dbPath, defaultData);

// One-time migration: old single-profile shape -> officers array
if (db.data.profile && (!db.data.officers || db.data.officers.length === 0)) {
  const legacy = db.data.profile;
  const id = Date.now().toString();
  db.data.officers = [{ id, name: legacy.name, badgeNo: legacy.badgeNo, pin: legacy.pin, email: "", nextEntryNo: legacy.nextEntryNo || 1 }];
  db.data.entries = (db.data.entries || []).map((e) => ({ ...e, officerId: id }));
  delete db.data.profile;
  await db.write();
}

export default db;
