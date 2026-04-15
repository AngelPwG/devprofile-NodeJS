/**
 * controllers/profile.js
 *
 * Traducción de internal/handler/handler.go → funciones async de Express.
 *
 * Equivalencias Go → Express:
 *   chi.URLParam(r, "username")  → req.params.username
 *   r.RemoteAddr                 → req.ip
 *   json.NewDecoder.Decode(&b)   → req.body (ya parseado por express.json())
 *   w.WriteHeader(status)        → res.status(status)
 *   json.NewEncoder(w).Encode    → res.json()
 *   jsonError(w, code, msg)      → next(err) → errorHandler
 *   sql.ErrNoRows                → better-sqlite3 devuelve undefined en .get()
 */

import { z } from "zod";

import {
  insertProfile,
  getProfiles,
  getProfile,
  updateProfile,
  deleteProfile,
  insertRepositories,
  getRepositories,
  deleteRepositories,
  insertAuditLog,
} from "../db/index.js";

import { buildProfile } from "../services/builder.js";
import { canRefresh } from "../middlewares/cache.js";

// ── Esquemas Zod ──────────────────────────────────────────────────────────────

/** Valida el body de POST /profiles */
const createBodySchema = z.object({
  username: z.string().min(1, "username is required"),
});

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Lanza un Error con statusCode adjunto.
 * Permite que el errorHandler central responda con el código correcto.
 */
function httpError(message, statusCode) {
  return Object.assign(new Error(message), { statusCode });
}

// ── CreateProfile ─────────────────────────────────────────────────────────────

/**
 * POST /profiles
 * Equivalente a (h *Handler) CreateProfile(...)
 */
export async function createProfile(req, res, next) {
  try {
    // Validación Zod del body — lanza ZodError → errorHandler → 400
    const { username } = createBodySchema.parse(req.body);

    // builder.BuildProfile → buildProfile
    const { profile, repos } = await buildProfile(username);

    // h.db.InsertProfile(*profile)
    const id = insertProfile(profile);

    // h.db.InsertRepositories(repos, id)
    insertRepositories(repos, id);

    // h.db.InsertAuditLog("CREATE", username, ip)
    insertAuditLog("CREATE", username, req.ip);

    // w.WriteHeader(http.StatusCreated) + json.NewEncoder(w).Encode(profile)
    return res.status(201).json({ ...profile, id });
  } catch (err) {
    // Equivalente a strings.Contains(err.Error(), "user not found") en Go
    if (
      err.message.includes("user not found") ||
      err.message.includes("Could not resolve to a User")
    ) {
      return next(httpError("github user not found", 404));
    }
    return next(err);
  }
}

// ── GetProfiles ───────────────────────────────────────────────────────────────

/**
 * GET /profiles
 * Equivalente a (h *Handler) GetProfiles(...)
 */
export async function getAllProfiles(req, res, next) {
  try {
    // h.db.GetProfiles()
    const profiles = getProfiles();
    return res.json(profiles);
  } catch (err) {
    return next(err);
  }
}

// ── GetProfile ────────────────────────────────────────────────────────────────

/**
 * GET /profiles/:username
 * Equivalente a (h *Handler) GetProfile(...)
 */
export async function getOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    // h.db.GetProfile(username) → undefined si no existe (≡ sql.ErrNoRows)
    const profile = getProfile(username);
    if (!profile) {
      return next(httpError("profile not found", 404));
    }

    // h.db.GetRepositories(profile.ID)
    const repos = getRepositories(profile.id);

    // json.NewEncoder(w).Encode(map[string]interface{}{"profile": …, "repos": …})
    return res.json({ profile, repos });
  } catch (err) {
    return next(err);
  }
}

// ── UpdateProfile ─────────────────────────────────────────────────────────────

/**
 * PUT /profiles/:username
 * Equivalente a (h *Handler) UpdateProfile(...)
 * Incluye la lógica de rate-limit (TTL 1 h) de cache.CanRefresh.
 */
export async function updateOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    // h.db.GetProfile(username)
    const oldProfile = getProfile(username);
    if (!oldProfile) {
      return next(httpError("profile not found", 404));
    }

    // cache.CanRefresh(oldProfile.UpdatedAt)
    const { canRefresh: ok, retryAfterSeconds } = canRefresh(oldProfile.updated_at);
    if (!ok) {
      // w.WriteHeader(http.StatusTooManyRequests)
      return res.status(429).json({
        error: "too_soon",
        retry_after_seconds: retryAfterSeconds,
      });
    }

    // builder.BuildProfile(username)
    const { profile, repos } = await buildProfile(username);

    // h.db.UpdateProfile(*profile)
    updateProfile(profile);

    // h.db.DeleteRepositories(profile.ID) + InsertRepositories(repos, profile.ID)
    deleteRepositories(oldProfile.id);
    insertRepositories(repos, oldProfile.id);

    // h.db.InsertAuditLog("UPDATE", username, ip)
    insertAuditLog("UPDATE", username, req.ip);

    return res.json(profile);
  } catch (err) {
    // Equivalente a strings.Contains(err.Error(), "user not found") en Go
    if (
      err.message.includes("user not found") ||
      err.message.includes("Could not resolve to a User")
    ) {
      return next(httpError("github user not found", 404));
    }
    return next(err);
  }
}

// ── DeleteProfile ─────────────────────────────────────────────────────────────

/**
 * DELETE /profiles/:username
 * Equivalente a (h *Handler) DeleteProfile(...)
 */
export async function deleteOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    // h.db.GetProfile(username) — verificar que existe antes de borrar
    const existing = getProfile(username);
    if (!existing) {
      return next(httpError("profile not found", 404));
    }

    // h.db.DeleteProfile(username)
    deleteProfile(username);

    // h.db.InsertAuditLog("DELETE", username, ip)
    insertAuditLog("DELETE", username, req.ip);

    // json.NewEncoder(w).Encode(map[string]string{"message": "profile deleted successfully"})
    return res.json({ message: "profile deleted successfully" });
  } catch (err) {
    return next(err);
  }
}
