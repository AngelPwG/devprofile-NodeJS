/**
 * db/index.js
 *
 * Traducción directa de internal/db/db.go a better-sqlite3.
 * better-sqlite3 es completamente síncrono, por lo que no se necesitan
 * Promises ni callbacks — igual que el driver database/sql usado en Go.
 *
 * Equivalencias de patrones Go → JS:
 *   sql.Open(...)          → new Database(path)
 *   db.Exec(...)           → stmt.run(...)
 *   db.Query(...)          → stmt.all(...)
 *   db.QueryRow(...).Scan  → stmt.get(...)
 *   result.LastInsertId()  → info.lastInsertRowid
 *   time.Now().Format(...) → new Date().toISOString()
 */

import Database from "better-sqlite3";
import { mkdirSync, existsSync } from "node:fs";
import { dirname } from "node:path";

// ── Conexión ─────────────────────────────────────────────────────────────────

const DB_PATH = process.env.DB_PATH || "devprofile.db";

// Crea el directorio padre si no existe (ej. ./data/)
const dbDir = dirname(DB_PATH);
if (dbDir && dbDir !== "." && !existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

/**
 * Equivalente a NewDB(path string) (*DB, error).
 *
 * Abre (o crea) la base de datos SQLite de forma síncrona y ejecuta
 * el mismo script DDL que usa Go para crear las tres tablas.
 */
const db = new Database(DB_PATH, { verbose: process.env.NODE_ENV === "development" ? console.log : undefined });

// Habilita foreign-keys (SQLite las tiene desactivadas por defecto)
db.pragma("foreign_keys = ON");
db.pragma("journal_mode = WAL"); // mejora concurrencia de lectura

// Script DDL idéntico al sqlStmt de NewDB en Go
db.exec(`
  create table if not exists profiles (
    id           integer primary key autoincrement,
    github_user  text    unique not null,
    name         text,
    avatar_url   text,
    bio          text,
    followers    int,
    following    int,
    public_repos int,
    language     text,
    pokemon      text,
    pokemon_img  text,
    created_at   text not null,
    updated_at   text not null
  );

  create table if not exists repositories (
    id         integer primary key autoincrement,
    profile_id integer not null,
    name       text    not null,
    language   text,
    foreign key (profile_id) references profiles(id) on delete cascade
  );

  create table if not exists audit_log (
    id        integer primary key autoincrement,
    event     text not null,
    resource  text not null,
    author_ip text not null,
    timestamp text not null
  );
`);

console.log(`[db] Connected to SQLite at "${DB_PATH}"`);

// ── Profiles ──────────────────────────────────────────────────────────────────

/**
 * Equivalente a (d *DB) InsertProfile(p models.Profile) (int, error).
 *
 * @param {object} p  - Objeto profile con los mismos campos del modelo Go.
 * @returns {number}  - ID de la fila insertada (lastInsertRowid).
 */
export function insertProfile(p) {
  const stmt = db.prepare(
    `insert into profiles
       (github_user, name, avatar_url, bio, followers, following,
        public_repos, language, pokemon, pokemon_img, created_at, updated_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );

  const now = new Date().toISOString();
  const info = stmt.run(
    p.github_user,
    p.name,
    p.avatar_url,
    p.bio,
    p.followers,
    p.following,
    p.public_repos,
    p.language,
    p.pokemon,
    p.pokemon_img,
    now,
    now
  );

  return Number(info.lastInsertRowid);
}

/**
 * Equivalente a (d *DB) GetProfiles() ([]models.Profile, error).
 *
 * @returns {object[]} - Array de todos los perfiles.
 */
export function getProfiles() {
  return db.prepare("select * from profiles").all();
}

/**
 * Equivalente a (d *DB) GetProfile(user string) (models.Profile, error).
 *
 * @param {string} githubUser
 * @returns {object|undefined} - El perfil encontrado o undefined si no existe.
 */
export function getProfile(githubUser) {
  return db
    .prepare("select * from profiles where github_user = ?")
    .get(githubUser);
}

/**
 * Equivalente a (d *DB) UpdateProfile(p models.Profile) error.
 *
 * @param {object} p
 * @returns {number} - Número de filas afectadas.
 */
export function updateProfile(p) {
  const stmt = db.prepare(
    `update profiles
     set name = ?, avatar_url = ?, bio = ?, followers = ?, following = ?,
         public_repos = ?, language = ?, pokemon = ?, pokemon_img = ?,
         updated_at = ?
     where github_user = ?`
  );

  const info = stmt.run(
    p.name,
    p.avatar_url,
    p.bio,
    p.followers,
    p.following,
    p.public_repos,
    p.language,
    p.pokemon,
    p.pokemon_img,
    new Date().toISOString(),
    p.github_user
  );

  return info.changes;
}

/**
 * Equivalente a (d *DB) DeleteProfile(user string) error.
 *
 * @param {string} githubUser
 * @returns {number} - Número de filas eliminadas.
 */
export function deleteProfile(githubUser) {
  const info = db
    .prepare("delete from profiles where github_user = ?")
    .run(githubUser);

  return info.changes;
}

// ── Repositories ─────────────────────────────────────────────────────────────

/**
 * Equivalente a (d *DB) InsertRepositories(repos []models.Repository, id int) error.
 * Ejecuta todas las inserciones dentro de una transacción para reproducir
 * el comportamiento atómico implícito del loop en Go.
 *
 * @param {object[]} repos - Array de { name, language }
 * @param {number}   profileId
 */
export function insertRepositories(repos, profileId) {
  const stmt = db.prepare(
    "insert into repositories (profile_id, name, language) values (?, ?, ?)"
  );

  // Transacción síncrona: si alguna inserción falla, se hace rollback automático
  const insertMany = db.transaction((repoList) => {
    for (const repo of repoList) {
      stmt.run(profileId, repo.name, repo.language);
    }
  });

  insertMany(repos);
}

/**
 * Equivalente a (d *DB) GetRepositories(id int) ([]models.Repository, error).
 *
 * @param {number} profileId
 * @returns {object[]}
 */
export function getRepositories(profileId) {
  return db
    .prepare("select * from repositories where profile_id = ?")
    .all(profileId);
}

/**
 * Equivalente a (d *DB) DeleteRepositories(id int) error.
 *
 * @param {number} profileId
 * @returns {number} - Número de filas eliminadas.
 */
export function deleteRepositories(profileId) {
  const info = db
    .prepare("delete from repositories where profile_id = ?")
    .run(profileId);

  return info.changes;
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

/**
 * Equivalente a (d *DB) InsertAuditLog(event, resource, ip string) error.
 *
 * @param {string} event
 * @param {string} resource
 * @param {string} ip
 */
export function insertAuditLog(event, resource, ip) {
  db.prepare(
    "insert into audit_log (event, resource, author_ip, timestamp) values (?, ?, ?, ?)"
  ).run(event, resource, ip, new Date().toISOString());
}

/**
 * Equivalente a (d *DB) GetAuditLogs() ([]models.AuditLog, error).
 *
 * @returns {object[]}
 */
export function getAuditLogs() {
  return db.prepare("select * from audit_log").all();
}

// ── Exportar instancia raw por si algún módulo necesita acceso directo ────────
export { db };
