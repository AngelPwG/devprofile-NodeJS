/**
 * services/mapper.js
 *
 * Traducción de internal/service/mapper.go
 *
 * Equivalencias Go → JS:
 *   map[string]string  → Object literal
 *   const defaultPokemon = "Unown"  → idem
 *   strings.ToLower    → .toLowerCase()
 *   strings.TrimSpace  → .trim()
 */

// ── Diccionario lengua → Pokémon ──────────────────────────────────────────────
// Idéntico al var languageToPokemon de mapper.go
const LANGUAGE_TO_POKEMON = {
  javascript: "Pikachu",
  typescript: "Raichu",
  c:          "Mew",
  python:     "Ditto",
  kotlin:     "Gallade",
  swift:      "Gardevoir",
  shell:      "Klingklang",
  bash:       "Klingklang",
  css:        "Kecleon",
  assembly:   "Arceus",
  rust:       "Kingler",
  "c++":      "Mewtwo",
  go:         "Greedent",
  ruby:       "Sableye",
  html:       "Jynx",
  php:        "Phanpy",
  java:       "Metapod",
  "c#":       "Kakuna",
  lua:        "Ninjask",
};

// Equivalente a const defaultPokemon = "Unown"
const DEFAULT_POKEMON = "Unown";

// ── DominantLanguage ──────────────────────────────────────────────────────────

/**
 * Equivalente a DominantLanguage(repos []models.Repository) string.
 *
 * Recorre los repositorios, cuenta frecuencias de lenguaje y devuelve
 * el más frecuente en minúsculas. Devuelve "" si no hay repos o idiomas.
 *
 * @param {Array<{ language: string }>} repos
 * @returns {string}
 */
export function dominantLanguage(repos) {
  // Equivalente a if len(repos) == 0 { return "" }
  if (!repos || repos.length === 0) return "";

  // Equivalente a counts := make(map[string]int)
  const counts = {};

  for (const repo of repos) {
    // Equivalente a if repo.Language == "" { continue }
    if (!repo.language) continue;
    const lang = repo.language.toLowerCase();
    counts[lang] = (counts[lang] ?? 0) + 1;
  }

  // Equivalente a if len(counts) == 0 { return "" }
  if (Object.keys(counts).length === 0) return "";

  // Equivalente al loop for lang, count := range counts { if count > max … }
  let dominant = "";
  let max = 0;
  for (const [lang, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = lang;
    }
  }

  return dominant;
}

// ── LanguageToPokemon ──────────────────────────────────────────────────────────

/**
 * Equivalente a LanguageToPokemon(language string) string.
 *
 * Mapea un lenguaje de programación a un Pokémon.
 * Usa DEFAULT_POKEMON ("Unown") si el lenguaje no está en el diccionario.
 *
 * @param {string} language
 * @returns {string}  Nombre del Pokémon con capitalización original del map
 */
export function languageToPokemon(language) {
  // Equivalente a strings.ToLower(strings.TrimSpace(language))
  const normalized = language.trim().toLowerCase();
  return LANGUAGE_TO_POKEMON[normalized] ?? DEFAULT_POKEMON;
}
