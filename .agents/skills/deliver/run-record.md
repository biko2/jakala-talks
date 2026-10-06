# Contrato del registro de ejecución

Cada run de `/deliver` escribe un JSON en `.deliver/runs/`. Esa carpeta está en `.gitignore`. Este fichero (commiteado) es el contrato que una sala de control futura leerá.

## Ruta

```
.deliver/runs/<yyyy-mm-dd>T<hhmmss>Z-<padre>.json
```

Ejemplo: `.deliver/runs/2026-10-02T125900Z-42.json`

Preferencias del hook: `.deliver/hook-asked.json` (también ignorado).

## Forma

Hechos crudos. Sin nota de eficiencia. `null` = dato desconocido; nunca inventar un `0`.

```json
{
  "schemaVersion": "1",
  "recordedAt": "2026-10-02T12:59:00.000Z",
  "workflow": "deliver",
  "mode": "three-gates | autonomous",
  "harness": "cursor",
  "model": "string | null",
  "parentIssue": { "number": 42, "title": "Título del issue padre", "url": "https://github.com/..." },
  "ticketIssues": [{ "number": 43, "title": "Ticket slice", "url": "https://github.com/..." }],
  "pr": { "number": 99, "url": "https://github.com/..." },
  "branch": "feat/42-slug",
  "humanGates": {
    "grillConfirmed": true,
    "specConfirmed": true,
    "ticketsConfirmed": true
  },
  "humanWaits": [
    {
      "gate": "grill",
      "startedAt": "2026-10-02T12:51:00.000Z",
      "endedAt": "2026-10-02T12:54:00.000Z"
    }
  ],
  "ci": { "status": "passed | failed | unknown", "checksFailed": [] },
  "acceptance": { "met": 3, "total": 3 },
  "specGaps": [
    {
      "requirement": "texto del hueco o requisito parcial",
      "status": "missing | partial | wrong | noted"
    }
  ],
  "tokens": {
    "scope": "parent-only",
    "coverage": "hook | unknown | partial",
    "values": {
      "input": null,
      "output": null,
      "cachedInput": null,
      "cacheWriteInput": null,
      "reasoningOutput": null,
      "total": null
    }
  },
  "tools": {},
  "toolCategories": {},
  "skills": {},
  "timeline": [
    {
      "at": "2026-10-02T12:50:00.000Z",
      "step": "mode",
      "status": "done",
      "label": "Modo 3 paradas"
    }
  ],
  "phases": [
    {
      "id": "grill",
      "label": "Grill",
      "status": "done",
      "startedAt": "2026-10-02T12:50:00.000Z",
      "endedAt": "2026-10-02T12:51:00.000Z",
      "checks": [
        {
          "id": "grill-shared",
          "label": "Entendimiento compartido",
          "status": "pass",
          "at": "2026-10-02T12:51:00.000Z"
        }
      ]
    }
  ],
  "agents": [
    {
      "id": "parent",
      "role": "orchestrator",
      "kind": "parent",
      "model": "string | null",
      "ticketIssue": null,
      "parentId": null,
      "childIds": [],
      "startedAt": "2026-10-02T12:50:00.000Z",
      "endedAt": null,
      "status": "running"
    }
  ],
  "traces": {
    "sessionId": null,
    "transcriptHint": null,
    "sessionSlices": []
  },
  "feedback": [
    {
      "at": "2026-10-02T12:56:00.000Z",
      "source": "code-review-spec",
      "severity": "high",
      "status": "fixed",
      "summary": "Requisito X parcial",
      "url": null
    }
  ],
  "evidence": [
    {
      "at": "2026-10-02T12:57:00.000Z",
      "kind": "test",
      "label": "yarn test",
      "ref": null,
      "result": "pass",
      "detail": null
    }
  ],
  "failures": [
    {
      "at": "2026-10-02T12:57:10.000Z",
      "phase": "pr",
      "kind": "lint",
      "summary": "ESLint falló en un archivo",
      "attempts": 1,
      "resolved": true,
      "detail": null
    }
  ],
  "timing": {
    "startedAt": "2026-10-02T12:50:00.000Z",
    "endedAt": null,
    "durationMs": null
  },
  "cost": {
    "currency": "USD",
    "kind": "api-equivalent",
    "totalUsd": null,
    "subtotalUsd": null,
    "coverage": "unknown",
    "source": "unknown",
    "scope": "parent-only"
  },
  "traceMetadata": null,
  "notes": "tokens de subagentes no incluidos; cobertura del hook si aplica"
}
```

### Campos

| Campo | Significado |
|---|---|
| `mode` | `three-gates` o `autonomous` |
| `humanGates.*` | En autónomo, `specConfirmed` y `ticketsConfirmed` son `false` (paradas saltadas) |
| `humanWaits` | Intervalos de espera humana (`gate`, `startedAt`, `endedAt`). Vacío si no hubo parada. La sala los resta de `timing.durationMs` |
| `acceptance` | Criterios de aceptación de todos los tickets: cumplidos / total |
| `specGaps` | Hallazgos del eje Spec de `code-review` (texto libre; solo en local) |
| `tokens.scope` | Siempre `parent-only`: los tickets van en subagentes y el hook de Cursor no los cuenta |
| `tokens.coverage` | `hook` si hay datos del hook; `unknown` si no hay hook; `partial` si el hook se instaló a mitad del run |
| `tools` / `toolCategories` / `skills` | Contadores del intervalo, misma forma que `trace_metadata` de `registrar-medicion-ia` cuando existan; `{}` si no |
| `timeline` | Eventos del proceso en orden. Cada uno: `at` (ISO), `step`, `status`, `label`, `detail` opcional. Sin coste por fila |
| `timing` | `startedAt`/`endedAt` = reloj de pared. `durationMs` = tiempo activo (sin esperas humanas). Si `durationMs` es `null`, la sala deriva min/max y resta `humanWaits` / `timeline` `human-wait`. Un instante → `null`. No inventar `0`. No es GPU |
| `cost` | Equivalente API en USD del **padre**. `totalUsd` solo si la cobertura es completa; si no, `null` y `subtotalUsd` con el hook. `scope: parent-only`. Nunca inventar `0`. No es cargo de suscripción. `/deliver` corre `yarn deliver:tokens` (descubre sesión). La sala overlay en vivo. Si hay `traceMetadata.apiCost`, cópialo aquí |
| `phases` | Fases del workflow. Cada una: `id`, `label`, `status`, `startedAt`/`endedAt`, `checks[]` (`id`, `label`, `status` pass/fail/skip/pending, `at`) |
| `agents` | Padre y cada subagente que `/deliver` despacha. Campos: `id`, `role` (orchestrator/implement/review-standards/review-spec/research/other), `kind` (parent/subagent), `model`, `ticketIssue`, `startedAt`/`endedAt`, `status`. Refs: padre `childIds[]`; hijo `parentId`. Sin refs entre hermanos. `id` hijo = `{role}-{ticketNumber}` o `{role}-{n}` único en el run. Tokens/`$` no van en el hijo |
| `traces` | Punteros de traza: `sessionId`, `transcriptHint`, `sessionSlices`. Sin prompts ni contenido de archivos |
| `feedback` | Review y comentarios: `source`, `severity` (high/medium/low), `status` (open/fixed/skipped/false-positive), `summary`, `url` |
| `evidence` | Pruebas de trabajo: `kind` (commit/test/lint/typecheck/arch/build/pr/issue/command), `label`, `ref` (sha/url/comando), `result` (pass/fail/unknown). Sin dumps de código |
| `failures` | Fallos: `phase`, `kind`, `summary`, `attempts`, `resolved`, `detail` opcional |
| `traceMetadata` | Salida de `build-task-trace` si se generó; si no, `null` |

## Qué viaja a AI Hub

Si el usuario acepta registrar la medición, la ficha lleva en `trace_metadata`:

- la traza del analizador (`traceMetadata` de arriba), y
- hechos de entrega **sin citas de código**: `ci`, `acceptance`, URLs de issue/PR, `tokens.coverage` / `tokens.scope`, `cost` (USD y cobertura), conteos de `phases`/`agents`/`feedback`/`failures` (solo números y status).

`specGaps`, `feedback[].summary`, `evidence[].detail` y `failures[].detail` (pueden citar código) **no** se suben. Quedan solo en el JSON local.

## Sala de control

Local: `yarn deliver:ui` → http://127.0.0.1:4177 lee `.deliver/runs/` y se actualiza sola cuando cambia un JSON (SSE + `fs.watch`). Entre desarrolladores, la comparación sale de las fichas de AI Hub cuando existan. Sin nota de eficiencia en el JSON.
