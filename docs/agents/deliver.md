# Deliver — cómo lanzarlo y qué saca

How-to para humanos. El agente sigue [`.agents/skills/deliver/SKILL.md`](../../.agents/skills/deliver/SKILL.md). Tracker: [issue-tracker.md](issue-tracker.md). Contrato del JSON: [run-record.md](../../.agents/skills/deliver/run-record.md).

## Cómo lanzarlo

1. Chat de Cursor en este repo, con `gh` autenticado (issues + PRs).
2. Escribe `/deliver` (o pide la skill `deliver`). No se dispara sola.
3. Elige modo:
   - **3 paradas:** confirmas grill, spec y tickets; después el agente sigue hasta la PR.
   - **Autónomo:** mismo grill; spec y tickets se publican sin esas dos paradas.
4. Primera vez en la máquina: pregunta si instalar el hook de tokens de Cursor. La respuesta queda en `.deliver/hook-asked.json` y no se repite.

Necesitas: `gh`, Yarn, y (si aceptas el hook) Bun.

## Qué saca

| Artefacto | Dónde | Notas |
|---|---|---|
| Issue padre (spec) | GitHub Issues, label `ready-for-agent` | Plantilla de `to-spec` |
| Issues hijos (tickets) | GitHub Issues, mismos label y bloqueos | Uno por rodaja |
| Rama | `feat/<numero-padre>-<slug>` desde `main` | Una rama por tarea |
| Commits | Esa rama | Un ticket verde → commit(s). Formato `tipo(ámbito): descripción` |
| PR lista | GitHub, no draft | `Closes` del padre y de cada hijo. Sin merge. Sin pedir approve |
| Registro de la corrida | `.deliver/runs/*.json` (gitignored) | Fases/checks, agentes, trazas, feedback, evidencias, fallos, timeline, tokens, coste USD. Sin nota de eficiencia |
| Ficha AI Hub | Solo si dices sí al final | Traza + hechos sin citas de código. Huecos de spec se quedan en local |

Entrega = PR abierta, CI accionable verde, feedback high/medium resuelto. Tú merges.

## Sala local (observabilidad)

Consulta las corridas guardadas en `.deliver/runs/` (solo esta máquina):

```bash
yarn deliver:ui
```

Abre http://127.0.0.1:4177 — lista (título de issue + id) y detalle (timeline, coste y tiempo del plan completo). Live via SSE. El USD no va por fila.

Código: `tools/deliver-ui/`.

## Coste económico (USD)

No es la cuota de Cursor. Es **precio de lista** del modelo (API Cursor/Anthropic) sobre tokens capturados.

1. **Hook de tokens** (paso 2 de `/deliver`). Sin hook, JSONL de Cursor no trae tokens → `costUsd` queda `null`.
2. El flujo corre `yarn deliver:tokens` solo: descubre la conversación (transcripts del repo o hook más reciente) y escribe `traces.sessionId` + tokens + subtotal. La sala hace el mismo overlay sin comando.
3. `cost.subtotalUsd` = tarifa de `tools/deliver-ui/cost.mjs` sobre el padre. `totalUsd` se queda `null`. No es la factura de Cursor.

Tarifas: [Models & Pricing](https://cursor.com/docs/models-and-pricing) (snapshot en `cost.mjs`, fecha `PRICE_DATE`). Modelo sin ficha → `null`. Teams: Cursor Token Rate $0.25/M no se suma por defecto (plan individual).

## Tiempo (reloj de pared)

Cuánto tarda la tarea **activa**, no minutos de GPU ni esperas humanas (paradas, confirmaciones, wizard, medición). `/deliver` pone `timing.startedAt` al crear el run y `timing.endedAt` al cerrar. Si faltan, la sala usa min/max de timeline, fases y agentes. Un solo instante → `durationMs: null` (no se inventa `0`). Resta `humanWaits[]` y eventos `timeline` con `step: "human-wait"`. Sin intervalos de espera → queda reloj de pared.

## Qué no saca

Fórmula de eficiencia / ranking de modelos. Docs nuevos si nada existente quedó mentiroso. Issues cerrados antes del merge.
