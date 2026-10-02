# Esquema normalizado de trazas

Los cuatro adaptadores producen JSON con `schemaVersion: "1.0"`. `trace-analyzer.ts analyze --harness all` agrupa un informe por arnés bajo `reports`.

## Fuentes

| Arnés | Fuente primaria | Datos especialmente fiables |
|---|---|---|
| Codex | `~/.codex/sessions/**/*.jsonl` y `~/.codex/archived_sessions/*.jsonl` | Tools, resultados, tokens, turnos y contexto del proyecto |
| Claude Code | `~/.claude/projects/**/*.jsonl` | Tools, resultados, tokens y `attributionSkill` |
| Claude Code, fallback | `sessions-index.json` | Identidad, proyecto y fechas; no contiene el detalle de actividad |
| Cursor | `~/.cursor/projects/*/agent-transcripts/*/*.jsonl` | Mensajes y `tool_use` por sesión |
| Cursor, hook `stop` | `~/.cursor/ai-hub-usage/*/*.json` | Tokens por turno del padre; requiere captura previa, sin atribución a intervalos ni coste por llamada |
| Cursor, enriquecimiento | `~/Library/Application Support/Cursor/User/globalStorage/state.vscdb` | Modelo, fechas y contadores de cambios cuando siguen disponibles |
| OpenCode | `~/.local/share/opencode/opencode.db` | Tools, resultados, costes, tokens, mensajes y proyecto |

Los parsers no leen el contenido conversacional para generar sus conclusiones. Solo recorren campos estructurados de metadatos y llamadas a herramientas.

## Sesión

Cada elemento de `sessions` usa estas claves:

- `harness`, `sessionId`, `startedAt`, `updatedAt`, `projectPath`, `sourcePath`.
- `models`, `turns` y contadores de `messages`.
- `skills.<nombre>.reads`, `edits` y `attributedMessages`.
- `tools.<nombre>.calls`, `results` y `errors`.
- `toolCategories`: categorías estables para comparar nombres distintos entre arneses.
- `tokens`: `input`, `cachedInput`, `cacheWriteInput`, `output`, `reasoningOutput` y `total`.
- `activity`: checks, Git, MCPs, páginas web y archivos leídos o modificados.
- `events`: llamadas individuales con índice de mensaje, resultado, archivos, skills, MCP y URLs, sin argumentos ni outputs.
- `coverage`: indica si cada familia de datos está realmente disponible.
- `diagnostics`: pérdidas de datos, líneas inválidas o limitaciones del formato.

Un `null` significa **no disponible**, no cero.

## Categorías de herramientas

Los nombres nativos se conservan en `tools`. Además se agrupan como:

- `shell`
- `file_read`
- `file_edit`
- `search`
- `web`
- `browser`
- `subagent`
- `planning`
- `mcp`
- `other`

## Fragmentos de tarea

`trace-analyzer.ts inspect-user-messages` es una herramienta local para seleccionar límites. Su salida contiene texto del usuario y lleva `localOnly: true`; nunca se añade a una ficha.

`trace-analyzer.ts build-task-trace` recibe intervalos inclusivos `harness,sessionId,desde,hasta` y produce `trace_metadata` sin contenido conversacional. Incluye:

- `sessionSlices` con IDs e índices de mensajes;
- contadores de tools, categorías, skills y MCPs;
- archivos con acción `read`, `create`, `edit` o `delete` y su tipo;
- páginas visitadas con la URL completa;
- tokens del intervalo marcados como `message-range` cuando la traza conserva granularidad suficiente; en caso contrario se conservan como `whole-session`.

Las queries de búsqueda, los argumentos, los outputs y el contenido de archivos o páginas no forman parte de este esquema.

La normalización sigue la idea de OpenTelemetry de separar la invocación del agente y la operación `execute_tool`, pero este JSON no pretende ser OTLP ni implementar toda la convención GenAI.

## Limitaciones conocidas

- Codex y Cursor no registran una atribución de skill tan directa como `attributionSkill`; sus usos se infieren mediante rutas de `SKILL.md` en tool calls.
- Las transcripciones JSONL de Cursor conservan llamadas `tool_use`, pero no tokens. El hook opcional aporta `cursorUsage`: turnos del padre observados en la conversación completa. Consulta [cursor-hooks.md](cursor-hooks.md) para instalación y límites.
- Claude Code puede conservar entradas en `sessions-index.json` después de borrar el JSONL. Esas sesiones aparecen con cobertura parcial.
- Codex permite calcular intervalos mediante snapshots acumulados y Claude Code mediante uso por mensaje. Cursor y OpenCode pueden quedar en `whole-session`. Los contadores no son facturas ni cuotas oficiales y su semántica de caché puede variar.
- La ruta sanitizada de un proyecto Cursor puede ser ambigua si dos rutas distintas producen el mismo nombre con guiones.

## Referencias de diseño

- OpenTelemetry GenAI semantic conventions: https://github.com/open-telemetry/semantic-conventions-genai
- Claude Code session storage: https://code.claude.com/docs/en/how-claude-code-works
- ccusage, analizador local de Claude Code: https://github.com/ryoppippi/ccusage
- cursaves, documentación del almacenamiento local de Cursor: https://github.com/Callum-Ward/cursaves

## Coste equivalente API

`build-task-trace` añade `apiCost` de forma compatible con trazas 1.0 anteriores. No requiere migrar las fichas antiguas ni reinterpretar su gasto declarado.

El adaptador Codex conserva `tokenCalls` por modelo y mensaje. Deduplica snapshots acumulados repetidos y exige conciliar el incremento con `last_token_usage`; los huecos o contadores heredados dejan el coste parcial. Los intervalos de una misma tarea no pueden solaparse.

`apiCost` contiene el total en USD (desconocido si la cobertura es parcial), subtotal conocido, llamadas con precio, fragmentos sin detalle, fuentes, fecha de consulta de tarifas y filas con tokens, tarifas e importe. La entrada sin caché excluye lectura y escritura de caché. El razonamiento ya está incluido en salida. Los umbrales de contexto largo se aplican a cada llamada, no al total de la tarea.

La referencia es API Standard, sin Fast, recargos regionales, herramientas facturables o descuentos Batch/Flex. Las escrituras de caché ausentes en Codex se consideran cero y se declara esa suposición. No mide facturación ni consumo de límites de una suscripción. Solo cubre las sesiones locales seleccionadas, no otras máquinas o subagentes no seleccionados.

El catálogo inicial cubre GPT-6 Astra, Sol y Luna, contrastados con las fichas oficiales el 25 de septiembre de 2026. Otros modelos o arneses quedan sin precio; nunca reutilizar la tarifa de un modelo parecido. Para ampliar precios, verificar la fuente oficial, actualizar `scripts/src/domain/api-cost.ts` y ejecutar los tests de cálculo. Los importes ya guardados conservan su snapshot de tarifas.
