# AGENTS.md

Jakala Talks: proponer y votar charlas. Next.js 16 App Router + React 19 + TypeScript + Supabase (Postgres + Google OAuth). Hexágono en `src/`. Node commands: `yarn`.

## Mapa

| Path | Qué hay |
|---|---|
| `src/domain` | Entidades, VOs, puertos |
| `src/application/services` | Casos de uso |
| `src/infrastructure/adapters` | Impl. de puertos (Supabase + InMemory) |
| `lib/` | Composition root: clients Supabase, factories, mock, env |
| `app/` | App Router. No `pages/` |
| `components/` | UI React |
| `supabase/migrations/` | Schema real |
| `.cursor/docs/` | Onboarding y env (no existe `docs/` en raíz) |

Alias: `@/*` → raíz del repo.

## Convenciones que el árbol no grita

**Composition.** UI y `app/` piden repos a `*Factory` en `lib/repositories/`. No instanciar adaptadores a mano fuera de factory o test.

**Tres impls, tres sitios.** `TalkRepository` / `Supabase*` = runtime real. `Mock*` + `MOCK_USER` = `yarn dev:mock` (`NEXT_PUBLIC_USE_MOCK_USER=true`). `InMemory*` = tests. Integración: caso de uso + InMemory.

**Auth.** Supabase OAuth directo, no NextAuth. `NEXTAUTH_URL` es solo URL de la app (nombre legado). Callback: `app/auth/callback`. Edge session: `proxy.ts` (Next 16). No crear `middleware.ts`.

**UI.** Un componente = carpeta `Name/Name.tsx` + `Name.styles.ts` (styled-components) + `index.ts` + `__tests__/`. Tailwind vive en `app/globals.css`, no sustituye `.styles.ts`.

**Tests.** Colocados: `foo/__tests__/foo.test.ts`. Integración: `*.integration.test.ts` al lado del caso de uso. No hay carpeta `tests/`. Feature nueva o cambiada lleva unit + integración.

**Dominio.** Errores de negocio en español. `Talk`: título ≤50, descripción ≤400. Votos: recuento derivado de `user_votes` vía RPC `get_talk_vote_counts`, no columna en `talks`. Schema: editar migraciones, no el SQL del README.

**Votación.** Fases `waiting → proposing → voting → closed`. Crear charla solo en `waiting`/`proposing`. Votar solo en `voting` y bajo `maxVotesPerUser`. `VoteTalk` es toggle (votar/desvotar). Fechas y cupo: `src/domain/valueObjects/VotingRules.ts`.

## Cuándo leer qué

- Onboarding, `yarn dev` / `yarn dev:mock`, Google OAuth, Site URL, Redirect URLs, login roto en prod, deploy → `.cursor/docs/ONBOARDING.md`
- Qué significa cada variable de `.env.example` → `.cursor/docs/VARIABLES_ENTORNO.md`
- Hexágono, puertos, DI, nada de SDK en domain/application → `.cursor/rules/arquitectura/`
- Estrategia de tests → `.cursor/rules/testing/`
- Schema y RLS → `supabase/migrations/`
- Casos de uso actuales: `GetAllTalks`, `CreateTalk`, `VoteTalk`, `GetUserVotes`

## Arranque

```bash
yarn install
yarn dev:mock    # UI sin Supabase
yarn test        # Jest + Testing Library
```

`yarn dev` pide `.env.local` (copia de `.env.example`). Pre-push Husky: `yarn test` + `yarn build`.
