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


export async function createProfile(req, res, next) {
  try {
    const { username } = createBodySchema.parse(req.body);

    const { profile, repos } = await buildProfile(username);

    const id = insertProfile(profile);

    insertRepositories(repos, id);

    insertAuditLog("CREATE", username, req.ip);

    return res.status(201).json({ ...profile, id });
  } catch (err) {
    if (
      err.message.includes("user not found") ||
      err.message.includes("Could not resolve to a User")
    ) {
      return next(httpError("github user not found", 404));
    }
    return next(err);
  }
}
export async function getAllProfiles(req, res, next) {
  try {
    const profiles = getProfiles();
    return res.json(profiles);
  } catch (err) {
    return next(err);
  }
}

export async function getOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    const profile = getProfile(username);
    if (!profile) {
      return next(httpError("profile not found", 404));
    }

    const repos = getRepositories(profile.id);

    return res.json({ profile, repos });
  } catch (err) {
    return next(err);
  }
}

export async function updateOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    const oldProfile = getProfile(username);
    if (!oldProfile) {
      return next(httpError("profile not found", 404));
    }

    const { canRefresh: ok, retryAfterSeconds } = canRefresh(oldProfile.updated_at);
    if (!ok) {
      return res.status(429).json({
        error: "too_soon",
        retry_after_seconds: retryAfterSeconds,
      });
    }

    const { profile, repos } = await buildProfile(username);

    updateProfile(profile);

    deleteRepositories(oldProfile.id);
    insertRepositories(repos, oldProfile.id);
    insertAuditLog("UPDATE", username, req.ip);

    return res.json(profile);
  } catch (err) {
    if (
      err.message.includes("user not found") ||
      err.message.includes("Could not resolve to a User")
    ) {
      return next(httpError("github user not found", 404));
    }
    return next(err);
  }
}

export async function deleteOneProfile(req, res, next) {
  try {
    const { username } = req.params;

    const existing = getProfile(username);
    if (!existing) {
      return next(httpError("profile not found", 404));
    }

    deleteProfile(username);

    insertAuditLog("DELETE", username, req.ip);

    return res.json({ message: "profile deleted successfully" });
  } catch (err) {
    return next(err);
  }
}
