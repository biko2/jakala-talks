# Issue tracker

Tracker: **GitHub Issues** en este repositorio, vía `gh`.

## Triaje

Label: `ready-for-agent`.

Créala si falta:

```bash
gh label create ready-for-agent --description "Listo para que un agente lo tome" --color 0E8A16
```

Aplícala a cada issue que `to-spec` o `to-tickets` publique.

## Spec y tickets

| Rol | Forma |
|---|---|
| Spec | Un issue **padre**. Cuerpo = plantilla de `to-spec`. |
| Ticket | Un issue **hijo** por rodaja. Cuerpo = plantilla de `to-tickets`. |

El padre no se cierra ni se edita al publicar tickets. La PR de entrega lleva `Closes` del padre y de cada hijo; GitHub cierra al mergear.

## Bloqueo entre tickets

Preferir el grafo nativo de GitHub (`blocked by` / sub-issue) cuando `gh` lo permita.

Si no:

```markdown
## Blocked by

- #<n> — <título>
```

o `None (can start immediately)`.

Publicar hijos en orden de dependencias (bloqueadores primero) para que los números existan al referenciarlos.

## Leer un issue (code-review, deliver)

```bash
gh issue view <n> --json number,title,body,labels,url,state
```

Referencias en commits o en el cuerpo de la PR: `#123`, `Closes #123`.
