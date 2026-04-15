import "dotenv/config";

import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler.js";
import router from "./routes/index.js";

const app = express();
const PORT = process.env.PORT || 8080;

// ── Middlewares globales ─────────────────────────────────────────────────────

// Sólo acepta Content-Type: application/json en peticiones con body
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Parsear cuerpo JSON; rechaza payloads que no sean JSON válido
app.use(express.json());

// Forzar que TODAS las respuestas sean application/json
app.use((_req, res, next) => {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  next();
});

// ── Rutas ────────────────────────────────────────────────────────────────────

// Health-check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// Rutas de dominio — equivalente al NewRouter() de router.go
app.use("/api/v1", router);

// Ruta no encontrada → delega al errorHandler con 404
app.use((_req, _res, next) => {
  const err = new Error("Route not found");
  err.statusCode = 404;
  next(err);
});

// ── Manejador de errores global ──────────────────────────────────────────────
app.use(errorHandler);

// ── Iniciar servidor ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[server] Running on http://localhost:${PORT}`);
});

export default app;
