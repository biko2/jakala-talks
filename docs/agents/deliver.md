# Deliver — cómo lanzarlo y qué saca

How-to para humanos. El agente sigue [`.agents/skills/deliver/SKILL.md`](../../.agents/skills/deliver/SKILL.md). Tracker: [issue-tracker.md](issue-tracker.md). Registro: skill [`bitacora`](../../.agents/skills/bitacora/SKILL.md).

## Cómo lanzarlo

1. Chat de Cursor en este repo, con `gh` autenticado (issues + PRs).
2. Escribe `/deliver` (o pide la skill `deliver`). No se dispara sola.
3. Elige modo:
   - **3 paradas:** confirmas grill, spec y tickets; después el agente sigue hasta la PR.
   - **Autónomo:** mismo grill; spec y tickets se publican sin esas dos paradas.
4. Primera vez en la máquina: pregunta si instalar el hook de tokens de Cursor (lo usa la medición de AI Hub). La respuesta queda en `.deliver/hook-asked.json` y no se repite.

Necesitas: `gh`, Yarn, y (si aceptas el hook) Bun.

**Reanudar.** Si el chat se compacta o abres uno nuevo, vuelve a lanzar `/deliver`. Detecta la bitácora abierta, pregunta si es esa tarea y sigue desde su "siguiente paso exacto".

## Qué saca

| Artefacto | Dónde | Notas |
|---|---|---|
| Issue padre (spec) | GitHub Issues, label `ready-for-agent` | Plantilla de `to-spec` |
| Issues hijos (tickets) | GitHub Issues, mismos label y bloqueos | Uno por rodaja |
| Rama | `feat/<numero-padre>-<slug>` desde `main` | Una rama por tarea |
| Commits | Esa rama | Un ticket verde → commit(s). Formato `tipo(ámbito): descripción` |
| PR lista | GitHub, no draft | `Closes` del padre y de cada hijo. Sin merge. Sin pedir approve |
| Bitácora | `.agents/bitacoras/deliver-<slug>.md` (gitignored) | Único registro: estado actual, artefactos y gates, hitos, decisiones, aprendizajes, errores. Se actualiza al cerrar cada paso; los subagentes solo la leen |
| Ficha AI Hub | Solo si dices sí al final | Traza del analizador + hechos sin citas de código. El texto de la bitácora no se sube |

Entrega = PR abierta, CI accionable verde, feedback high/medium resuelto. Tú merges.

## Sala local (harness lab)

```bash
yarn deliver:ui
```

Abre http://127.0.0.1:4177. Lee `.agents/bitacoras/` (solo esta máquina): las de `/deliver` y las sueltas de `/bitacora`. Filtros por estado (abierta/cerrada) y origen. Una bitácora está cerrada cuando su "Siguiente paso exacto" es "ninguno". El detalle muestra primero el estado actual (siguiente paso, bloqueos) y después el resto de secciones, con las URLs enlazadas. Al editar el `.md`, la sala se refresca sola (SSE). Es de solo lectura.

Código: `tools/deliver-ui/`.

## Qué no saca

Coste en USD, tiempos ni grafo de agentes en local: la bitácora es narrativa, no telemetría. Para tokens y coste, la ficha de AI Hub. Tampoco saca fórmula de eficiencia ni ranking de modelos, docs nuevos si nada existente quedó mentiroso, ni issues cerrados antes del merge.
