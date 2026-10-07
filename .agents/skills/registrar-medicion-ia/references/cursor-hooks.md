# Tokens de Cursor mediante hooks

El JSONL de conversación no contiene uso de tokens. La captura requiere un hook previo al trabajo. Para preparar Cursor cuando el usuario pida habilitar mediciones, instala el hook desde la copia estable de esta skill:

```bash
bun scripts/install-cursor-hook.ts
```

El instalador añade `stop` a `~/.cursor/hooks.json`, conserva los demás hooks y crea una copia del archivo previo si existe. Usa rutas absolutas de Bun y del colector. Si mueves la skill o Bun, actualiza esa entrada. El hook escribe solo en `~/.cursor/ai-hub-usage/`; no envía fichas. No actives captura persistente por el mero hecho de registrar una tarea histórica.

## Contrato y cobertura

El equipo de Cursor confirma los campos opcionales `input_tokens`, `output_tokens`, `cache_read_tokens` y `cache_write_tokens`, además de `conversation_id`, `generation_id` y modelo. `input_tokens` incluye ambas cachés. Son acumulados de **todas las llamadas del turno del padre**. No incluyen subagentes ni desglose de razonamiento.

Se usa solo `stop`. Un archivo por conversación y generación evita sumar entregas repetidas. `afterAgentResponse` informa los mismos números y no debe sumarse. `sessionEnd` no sustituye al hook de tokens.

`analyze --harness cursor` une estos archivos a la transcripción por ID de conversación. `build-task-trace` conserva `cursorUsage`, con los turnos, el modelo informado, campos desconocidos y alcance `whole-session` / `parent-only`. También copia `sessionSettings` y `contextUsage` cuando existen: effort/maxMode/fast y tamaño de contexto salen de `composerData` en `state.vscdb`; el pico/último input sale de los turnos del hook. Si el `stop` trae `effort` / `max_mode` / `fast`, el colector los persiste en allowlist. No hay una correspondencia garantizada entre `generation_id` y el índice de mensaje del JSONL: no atribuyas todos los tokens de una conversación a un fragmento. Los mensajes de usuario son una referencia de cobertura, no una prueba de que se capturaron todas las llamadas.

Los totales normalizados suman solo los turnos capturados; no representan la sesión completa si el hook se activó tarde. Un contador ausente permanece desconocido. La ficha muestra esta limitación y el detalle por turno. Conserva `cursorUsage` junto con el resto de `trace_metadata` al enviar por MCP.

No conviertas cada turno en una llamada de `apiCost`: aplicar un umbral de contexto largo sobre la suma de varias llamadas produciría un precio incorrecto. Tampoco asumas que el modelo final del turno demuestra el de cada llamada. El coste queda pendiente. Para atribución y coste completos, investigar eventos por llamada de la Admin API, si el usuario dispone de acceso. No inferir precio a partir de la cuota.

## Verificación real

Tras instalar, completa un turno en el IDE y ejecuta el analizador. Comprueba que aparecen su conversación y generación, el modelo y los contadores. Hasta observar ese evento, informa «instalado, pendiente de comprobar con un turno real». Un fixture verifica el parser, no demuestra que esa versión de Cursor emita los campos. Si faltan, comprueba la carga del hook en Cursor; no los rellenes con cero ni prometas recuperar el pasado.

Fuente: [confirmación del equipo de Cursor y aclaración sobre subagentes](https://forum.cursor.com/t/how-to-obtain-token-usage-per-request/168317), consultada el 25-09-2026. Los campos aún no están enumerados en la [referencia de hooks](https://cursor.com/docs/hooks).
