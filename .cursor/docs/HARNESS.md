# Harness de IA — Jakala Talks

El filtro multicapa (queso suizo) vive en [`AGENTS.md`](../../AGENTS.md). Aquí: scripts, límites y decisiones.

## Gates

| Comando | Qué hace | Dónde |
|---|---|---|
| `yarn lint` / `yarn lint:fix` | ESLint (`eslint-config-next`, jsx-a11y) | pre-commit (staged), pre-push, CI |
| `yarn typecheck` | `tsc --noEmit` | CI, local on-demand (pre-push usa `build`) |
| `yarn lint:arch` | dependency-cruiser: capas hexágono, sin ciclos | pre-push, CI |
| `yarn test` | Jest + Testing Library | pre-push, CI |
| `yarn build` | Next build | pre-push, CI |

Arquitectura forzada en código de producción (`__tests__` exentos): dominio no importa afuera; application solo dominio; infrastructure no importa UI.

## Replicabilidad (MSW)

- UI local: `yarn dev` (o el alias `yarn dev:mock`) → worker MSW intercepta HTTP de Supabase. Fixture en `src/infrastructure/msw/`. Cero red real.
- Backend real en local: `NEXT_PUBLIC_USE_SUPABASE=true` + URL/keys de **dev** o Supabase local.
- Tests: `InMemory*` inyectado. Cero red. Jest no arranca el worker.
- **No** poner `NEXT_PUBLIC_SUPABASE_URL` / keys de **prod** en `.env.local` para pruebas.

El hexágono sigue cortando red en tests vía factories. MSW no es un puerto: envuelve el mismo `TalkRepository` / `Supabase*` en el navegador.

## Permisos

- [`CODEOWNERS`](../../CODEOWNERS): paths sensibles. Owner `@drzkn`.
- [`.cursorignore`](../../.cursorignore): `.env*`, credenciales. No ignora `src/` ni tests.
- Agente: no commit de secretos; migraciones solo si el cambio de schema está pedido.

## Fuera de alcance (lote 2+)

Playwright/E2E, simulación de errores MSW, axe-core runtime, Stryker, OpenTelemetry, SonarQube, Prisma/OpenAPI (este repo usa `supabase/migrations/`).

## Skills relacionadas

- `.agents/skills/deliver` — grill → spec → tickets → TDD → review → PR verde. How-to: [`docs/agents/deliver.md`](../../docs/agents/deliver.md). Sala: `yarn deliver:ui`. Hook→USD: `yarn deliver:tokens`
- `.agents/skills/tdd` — red → green
- `.agents/skills/code-review` — review adversarial Standards + Spec
- `.agents/skills/grilling` — stress-test de planes
- `docs/agents/issue-tracker.md` — tracker GitHub Issues para to-spec / to-tickets / code-review
