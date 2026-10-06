---
name: deliver
description: Flujo de entrega de una tarea, del grill a la PR verde.
disable-model-invocation: true
---

# Deliver

Orquesta el ciclo completo de una tarea hasta una PR verde. Invoca las skills del repo; no copies su cuerpo: léelas y síguelas.

How-to humano (lanzar y artefactos) → [`docs/agents/deliver.md`](../../../docs/agents/deliver.md). Contrato del registro local → [run-record.md](run-record.md). Tracker → [`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md).

## Registro vivo

El JSON local es la fuente de observabilidad. Tras **cada** paso (y en cada fallo), actualízalo. No esperes al final.

- `timeline.push({ at, step, status, label, detail? })` — sin coste por paso. Al parar por humano (modo, grill, spec, tickets, wizard, medición): `step: "human-wait"`, `status: "started"`; al volver, `status: "done"`. O cierra el intervalo en `humanWaits[]`.
- `cost` y `timing` son del **plan completo**. Tras cada paso del padre: `yarn deliver:tokens` (sesión + tokens + `cost.subtotalUsd`). `timing.startedAt` al crear, `endedAt` al cerrar. `durationMs` = activo (sin esperas humanas) o `null` para que la sala reste las paradas. Nunca inventar `0`.
- No rellenes `costUsd`/`tokensDelta` en cada evento ni en cada subagente.
- `phases`: upsert por `id` del paso. `started` al entrar, `done`/`failed`/`skipped` al salir. Cada criterio de done del paso = un `checks[]` (`pass`/`fail`/`skip`/`pending`)
- `agents`: el padre al crear el run. Cada subagente (tdd, code-review, research): alta al despachar, `endedAt`+`status` al volver. Anota `model` si se conoce, `ticketIssue` si aplica
- `traces.sessionId`: lo rellena `yarn deliver:tokens` (no lo pidas al usuario). `transcriptHint` / `sessionSlices` si corre el analizador. `traceMetadata` al medir. Nunca prompts ni contenidos
- `feedback`: cada hallazgo de `code-review` y cada comentario high/medium/low de `iterate-pr` (`source`, `severity`, `status`, `summary`). Al resolver, `status: fixed` (no borrar)
- `evidence`: commits (sha), issues/PR (url), y cada gate local (`yarn lint` / `typecheck` / `lint:arch` / `test` / `build`) con `result` pass/fail. Sin pegar logs enteros ni código
- `failures`: cada fallo (test, lint, CI, agente, review). `resolved: true` cuando se arregla. Incrementa `attempts` si se reintenta

**Done when:** el run refleja el paso actual: fase, checks, agentes vivos, evidencias y fallos al día.

## 1. Modo

Pregunta: **3 paradas** o **autónomo**.

Tras la respuesta: crea `.deliver/runs/<iso>-pending.json` (luego renómbralo con el número del padre) con el esqueleto del contrato (`timeline`, `phases`, `agents`, `traces`, `feedback`, `evidence`, `failures`, `cost`, `timing.startedAt` ahora). Sigue Registro vivo.

**Done when:** el usuario eligió un modo y el run file existe.

## 2. Hook de tokens (solo la primera vez)

Si no existe `.deliver/hook-asked.json`, pregunta si se instala el hook de tokens de Cursor de `registrar-medicion-ia` (`bun scripts/install-cursor-hook.ts` desde esa skill). Guarda la respuesta en `.deliver/hook-asked.json` (`{"askedAt":"<iso>","install":true|false}`) y no vuelvas a preguntar. Si acepta, ejecuta el instalador.

Tras **cada** paso del padre (y al cierre): `yarn deliver:tokens`. No pidas sessionId. El script usa el hook + transcripts de este repo. La sala hace el mismo overlay en vivo. Cobertura `parent-only`: no es factura. Sin turnos del hook → deja `null`.

**Done when:** el fichero existe (instalado, rechazado, o ya preguntado antes).

## 3. Grill

Lee e invoca `grill-me` → `grilling` hasta entendimiento compartido. Confirmación del usuario = parada 1 en ambos modos.

**Done when:** el usuario confirma el entendimiento compartido.

## 4. Research / wizard (opcionales)

- `research` solo si una decisión necesita fuente primaria. El markdown no se commitea salvo que actualice un doc ya existente.
- `wizard` solo si el paso es de persona (secreto, dashboard). Párate ahí hasta que termine.

**Done when:** no queda investigación bloqueante ni wizard pendiente.

## 5. Spec (`to-spec`)

Sintetiza la spec (sin re-entrevistar). Seams de test en la sección Testing Decisions.

- **3 paradas:** enseña el borrador; espera el sí; publica el issue padre.
- **Autónomo:** publica al cerrar el grill.

Aplica `ready-for-agent`. Guarda en el run `parentIssue: { number, title, url }` (título = título del issue en GitHub). Rama: `feat/<numero-padre>-<slug>` desde `main` (créala tras tener el número del padre).

**Done when:** el issue padre existe y su URL/título están anotados.

## 6. Tickets (`to-tickets`)

Rodajas verticales con edges de bloqueo. No modifiques el issue padre.

- **3 paradas:** quiz de granularidad; espera aprobación; publica hijos.
- **Autónomo:** publica sin quiz.

**Done when:** todos los hijos están publicados con `ready-for-agent` y sus `number`/`title`/`url` anotados en el run.

## 7. Implementación (`tdd` por ticket)

Trabaja la frontera: tickets cuyos bloqueadores están hechos.

Por cada ticket, despacha un **subagente de contexto fresco** con: cuerpo del ticket, URL de la spec, seams ya escritos. Alta en `agents` al despachar; al volver: `status` done/failed, `evidence` del commit, `failures` si el slice falla. El subagente sigue `tdd` (rojo → verde, un slice). Al verde: commit en la rama, formato de `commit` (`tipo(ámbito): descripción`), **sin** pedir confirmación (excepción solo dentro de `/deliver`; `/commit` suelto sigue pidiendo sí).

**Done when:** cada ticket tiene commit(s) que cubren sus criterios de aceptación.

## 8. Review (`code-review`)

Fixed point: merge-base con `main`. Eje Spec: issue padre. Corrige violaciones duras de estándares y huecos de spec antes de la PR. Smell de juicio: arréglalo si el cambio es local; si no, anótalo para el cuerpo de la PR. Cada hallazgo → `feedback` + `specGaps`; cada corrección → `status: fixed` y `evidence`.

**Done when:** no quedan violaciones duras ni huecos de spec sin resolver o anotar.

## 9. Docs

Si el cambio deja mentiroso un doc existente (`AGENTS.md`, `.cursor/docs/`, onboarding), actualízalo en la misma rama. Si no, no toques docs. Docs de agente → criterio de `writing-for-agents`.

**Done when:** ningún doc existente contradice el cambio, o no había doc que tocar.

## 10. PR (`creating-pr`)

Antes del push, en local: `yarn lint`, `yarn typecheck`, `yarn lint:arch`, `yarn test`, `yarn build`. Cada comando → `evidence` (y `failures` si falla). No saltar hooks.

PR lista (no draft). Título `type: description`. Cuerpo en castellano (`Resumen`, `Cambios`, `Plan de pruebas`) con `Closes` del padre y de cada hijo. No pedir reviewer de CODEOWNERS.

**Done when:** la PR está abierta y su URL anotada en la tarjeta del padre y en el registro.

## 11. CI y feedback (`iterate-pr`)

Sigue `iterate-pr` hasta CI verde y feedback high/medium resuelto. Cada check y comentario → `evidence` / `feedback` / `failures`. Hereda sus salidas (dos fallos iguales → pregunta; gates humanos → para). No merges. No esperes approve.

**Done when:** checks accionables en verde y feedback high/medium limpio, o el usuario debe intervenir según `iterate-pr`.

## 12. Registro local

Asegura el JSON final según [run-record.md](run-record.md). Obligatorio: `phases`+`checks`, `agents`, `traces`/`traceMetadata`, `feedback`, `evidence`, `failures`, `timeline`, `cost`, `timing`. Arrays vacíos si no hubo ítems; no omitas las claves. `cost.totalUsd`/`subtotalUsd` y `timing.durationMs` en `null` si no hay dato. Cierra `timing.endedAt` y el agente padre.

**Done when:** el fichero existe y esas claves están presentes.

## 13. Medición (optativa)

Pregunta: ¿registrar la medición en AI Hub?

Si sí: sigue `registrar-medicion-ia` en automático. En `trace_metadata` mete la traza del analizador más hechos sin citas de código (CI, criterios, URLs, cobertura, coste USD, conteos de fases/agentes/feedback/fallos). Copia `traceMetadata.apiCost` a `cost`. `specGaps`, textos de feedback/evidence/failures se quedan en el JSON local. Si el MCP falla, conserva el JSON local; la entrega no se deshace. Guarda el fallo en `failures`.

**Done when:** el usuario dijo no, o la ficha quedó creada / el fallo del MCP quedó informado.

## Entrega

La tarea está entregada cuando la PR está abierta, el CI accionable está verde y el feedback high/medium está resuelto. Sin merge. Sin esperar approve.
