/**
 * routes/index.js
 *
 * Traducción de internal/router/router.go
 *
 * Mapeo de rutas (idéntico al de Go con chi):
 *   r.Post("/profiles", ...)         → router.post("/profiles", ...)
 *   r.Get("/profiles", ...)          → router.get("/profiles", ...)
 *   r.Get("/profiles/{username}", …) → router.get("/profiles/:username", …)
 *   r.Put("/profiles/{username}", …) → router.put("/profiles/:username", …)
 *   r.Delete("/profiles/{username}") → router.delete("/profiles/:username", …)
 *   r.Get("/audit", ...)             → router.get("/audit", ...)
 */

import { Router } from "express";

import {
  createProfile,
  getAllProfiles,
  getOneProfile,
  updateOneProfile,
  deleteOneProfile,
} from "../controllers/profile.js";

import { getAuditLogsHandler } from "../controllers/audit.js";

const router = Router();

// ── Profiles ──────────────────────────────────────────────────────────────────
router.post("/profiles", createProfile);              // POST   /profiles
router.get("/profiles", getAllProfiles);              // GET    /profiles
router.get("/profiles/:username", getOneProfile);    // GET    /profiles/:username
router.put("/profiles/:username", updateOneProfile); // PUT    /profiles/:username
router.delete("/profiles/:username", deleteOneProfile); // DELETE /profiles/:username

// ── Audit ─────────────────────────────────────────────────────────────────────
router.get("/audit", getAuditLogsHandler);           // GET    /audit

export default router;
