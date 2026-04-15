/**
 * services/github.js
 *
 * Traducción de internal/service/github.go
 *
 * Equivalencias Go → JS:
 *   http.NewRequest + client.Do  → fetch (nativo en Node >=18)
 *   json.Marshal / json.Decode   → JSON.stringify / await res.json()
 *   os.Getenv("GITHUB_TOKEN")    → process.env.GITHUB_TOKEN
 *   models.Profile / Repository  → objetos JS planos
 */

// ── Query GraphQL ─────────────────────────────────────────────────────────────
// Idéntica a la constante reposQuery de github.go
const reposQuery = `
query($login: String!) {
  user(login: $login) {
    name
    login
    avatarUrl
    bio
    followers { totalCount }
    following  { totalCount }
    repositories(first: 5, orderBy: {field: CREATED_AT, direction: DESC}) {
      totalCount
      nodes {
        name
        primaryLanguage { name }
      }
    }
    pinnedItems(first: 6, types: [REPOSITORY]) {
      nodes {
        ... on Repository {
          name
          primaryLanguage { name }
        }
      }
    }
    contributionsCollection {
      totalCommitContributions
    }
  }
}`;

// ── GetRepos ──────────────────────────────────────────────────────────────────

/**
 * Equivalente a GetRepos(username string) (*models.Profile, []models.Repository, error).
 *
 * Llama a la API GraphQL de GitHub y devuelve el perfil y sus repositorios.
 *
 * @param {string} username  - Login de GitHub (ej. "AngelPwG")
 * @returns {{ profile: object, repos: object[] }}
 * @throws {Error} Con mensajes equivalentes a los fmt.Errorf de Go
 */
export async function getRepos(username) {
  const token = process.env.GITHUB_TOKEN;

  // Equivalente a json.Marshal(body)
  const body = JSON.stringify({
    query: reposQuery,
    variables: { login: username },
  });

  // Equivalente a http.NewRequest + Header.Set + client.Do
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body,
  });

  // Equivalente a if resp.StatusCode != http.StatusOK
  if (!res.ok) {
    throw Object.assign(new Error(`github: status ${res.status}`), {
      statusCode: 502,
    });
  }

  // Equivalente a json.NewDecoder(resp.Body).Decode(&ghResp)
  const ghResp = await res.json();

  // Equivalente al bloque if len(ghResp.Errors) > 0
  if (ghResp.errors && ghResp.errors.length > 0) {
    const msg = ghResp.errors[0].message;
    if (msg.includes("Could not resolve to a User")) {
      const err = new Error("user not found");
      err.statusCode = 404;
      throw err;
    }
    throw Object.assign(new Error(`github: api error: ${msg}`), {
      statusCode: 502,
    });
  }

  const u = ghResp.data.user;

  // ── Construir repos (pinnedItems tiene prioridad, igual que en Go) ──
  // Equivalente al bloque if len(u.PinnedItems.Nodes) > 0 … else …
  let repos = [];

  if (u.pinnedItems.nodes.length > 0) {
    repos = u.pinnedItems.nodes.map((node) => ({
      name: node.name,
      language: node.primaryLanguage?.name ?? "",
    }));
  } else {
    const limit = Math.min(u.repositories.nodes.length, 5);
    repos = u.repositories.nodes.slice(0, limit).map((node) => ({
      name: node.name,
      language: node.primaryLanguage?.name ?? "",
    }));
  }

  // ── Construir profile ─────────────────────────────────────────────────
  // Equivalente al bloque profile := &models.Profile{…}
  const profile = {
    github_user: u.login,
    name: u.name,
    avatar_url: u.avatarUrl,
    bio: u.bio,
    followers: u.followers.totalCount,
    following: u.following.totalCount,
    public_repos: u.repositories.totalCount,
    // language, pokemon y pokemon_img los completa builder.js
    language: "",
    pokemon: "",
    pokemon_img: "",
  };

  return { profile, repos };
}
