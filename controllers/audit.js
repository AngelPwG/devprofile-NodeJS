/**
 * controllers/audit.js
 *
 * Traducción de internal/handler/audit.go
 *
 * Equivalentes Go → Express:
 *   h.db.GetAuditLogs()           → getAuditLogs() (better-sqlite3 síncrono)
 *   json.NewEncoder(w).Encode     → res.json()
 *   jsonError(w, 500, err.Error())→ next(err)
 */

import { getAuditLogs } from "../db/index.js";

/**
 * GET /audit
 * Equivalente a (h *Handler) GetAuditLogs(...)
 */
export async function getAuditLogsHandler(req, res, next) {
  try {
    // h.db.GetAuditLogs()
    const logs = getAuditLogs();
    return res.json({ success: true, data: logs });
  } catch (err) {
    return next(err);
  }
}
