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
| Registro de la corrida | `.deliver/runs/*.json` (gitignored) | Hechos: modelo, tools, tokens, CI, criterios, URLs. Sin nota de eficiencia |
| Ficha AI Hub | Solo si dices sí al final | Traza + hechos sin citas de código. Huecos de spec se quedan en local |

Entrega = PR abierta, CI accionable verde, feedback high/medium resuelto. Tú merges.

## Qué no saca

Sala de control (comparar modelos). Docs nuevos si nada existente quedó mentiroso. Issues cerrados antes del merge.
