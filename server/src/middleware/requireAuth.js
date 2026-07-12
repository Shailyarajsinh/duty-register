import jwt from "jsonwebtoken";
import "dotenv/config";

export function requireAuth(req, res, next) {
  const token = req.cookies?.session;
  if (!token) return res.status(401).json({ error: "Not logged in" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.officerId = payload.officerId;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Session expired — please log in again" });
  }
}
