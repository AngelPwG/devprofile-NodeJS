/**
 * middlewares/cache.js
 *
 * Traducción de internal/cache/cache.go
 *
 * Comprueba si ha pasado el TTL (1 hora) desde la última actualización
 * del perfil. Equivalente a cache.CanRefresh(UpdatedAt string).
 */

// Equivalente a const TTL = time.Hour
const TTL_MS = 60 * 60 * 1000; // 1 hora en milisegundos

/**
 * Equivalente a CanRefresh(UpdatedAt string) (bool, int, error).
 *
 * @param {string} updatedAt  - Timestamp ISO 8601 guardado en la BD
 * @returns {{ canRefresh: boolean, retryAfterSeconds: number }}
 * @throws {Error} Si el timestamp no se puede parsear
 */
export function canRefresh(updatedAt) {
  const t = new Date(updatedAt);
  if (isNaN(t.getTime())) {
    throw new Error(`cache: invalid timestamp: ${updatedAt}`);
  }

  const elapsed = Date.now() - t.getTime();   // equivalente a time.Since(t)
  const remaining = TTL_MS - elapsed;          // equivalente a TTL - time.Since(t)

  if (remaining <= 0) {
    return { canRefresh: true, retryAfterSeconds: 0 };
  }

  return {
    canRefresh: false,
    retryAfterSeconds: Math.ceil(remaining / 1000),
  };
}
