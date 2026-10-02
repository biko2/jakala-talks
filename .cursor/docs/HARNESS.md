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

## Replicabilidad (sin MSW)

- UI local: `yarn dev:mock` → `Mock*` / `MOCK_USER`. Cero HTTP a Supabase.
- Tests: `InMemory*` inyectado. Cero red.
- **No** poner `NEXT_PUBLIC_SUPABASE_URL` / keys de **prod** en `.env.local` para pruebas.

### Por qué no MSW ahora

MSW interceptaría fetch del adapter Supabase. Sería una cuarta impl (Supabase, Mock, InMemory, Supabase+MSW) y duplicaría el puerto. El hexágono ya corta red vía factories.

MSW tiene sentido en un lote futuro si quieres ejercitar `Supabase*Repository` (401/500/timeout) o E2E Playwright sin backend remoto.

## Permisos

- [`CODEOWNERS`](../../CODEOWNERS): paths sensibles. Sustituir `@USER` por el team/handle real de GitHub.
- [`.cursorignore`](../../.cursorignore): `.env*`, credenciales. No ignora `src/` ni tests.
- Agente: no commit de secretos; migraciones solo si el cambio de schema está pedido.

## Fuera de alcance (lote 2+)

Playwright/E2E, axe-core runtime, Stryker, OpenTelemetry, SonarQube, MSW, Prisma/OpenAPI (este repo usa `supabase/migrations/`).

## Skills relacionadas

- `.agents/skills/deliver` — grill → spec → tickets → TDD → review → PR verde. How-to: [`docs/agents/deliver.md`](../../docs/agents/deliver.md). Sala local: `yarn deliver:ui`
- `.agents/skills/tdd` — red → green
- `.agents/skills/code-review` — review adversarial Standards + Spec
- `.agents/skills/grilling` — stress-test de planes
- `docs/agents/issue-tracker.md` — tracker GitHub Issues para to-spec / to-tickets / code-review
