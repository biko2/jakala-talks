---
name: registrar-medicion-ia
description: Registra tareas en AI Hub con trazas de Codex, Claude Code, Cursor u OpenCode. Envía automáticamente por defecto, propone dimensiones si se pide revisión y permite corregir fichas existentes o analizar métricas locales.
---

# Registrar medición de IA

Una ficha representa una tarea. Esta skill contiene el analizador TypeScript y requiere Bun. Ejecuta sus comandos desde la carpeta que contiene este SKILL.md. Si faltan dependencias, ejecuta `bun install --frozen-lockfile` en `scripts/`. Si falta Bun, informa del requisito.

## Elegir el flujo

- **Invocación normal o registro rápido:** captura, infiere los campos y sube sin preguntas. Usa `capture_mode: automatic`.
- **Revisión, medición completa o «con preguntas»:** captura primero y después propone las dimensiones y reúne las preguntas necesarias en un bloque. Usa `capture_mode: assisted` cuando incorpores las respuestas.
- **Corrección con ID:** lee la ficha con `get_ai_measurement`, conserva los campos ajenos a la corrección y usa `update_ai_measurement` sobre ese ID. Mantén intervalos y trazas salvo que se pida recalcularlos.
- **Solo análisis o comparación:** sigue [analisis.md](references/analisis.md) y devuelve las métricas localmente. Este flujo no envía una ficha.

Para Cursor, consulta [cursor-hooks.md](references/cursor-hooks.md) si se piden tokens, coste o habilitar la captura. El JSONL por sí solo no los contiene; conserva `trace_metadata.cursorUsage` y sus límites de cobertura.

## Capturar y delimitar

La invocación de registro marca el cierre. Anota su hora y el arnés actual y genera el informe antes de investigar o preguntar:

```bash
bun scripts/trace-analyzer.ts analyze --harness codex --project /ruta/al/proyecto --limit 30 --pretty
```

Sustituye `codex` por el arnés actual y conserva el JSON en un archivo temporal. Usa la ruta real del trabajo, que puede diferir del directorio donde nació la sesión.

Inspecciona los mensajes de usuario con `bun scripts/trace-analyzer.ts inspect-user-messages` y los mismos filtros. Su salida es solo local. Selecciona sesiones e intervalos por intención, archivos, Git y cercanía temporal: los scripts proporcionan evidencia, el agente decide qué pertenece a la tarea. Cada ficha incluye un único arnés.

Termina el intervalo actual en el índice del mensaje de invocación menos uno para excluir la medición. Si trabajo e invocación comparten mensaje, usa la captura previa y explica la limitación. En sesiones compartidas entre tareas, selecciona solo el fragmento correspondiente. En automático, resuelve dudas con el intervalo conservador mejor respaldado; en revisión, pregunta cuando sea necesario.

Genera los metadatos a partir del informe guardado y los intervalos inclusivos:

```bash
bun scripts/trace-analyzer.ts build-task-trace /tmp/informe.json --slice 'codex,session-id,0,5' --pretty
```

Repite `--slice` para más fragmentos. Usa `--manual-skill`, `--automatic-skill` y `--completed-skill` solo con evidencia de esos estados. Consulta [schema.md](references/schema.md) para interpretar campos y cobertura. Ausencia de datos significa desconocido, no cero.

## Rellenar y enviar

Infiere proyecto, descripción breve de la tarea, fecha local de cierre, arnés y modelo observado. Si el modelo no está en el catálogo del MCP, usa `otro` y `modelo_otro`. Adjunta `trace_metadata` y su `schemaVersion` como `trace_schema_version`.

Conserva `trace_metadata.apiCost`, generado por `build-task-trace`, para mostrar el equivalente API y su cálculo. No lo copies a `gasto_estimado`: ese campo conserva el gasto declarado. Un `totalUsd: null` significa cálculo incompleto; informa el subtotal y la cobertura sin presentarlo como coste total. Las cuotas de suscripción se registran por periodo, sin imputarlas a tareas. Consulta [schema.md](references/schema.md) para tarifas y límites de cobertura.

Usa una fase `Tarea completa` salvo que haya fases claras. Informa tiempo y gasto solo con evidencia: el intervalo de reloj puede incluir pausas y no demuestra tiempo activo. Deja campos opcionales desconocidos en `null` o vacíos.

Para las siete dimensiones consulta [escalas.md](references/escalas.md). En automático asigna valores solo con evidencia suficiente y explica inferencias en los campos `_notas`. Sensación de control y seniority personal pueden quedar desconocidos. Las tool calls no determinan esas valoraciones.

En revisión ofrece valores propuestos con una justificación corta antes de preguntar. Agrupa dudas, tiempos no observables y reflexiones humanas. Utiliza preguntas con opciones si el arnés ofrece esa herramienta; en caso contrario, un bloque en texto. Acepta números o lenguaje natural y conserva los matices en las notas.

Llama a `create_ai_measurement` del MCP de AI Hub para una ficha nueva o a `update_ai_measurement` para la corrección identificada. Ante un envío de resultado incierto, consulta las fichas antes de reintentar para evitar duplicados. Verifica con `get_ai_measurement` y devuelve ID, tarea, arnés, fragmentos y limitaciones relevantes.

Si falta el MCP o su contrato no acepta telemetría, conserva el JSON local e informa del bloqueo concreto. No declares un envío sin confirmación del servidor.

## Privacidad

Se suben IDs e intervalos, rutas completas y acciones sobre archivos, tools, MCPs, skills, modelos, tokens disponibles y URLs visitadas completas. Conserva query parameters y fragmentos sin recortarlos ni normalizarlos.

No subas prompts, respuestas, queries de buscador, contenidos de archivos o páginas ni outputs. La salida de `inspect-user-messages` nunca se adjunta a una ficha.

Para mantener parsers y tests, consulta [development.md](references/development.md).
