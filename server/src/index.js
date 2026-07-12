import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";
import "dotenv/config";
import authRoutes from "./routes/auth.js";
import entriesRoutes from "./routes/entries.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 4000;

// In dev, the client runs on a different port (5173) and reaches us through Vite's
// proxy, so requests already look same-origin — CLIENT_ORIGIN below only matters
// if you ever split client/server across two real domains in production.
app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN || true,
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

app.use("/api/auth", authRoutes);
app.use("/api/entries", entriesRoutes);
app.get("/api/health", (req, res) => res.json({ ok: true }));

const clientDist = path.join(__dirname, "..", "..", "client", "dist");
app.use(express.static(clientDist));
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDist, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Duty Register server running at http://localhost:${PORT}`);
});
