/**
 * middlewares/logger.js
 *
 * Middleware de logging para cada acción HTTP.
 * PM2 captura el stdout en ./logs/out.log (con timestamp gracias a time: true
 * en ecosystem.config.js).
 *
 * Formato de cada línea:
 *   [action] METHOD /path → STATUS  XXms  IP
 *
 * Ejemplo:
 *   [action] POST /api/v1/profiles → 201  12ms  ::1
 */

/**
 * @param {import("express").Request}  req
 * @param {import("express").Response} res
 * @param {import("express").NextFunction} next
 */
export function requestLogger(req, res, next) {
  const start = Date.now();

  // Ejecutar el log una vez que la respuesta haya terminado de enviarse
  res.on("finish", () => {
    const ms = Date.now() - start;
    const ip = req.ip || req.socket?.remoteAddress || "-";
    const status = res.statusCode;

    // Nivel de log según código de estado
    const logFn = status >= 500 ? console.error : console.log;

    logFn(
      `[action] ${req.method} ${req.originalUrl} → ${status}  ${ms}ms  ${ip}`
    );
  });

  next();
}
