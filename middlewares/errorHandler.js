import { ZodError } from "zod";

/**
 * Determines the appropriate HTTP status code for an error.
 *
 * Priority order:
 *  1. Explicit `err.statusCode` (set by the application code)
 *  2. ZodError  → 400 (validation failure)
 *  3. SyntaxError from JSON parsing → 400
 *  4. Fallback → 500
 *
 * @param {Error} err
 * @returns {400|404|500}
 */
function resolveStatus(err) {
  if (err.statusCode === 404) return 404;
  if (err.statusCode === 400) return 400;
  if (err instanceof ZodError) return 400;
  if (err instanceof SyntaxError && err.status === 400) return 400;
  if (err.statusCode && err.statusCode >= 400 && err.statusCode < 500) return 400;
  return 500;
}

/**
 *
 * @param {number} status
 * @param {Error}  err
 * @returns {object}
 */
function buildPayload(status, err) {
  const base = {
    success: false,
    status,
    message: err.message || "An unexpected error occurred.",
    timestamp: new Date().toISOString(),
  };

  if (err instanceof ZodError) {
    base.message = "Validation error";
    base.errors = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
      code: e.code,
    }));
  }

  if (process.env.NODE_ENV !== "production" && err.stack) {
    base.stack = err.stack;
  }

  return base;
}

/**
 * Express global error-handling middleware.
 * Must be registered AFTER all routes and other middleware.
 * Signature must have 4 parameters so Express recognises it as an error handler.
 *
 * @param {Error}            err
 * @param {import("express").Request}  _req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} _next
 */
// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  const status = resolveStatus(err);
  const payload = buildPayload(status, err);

  // Log server errors — avoid leaking details to the client
  if (status === 500) {
    console.error("[errorHandler] Unhandled error:", err);
  }

  // Guarantee JSON — override any header already set
  res
    .status(status)
    .setHeader("Content-Type", "application/json; charset=utf-8")
    .json(payload);
}
