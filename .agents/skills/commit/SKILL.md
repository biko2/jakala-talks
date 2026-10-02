---
name: commit
description: Crear commit semántico
tags: [nuestras, git, workflow]
disable-model-invocation: true
---

# Commit Semántico

## Regla Fundamental

**NUNCA hacer commits automáticamente.** Solo ejecutar este skill cuando el usuario lo invoque explícitamente con `/commit`.

## Proceso

### 1. Analizar cambios

```bash
git status
git diff --staged
git diff
```

Si no hay cambios staged, preguntar al usuario qué archivos quiere incluir.

### 2. Generar mensaje de commit

Formato: `<tipo>(<ámbito>): <descripción>`

**Tipos permitidos:**
- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `refactor`: Cambio de código que no añade funcionalidad ni corrige bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, comas, etc.)
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento (deps, config, etc.)

**Ámbito:** Componente o módulo afectado (opcional pero recomendado).

**Descripción:** Imperativo, minúsculas, sin punto final. Máximo 72 caracteres.

### 3. Mostrar al usuario

Antes de ejecutar, mostrar:
- Archivos que se van a incluir
- Mensaje de commit propuesto

Pedir confirmación o ajustes.

### 4. Ejecutar commit

Solo después de confirmación del usuario:

```bash
git add <archivos>
git commit -m "<mensaje>"
```

## Ejemplos

```
feat(auth): añadir validación de token expirado
fix(cart): corregir cálculo de descuentos
refactor(api): extraer lógica de parsing a utils
docs(readme): actualizar instrucciones de instalación
```

## Personalización

Este skill es un punto de partida. Adaptad los tipos, formato y convenciones a vuestro equipo.
