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

- UI local: `yarn dev` → adapters `Supabase*` reales contra Mock Service Worker en navegador + `MOCK_USER`. Cero HTTP a Supabase. Opt-out: `NEXT_PUBLIC_API_MOCKING=disabled`.
- Tests de casos de uso: `InMemory*` inyectado. Cero red.
- Tests de adapters `Supabase*` e integración sobre HTTP: `msw/node`, mismos handlers (`lib/mock/msw/`). `server.use(...)` para forzar 4xx/5xx.
- **No** poner `NEXT_PUBLIC_SUPABASE_URL` / keys de **prod** en `.env.local` para pruebas.

### Por qué MSW y no `Mock*`

MSW intercepta en el borde HTTP, no en el puerto: no es otra impl. Quedan dos impls del puerto (Supabase runtime, InMemory tests) y en local se ejercita el adapter real. Supabase en dev deja de ser prioritario.

### Límites del mock

- Auth no se simula: con mocking, `proxy.ts` no consulta sesión y el cliente usa `MOCK_USER`. Login/logout salen a la red y fallan.
- Handlers con estado en memoria; recargar vuelve a la semilla. Fechas de `voting_config` semilla fijas.
- Solo filtros `eq.` y lo que usan los adapters. Otra query → 400 `PGRST100`; ampliar handlers al añadirla.

## Permisos

- [`CODEOWNERS`](../../CODEOWNERS): paths sensibles. Owner `@drzkn`.
- [`.cursorignore`](../../.cursorignore): `.env*`, credenciales. No ignora `src/` ni tests.
- Agente: no commit de secretos; migraciones solo si el cambio de schema está pedido.

## Fuera de alcance (lote 2+)

Playwright/E2E, axe-core runtime, Stryker, OpenTelemetry, SonarQube, auth simulada en MSW, Prisma/OpenAPI (este repo usa `supabase/migrations/`).

## Skills relacionadas

- `.agents/skills/deliver` — grill → spec → tickets → TDD → review → PR verde. How-to: [`docs/agents/deliver.md`](../../docs/agents/deliver.md). Sala de bitácoras: `yarn deliver:ui`
- `.agents/skills/bitacora` — único registro de tareas largas en `.agents/bitacoras/` (con `/bitacora`, o siempre dentro de `/deliver`). Se ve en `yarn deliver:ui`
- `.agents/skills/tdd` — red → green
- `.agents/skills/code-review` — review adversarial Standards + Spec
- `.agents/skills/grilling` — stress-test de planes
- `docs/agents/issue-tracker.md` — tracker GitHub Issues para to-spec / to-tickets / code-review
