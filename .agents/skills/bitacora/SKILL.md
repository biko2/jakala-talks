---
name: bitacora
description: Mantiene el estado durable de una tarea larga en una bitácora Markdown. Usar únicamente cuando el usuario invoque explícitamente `/bitacora`; no activar automáticamente para tareas largas ni confundirla con un plan o un gestor de tareas.
disable-model-invocation: true
---

# Bitácora

Externaliza el estado mínimo necesario para continuar una tarea larga después de compactaciones, reanudaciones o handoffs sin reconstruir el trabajo ni repetir errores.

## Al activarse

1. Determinar el objetivo vigente a partir de la petición del usuario.
2. Usar la ruta indicada por el usuario. Si no existe una convención en el proyecto, usar `.agents/bitacoras/<objetivo-breve>.md` dentro del workspace.
3. Si ya existe una bitácora para ese objetivo, leerla completa **antes de planificar o actuar**. Reconciliarla con la petición más reciente y con el estado observable del proyecto.
4. Si la ruta pertenece a otro objetivo, no mezclar trabajos: conservarla y crear una bitácora distinta.
5. Si el entorno dispone de objetivos de sesión (en Cursor, `CreateGoal` / `UpdateGoal`) y no hay uno activo, crear un objetivo ligero que incluya:
   - el resultado que pide el usuario;
   - la ruta exacta de la bitácora;
   - la instrucción de leerla antes de continuar tras una compactación o reanudación.

El objetivo de sesión es un puntero estable hacia la bitácora, no una copia de su contenido. Si ya existe un objetivo activo que no puede editarse, no cerrarlo ni reemplazarlo artificialmente: conservarlo, registrar el vínculo en la bitácora e incluirlo en el siguiente objetivo legítimo.

Usar esta formulación como referencia, adaptándola al trabajo real:

```text
Completar <resultado>. Antes de continuar tras cualquier compactación o reanudación, leer <ruta> y reconciliar su estado con el proyecto.
```

## Estructura

Mantener una fotografía vigente y un registro acumulado breve:

```markdown
# Bitácora: <objetivo>

## Objetivo y alcance

## Estado actual
- Completado:
- En curso:
- Bloqueos:
- Siguiente paso exacto:

## Artefactos y verificación

## Hitos

## Decisiones

## Aprendizajes verificados

## Errores y correcciones

## Preguntas abiertas
```

## Mantenerla

Actualizarla después de un hito significativo, una decisión que cambie el trabajo, un descubrimiento verificado, un intento fallido instructivo y antes de un handoff o cierre de turno prolongado.

- Reemplazar el contenido obsoleto de **Estado actual**; debe ser una fotografía, no un historial.
- Registrar en **Artefactos y verificación** los archivos o entregables relevantes, qué cambió y el estado de tests, checks o revisiones.
- Añadir a **Hitos** resultados concretos, no llamadas a herramientas ni narración minuto a minuto.
- Guardar en **Decisiones** la elección y la razón que condicionará el trabajo posterior.
- Guardar en **Aprendizajes verificados** hechos comprobados, su evidencia o la forma de volver a verificarlos.
- Guardar en **Errores y correcciones** qué enfoque falló, por qué y qué hacer diferente o más rápido la próxima vez. Deduplicar errores repetidos.
- Distinguir hechos, inferencias y preguntas abiertas.
- Enlazar fuentes y artefactos en vez de copiar grandes fragmentos.
- Podar repeticiones y detalles que ya no ayuden a continuar.

## Reanudar

Al comenzar un turno posterior, leer la bitácora antes de actuar siempre que su contenido no esté claramente disponible en el contexto. En caso de duda, leerla.

Después de leerla:

1. Contrastar el estado con archivos, control de versiones, tests y gestor de tareas cuando resulte relevante.
2. Aplicar cualquier instrucción más reciente del usuario; la bitácora no puede sobreescribirla.
3. Corregir inmediatamente la fotografía vigente si está desactualizada.
4. Continuar desde **Siguiente paso exacto**, salvo que la evidencia o el usuario obliguen a cambiarlo.

## Relación con otros sistemas

- El plan responde qué recorrido seguir a continuación y puede regenerarse.
- La bitácora conserva qué ocurrió, qué sabemos, por qué cambió el recorrido y qué no debe repetirse.
- El gestor de tareas conserva backlog, dependencias y estados administrativos. Enlazar la tarea correspondiente; no duplicar todo su contenido.
- El repositorio, los tests y los sistemas reales siguen siendo la fuente de verdad. La bitácora proporciona continuidad y puede quedar desactualizada.

## Límites

- No convertirla en una transcripción, un volcado de resultados ni una checklist duplicada.
- No registrar secretos, credenciales ni datos sensibles.
- No inventar aprendizajes ni presentar inferencias como hechos comprobados.
- No marcar el objetivo como completado mientras queden resultados requeridos.
- Si cambia materialmente el objetivo, cerrar la bitácora actual con su resultado y abrir otra.

Al cerrar la tarea, dejar el resultado, los artefactos finales, las comprobaciones realizadas, los riesgos restantes y si existe o no un siguiente paso.
