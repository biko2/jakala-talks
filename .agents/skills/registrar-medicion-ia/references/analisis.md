# Análisis local de trazas

Ejecuta desde la raíz de esta skill:

```bash
bun scripts/trace-analyzer.ts analyze --harness all --project /ruta/al/proyecto --limit 4 --pretty
```

Adapta proyecto y límite a la petición. Usa un arnés concreto cuando no se pida compararlos: `codex`, `claude-code`, `cursor` u `opencode`.

Interpreta el JSON de los scripts. Presenta skills atribuidas, leídas y editadas; herramientas y categorías; tokens; tests/checks, Git, búsquedas web y archivos. Comprueba `coverage` y `diagnostics` antes de comparar. Consulta [schema.md](schema.md) para interpretar el formato.

Una lectura efectiva de `skills/<nombre>/SKILL.md` cuenta como lectura; una edición cuenta como edición. Una ruta en un catálogo, búsqueda o fixture no demuestra que se haya cargado la skill. `attributionSkill` en Claude Code aporta evidencia directa de atribución. Las referencias repetidas no equivalen a ejecuciones completas.

Para delimitar tareas o identificar invocaciones manuales, usa `inspect-user-messages` con los mismos filtros y examina los mensajes del usuario. Esa salida es local y puede contener prompts; nunca la adjuntes a fichas. Para el resto del análisis, interpreta metadatos sin leer manualmente conversaciones completas.

El resultado indica filtros, fuentes y limitaciones. Una comparación o consulta de métricas termina con el informe local, sin escribir en AI Hub.
