---
name: deliver
description: Flujo de entrega de una tarea, del grill a la PR verde.
disable-model-invocation: true
---

# Deliver

Orquesta el ciclo completo de una tarea hasta una PR verde. Invoca las skills del repo; no copies su cuerpo: léelas y síguelas.

How-to humano (lanzar y artefactos) → [`docs/agents/deliver.md`](../../../docs/agents/deliver.md). Contrato del registro local → [run-record.md](run-record.md). Tracker → [`docs/agents/issue-tracker.md`](../../../docs/agents/issue-tracker.md).

## 1. Modo

Pregunta: **3 paradas** o **autónomo**.

**Done when:** el usuario eligió un modo.

## 2. Hook de tokens (solo la primera vez)

Si no existe `.deliver/hook-asked.json`, pregunta si se instala el hook de tokens de Cursor de `registrar-medicion-ia` (`bun scripts/install-cursor-hook.ts` desde esa skill). Guarda la respuesta en `.deliver/hook-asked.json` (`{"askedAt":"<iso>","install":true|false}`) y no vuelvas a preguntar. Si acepta, ejecuta el instalador.

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

Aplica `ready-for-agent`. Rama: `feat/<numero-padre>-<slug>` desde `main` (créala tras tener el número del padre).

**Done when:** el issue padre existe y su URL está anotada.

## 6. Tickets (`to-tickets`)

Rodajas verticales con edges de bloqueo. No modifiques el issue padre.

- **3 paradas:** quiz de granularidad; espera aprobación; publica hijos.
- **Autónomo:** publica sin quiz.

**Done when:** todos los hijos están publicados con `ready-for-agent` y sus URLs anotadas.

## 7. Implementación (`tdd` por ticket)

Trabaja la frontera: tickets cuyos bloqueadores están hechos.

Por cada ticket, despacha un **subagente de contexto fresco** con: cuerpo del ticket, URL de la spec, seams ya escritos. El subagente sigue `tdd` (rojo → verde, un slice). Al verde: commit en la rama, formato de `commit` (`tipo(ámbito): descripción`), **sin** pedir confirmación (excepción solo dentro de `/deliver`; `/commit` suelto sigue pidiendo sí).

**Done when:** cada ticket tiene commit(s) que cubren sus criterios de aceptación.

## 8. Review (`code-review`)

Fixed point: merge-base con `main`. Eje Spec: issue padre. Corrige violaciones duras de estándares y huecos de spec antes de la PR. Smell de juicio: arréglalo si el cambio es local; si no, anótalo para el cuerpo de la PR.

**Done when:** no quedan violaciones duras ni huecos de spec sin resolver o anotar.

## 9. Docs

Si el cambio deja mentiroso un doc existente (`AGENTS.md`, `.cursor/docs/`, onboarding), actualízalo en la misma rama. Si no, no toques docs. Docs de agente → criterio de `writing-for-agents`.

**Done when:** ningún doc existente contradice el cambio, o no había doc que tocar.

## 10. PR (`creating-pr`)

Antes del push, en local: `yarn lint`, `yarn typecheck`, `yarn lint:arch`, `yarn test`, `yarn build`. No saltar hooks.

PR lista (no draft). Título `type: description`. Cuerpo con `Closes` del padre y de cada hijo. No pedir reviewer `@USER` de CODEOWNERS.

**Done when:** la PR está abierta y su URL anotada.

## 11. CI y feedback (`iterate-pr`)

Sigue `iterate-pr` hasta CI verde y feedback high/medium resuelto. Hereda sus salidas (dos fallos iguales → pregunta; gates humanos → para). No merges. No esperes approve.

**Done when:** checks accionables en verde y feedback high/medium limpio, o el usuario debe intervenir según `iterate-pr`.

## 12. Registro local

Escribe siempre el JSON de la ejecución según [run-record.md](run-record.md) en `.deliver/runs/`.

**Done when:** el fichero existe y cumple el contrato.

## 13. Medición (optativa)

Pregunta: ¿registrar la medición en AI Hub?

Si sí: sigue `registrar-medicion-ia` en automático. En `trace_metadata` mete la traza del analizador más los hechos de entrega **sin citas de código** (CI, criterios cumplidos/total, URLs, cobertura). El texto de los huecos de spec se queda solo en el JSON local. Si el MCP falla, conserva el JSON local; la entrega no se deshace.

**Done when:** el usuario dijo no, o la ficha quedó creada / el fallo del MCP quedó informado.

## Entrega

La tarea está entregada cuando la PR está abierta, el CI accionable está verde y el feedback high/medium está resuelto. Sin merge. Sin esperar approve.
