/**
 * services/pokeapi.js
 *
 * Traducción de internal/service/pokeapi.go
 *
 * Equivalencias Go → JS:
 *   http.Get(url)               → fetch(url)
 *   resp.StatusCode             → res.status / res.ok
 *   json.NewDecoder.Decode      → await res.json()
 *   result.Sprites.FrontDefault → data.sprites.front_default
 */

/**
 * Equivalente a GetPokemonSprite(name string) (string, error).
 *
 * Obtiene la URL del sprite frontal de un Pokémon desde PokéAPI.
 *
 * @param {string} name  - Nombre del Pokémon en minúsculas (ej. "pikachu")
 * @returns {string}     - URL del sprite front_default
 * @throws {Error}
 */
export async function getPokemonSprite(name) {
  // Equivalente a http.Get("https://pokeapi.co/api/v2/pokemon/" + name)
  const res = await fetch(
    `https://pokeapi.co/api/v2/pokemon/${name.toLowerCase()}`
  );

  // Equivalente a if resp.StatusCode != http.StatusOK
  if (!res.ok) {
    throw Object.assign(
      new Error(`pokeapi: status ${res.status}`),
      { statusCode: 502 }
    );
  }

  // Equivalente a json.NewDecoder(resp.Body).Decode(&result)
  const data = await res.json();

  // Equivalente al bloque if result.Sprites.FrontDefault == ""
  const sprite = data?.sprites?.front_default;
  if (!sprite) {
    throw Object.assign(
      new Error(`pokeapi: sprite not found for ${name}`),
      { statusCode: 502 }
    );
  }

  return sprite;
}
