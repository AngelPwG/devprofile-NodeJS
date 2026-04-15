/**
 * services/builder.js
 *
 * Traducción de internal/service/builder.go
 *
 * Orquesta GetRepos → DominantLanguage → LanguageToPokemon → GetPokemonSprite
 * y devuelve el perfil completo junto con sus repositorios.
 *
 * Equivalencias Go → JS:
 *   fmt.Errorf("builder: github: %w", err)  → Error con prefijo + causa
 *   profile.Language = language              → profile.language = language
 */

import { getRepos } from "./github.js";
import { getPokemonSprite } from "./pokeapi.js";
import { dominantLanguage, languageToPokemon } from "./mapper.js";

/**
 * Equivalente a BuildProfile(username string) (*models.Profile, []models.Repository, error).
 *
 * Pasos (idénticos al builder de Go):
 *  1. Obtiene datos del usuario y repositorios desde GitHub GraphQL.
 *  2. Calcula el lenguaje dominante entre los repositorios.
 *  3. Mapea el lenguaje al Pokémon correspondiente.
 *  4. Obtiene el sprite del Pokémon desde PokéAPI.
 *  5. Devuelve el perfil completo y los repositorios.
 *
 * @param {string} username  - Login de GitHub
 * @returns {{ profile: object, repos: object[] }}
 * @throws {Error}
 */
export async function buildProfile(username) {
  // Equivalente a profile, repos, err := GetRepos(username)
  let profile, repos;
  try {
    ({ profile, repos } = await getRepos(username));
  } catch (err) {
    // Equivalente a fmt.Errorf("builder: github: %w", err)
    throw Object.assign(
      new Error(`builder: github: ${err.message}`),
      { statusCode: err.statusCode ?? 502, cause: err }
    );
  }

  // Equivalente a language := DominantLanguage(repos)
  const language = dominantLanguage(repos);
  // Equivalente a profile.Language = language
  profile.language = language;

  // Equivalente a pokemonName := LanguageToPokemon(language)
  const pokemonName = languageToPokemon(language);
  // Equivalente a profile.Pokemon = pokemonName
  profile.pokemon = pokemonName;

  // Equivalente a spriteURL, err := GetPokemonSprite(pokemonName)
  let spriteURL;
  try {
    spriteURL = await getPokemonSprite(pokemonName);
  } catch (err) {
    // Equivalente a fmt.Errorf("builder: pokeapi: %w", err)
    throw Object.assign(
      new Error(`builder: pokeapi: ${err.message}`),
      { statusCode: err.statusCode ?? 502, cause: err }
    );
  }

  // Equivalente a profile.PokemonImg = spriteURL
  profile.pokemon_img = spriteURL;

  return { profile, repos };
}
