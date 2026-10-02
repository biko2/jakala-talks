# Desarrollo del analizador

El analizador usa TypeScript estricto sobre Bun. Bun es una dependencia de ejecución deliberada, no se generan binarios ni se mantiene una implementación alternativa en Python.

## Arquitectura

La arquitectura hexagonal tiene tres interfaces públicas:

- `analyzeTraces`: normaliza sesiones mediante un adaptador por arnés.
- `inspectUserMessages`: devuelve texto local para delimitar tareas y nunca alimenta la carga remota.
- `buildTaskTrace`: transforma informes normalizados en metadatos seguros para AI Hub.

La CLI es un adaptador fino sobre esas interfaces. Los parsers de Codex, Claude Code, Cursor y OpenCode viven en `src/adapters/`. El modelo normalizado y sus invariantes viven en `src/domain/`. El acceso a JSONL y SQLite queda fuera del dominio.

No añadas un port para cada función o dependencia. Hay un seam de arnés porque existen cuatro adaptadores reales. El filesystem se prueba con directorios temporales y SQLite con bases efímeras reales.

## Tests

Ejecuta desde `scripts/`:

```bash
bun install
bun run check
```

`check` ejecuta primero el typecheck y después la suite de Bun. Los tests cruzan las interfaces públicas y usan trazas mínimas representativas. Cada corrección de un formato debe comenzar con un fixture que falle por el comportamiento observable, no por la estructura interna del parser.

Los invariantes de privacidad forman parte del seam de `buildTaskTrace`: su resultado se construye mediante una lista permitida de campos. Nunca copies objetos completos procedentes de una traza.

## Cambiar un formato

1. Captura el fragmento estructural mínimo que demuestra el formato, sin contenido privado.
2. Añade un test rojo al adaptador correspondiente.
3. Implementa el cambio sin modificar el esquema común salvo que el dato no tenga representación válida.
4. Ejecuta `bun run check` y una prueba sobre una traza local real.
5. Actualiza `schema.md` si cambia cobertura, semántica o una limitación conocida.
