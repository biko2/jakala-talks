# Contrato del registro de ejecución

Cada corrida de `/deliver` escribe un JSON en `.deliver/runs/`. Esa carpeta está en `.gitignore`. Este fichero (commiteado) es el contrato que una sala de control futura leerá.

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
  "parentIssue": { "number": 42, "url": "https://github.com/..." },
  "ticketIssues": [{ "number": 43, "url": "https://github.com/..." }],
  "pr": { "number": 99, "url": "https://github.com/..." },
  "branch": "feat/42-slug",
  "humanGates": {
    "grillConfirmed": true,
    "specConfirmed": true,
    "ticketsConfirmed": true
  },
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
  "traceMetadata": null,
  "notes": "tokens de subagentes no incluidos; cobertura del hook si aplica"
}
```

### Campos

| Campo | Significado |
|---|---|
| `mode` | `three-gates` o `autonomous` |
| `humanGates.*` | En autónomo, `specConfirmed` y `ticketsConfirmed` son `false` (paradas saltadas) |
| `acceptance` | Criterios de aceptación de todos los tickets: cumplidos / total |
| `specGaps` | Hallazgos del eje Spec de `code-review` (texto libre; solo en local) |
| `tokens.scope` | Siempre `parent-only`: los tickets van en subagentes y el hook de Cursor no los cuenta |
| `tokens.coverage` | `hook` si hay datos del hook; `unknown` si no hay hook; `partial` si el hook se instaló a mitad de corrida |
| `tools` / `toolCategories` / `skills` | Contadores del intervalo, misma forma que `trace_metadata` de `registrar-medicion-ia` cuando existan; `{}` si no |
| `traceMetadata` | Salida de `build-task-trace` si se generó; si no, `null` |

## Qué viaja a AI Hub

Si el usuario acepta registrar la medición, la ficha lleva en `trace_metadata`:

- la traza del analizador (`traceMetadata` de arriba), y
- hechos de entrega **sin citas de código**: `ci`, `acceptance`, URLs de issue/PR, `tokens.coverage` / `tokens.scope`.

`specGaps` (texto que puede citar código) **no** se sube. Queda solo en el JSON local.

## Sala de control

Local: `yarn deliver:ui` → http://127.0.0.1:4177 lee `.deliver/runs/` (ver [`docs/agents/deliver.md`](../../../docs/agents/deliver.md)). Entre desarrolladores, la comparación sale de las fichas de AI Hub cuando existan. Sin nota de eficiencia en el JSON.
