/**
 * ecosystem.config.js
 *
 * Configuración de PM2 para devprofile-node.
 *
 * Comandos útiles:
 *   pm2 start ecosystem.config.js                    # desarrollo
 *   pm2 start ecosystem.config.js --env production   # producción
 *   pm2 reload ecosystem.config.js --env production  # zero-downtime reload
 *   pm2 stop devprofile-node
 *   pm2 logs devprofile-node
 *   pm2 monit
 */

export default {
  apps: [
    {
      // ── Identificación ───────────────────────────────────────────────────
      name: "devprofile-node",
      script: "./server.js",

      // ── Ejecución ────────────────────────────────────────────────────────
      // "fork" para un solo proceso; cámbialo a "cluster" + instances: "max"
      // si necesitas balancear carga entre todos los núcleos disponibles.
      exec_mode: "fork",
      instances: 1,

      // ── Reinicio automático ───────────────────────────────────────────────
      // Reinicia el proceso si cae por cualquier error no capturado.
      autorestart: true,

      // Tiempo de espera (ms) antes de considerar el proceso como estable.
      // Si el proceso cae antes de este tiempo se contabiliza como "unstable restart".
      min_uptime: "5s",

      // Número máximo de reinicios consecutivos antes de marcar el proceso
      // como errored y dejar de intentar reiniciarlo.
      max_restarts: 10,

      // Retardo entre reinicios (ms) para evitar bucles de reinicio rápido.
      restart_delay: 3000,

      // Reinicia el proceso si supera este uso de memoria (ej, fuga de memoria).
      max_memory_restart: "300M",

      // ── Logs ─────────────────────────────────────────────────────────────
      // PM2 rotará los logs automáticamente si tienes pm2-logrotate instalado.
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      // Añade timestamp a cada línea de log.
      time: true,

      // ── Variables de entorno — desarrollo (por defecto) ───────────────────
      env: {
        NODE_ENV: "development",
        PORT: 8080,
        DB_PATH: "./data/devprofile.db",
        // GITHUB_TOKEN se carga desde el .env en desarrollo via dotenv/config
      },

      // ── Variables de entorno — producción ────────────────────────────────
      // Activa con: pm2 start ecosystem.config.js --env production
      // Los valores sensibles (GITHUB_TOKEN) se deben inyectar desde el
      // sistema de secretos del servidor (ej: export GITHUB_TOKEN=xxx antes
      // de lanzar PM2, o via /etc/environment).
      env_production: {
        NODE_ENV: "production",
        PORT: 8080,
        DB_PATH: "./data/devprofile.db",
        GITHUB_TOKEN: process.env.GITHUB_TOKEN || "",
      },
    },
  ],
};
