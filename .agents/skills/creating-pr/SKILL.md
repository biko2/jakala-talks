---
name: creating-pr
description: Create a clean, review-ready pull request with a good title, structured description, linked issues, and appropriate reviewers.
user-invocable: true
---

# Creating a PR

Package work into a pull request that's easy to review and merge.

## Workflow

### 1. Prepare the Branch

Before creating the PR:

```bash
# Ensure branch is up to date with base
git fetch origin
git rebase origin/main  # or merge, depending on project convention

# Check what will be in the PR
git log origin/main..HEAD --oneline
git diff origin/main --stat
```

Squash fixup commits if the project prefers clean history. Keep logical commits separate if the project prefers granular history.

### 2. Write the Title

Format: `<type>: <short description>`

| Type | When |
|------|------|
| `feat` | New feature |
| `fix` | Bug fix |
| `refactor` | Code change that neither fixes a bug nor adds a feature |
| `docs` | Documentation only |
| `test` | Adding or fixing tests |
| `chore` | Build, CI, deps, or tooling |
| `perf` | Performance improvement |

Examples:
- `feat: add dark mode toggle to settings page`
- `fix: prevent duplicate form submissions on checkout`
- `refactor: extract auth middleware into shared module`

### 3. Write the Description

Usa esta estructura, en castellano:

```markdown
## Resumen

1-3 frases sobre qué hace este PR y por qué.

Closes #123

## Cambios

- Añadido el componente `ThemeToggle` con opciones sistema/claro/oscuro
- `Layout` lee el tema desde el contexto
- Persistencia del tema en localStorage

## Plan de pruebas

- [ ] Cambiar entre temas claro/oscuro/sistema
- [ ] Recargar la página — el tema se mantiene
- [ ] No hay flash de contenido sin estilo al cargar
```

`Closes` se queda en inglés: GitHub solo cierra issues con esa keyword.

### 4. Self-Review

Before requesting review:
- Read every line of the diff yourself
- Remove debug code (`console.log`, `TODO`, commented-out code)
- Verify tests pass: `yarn test`
- Verify types: `yarn typecheck`
- Verify lint: `yarn lint`
- Check for files that shouldn't be committed (`.env`, lockfile conflicts)

### 5. Create the PR

```bash
git push -u origin HEAD
gh pr create --title "<title>" --body "$(cat <<'EOF'
## Resumen
...

## Cambios
...

## Plan de pruebas
...
EOF
)"
```

### 6. Request Review

- Tag the appropriate reviewers (code owners, domain experts)
- If the PR is large (>400 lines), add a comment explaining the best order to review files
- If the PR depends on another PR, note it in the description
- Label the PR appropriately (feature, bug, breaking change, etc.)

## Tips

- Small PRs get reviewed faster — aim for <300 lines changed
- If a PR is too big, split it into stacked PRs
- Screenshots/recordings for UI changes make review much faster
- Draft PRs are useful for early feedback before the work is complete
