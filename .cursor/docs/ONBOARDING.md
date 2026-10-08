# Onboarding — Jakala Talks

App Next.js 15 (App Router) + Supabase + arquitectura hexagonal para proponer y votar charlas. Login con Google vía Supabase Auth.

## Stack

- **Next.js 15** (App Router) + **React 19** + **TypeScript**
- **Supabase**: base de datos (Postgres) y autenticación OAuth
- **Styled Components** para estilos
- **Jest + Testing Library** para tests
- **Arquitectura hexagonal**: `src/domain`, `src/application`, `src/infrastructure` (ver reglas en `.cursor/rules/arquitectura/`)
- Comandos de Node siempre con **yarn** (ver `.cursor/rules/general/yarn.mdc`)

## Arranque rápido (cero fricción)

`yarn dev` arranca MSW por defecto: usuario de fixture, charlas de ejemplo y votos en memoria. Sin proyecto Supabase. `yarn dev:mock` es el mismo comando.

```bash
yarn install
yarn dev   # http://localhost:3000
```

## Desarrollo local con Supabase real

1. Copia `.env.example` a `.env.local` y rellena las variables (ver [VARIABLES_ENTORNO.md](./VARIABLES_ENTORNO.md)).
2. Pon `NEXT_PUBLIC_USE_SUPABASE=true`.
3. Usa URL y keys de un proyecto **de desarrollo** (o Supabase local). **No** pegues `NEXT_PUBLIC_SUPABASE_URL` / keys de **producción** en `.env.local` para pruebas: contaminas datos reales.
4. `yarn dev`

## Tests

```bash
yarn test          # todos
yarn test:watch    # modo watch
```

Toda funcionalidad nueva o modificada requiere tests (unitarios + integración). Ver `.cursor/rules/testing/`.

---

## Autenticación con Google (cómo funciona)

No se usa NextAuth: es **Supabase OAuth** directo. Flujo:

1. El cliente llama `supabase.auth.signInWithOAuth` con `redirectTo` apuntando a `/auth/callback` de la app (ver `components/layout/Header/Header.tsx`):

```ts
await supabase.auth.signInWithOAuth({
  provider: 'google',
  options: { redirectTo: `${getAppUrl()}/auth/callback` },
})
```

2. Supabase redirige a Google. **El `redirect_uri` que recibe Google NO es el dominio de la app**, sino el callback del proyecto Supabase:
   `https://<project-ref>.supabase.co/auth/v1/callback`
3. Google autentica y vuelve a Supabase, que redirige a `redirectTo` (`/auth/callback`).
4. `app/auth/callback/route.ts` intercambia el código por sesión con `exchangeCodeForSession`.

`getAppUrl()` (en `lib/supabase/config/env.ts`) en cliente usa `NEXT_PUBLIC_APP_URL || NEXTAUTH_URL || window.location.origin`. Ojo: `NEXTAUTH_URL` no es `NEXT_PUBLIC_*`, así que en el navegador siempre es `undefined`.

### Configuración OBLIGATORIA en paneles externos

Estos cambios son de panel (no de código) y **no requieren deploy**:

**Supabase Dashboard → Authentication → URL Configuration**
- **Site URL**: el dominio de cada entorno (ej. `https://charlas-open-space.jakala.es`). Es el fallback al que Supabase redirige.
- **Redirect URLs** (allow-list): añade todas las URLs de callback usadas:
  - `https://charlas-open-space.jakala.es/auth/callback`
  - `http://localhost:3000/auth/callback`

**Supabase Dashboard → Authentication → Providers → Google**
- Habilitar Google e introducir `Client ID` y `Client Secret` de Google Cloud.

**Google Cloud Console → APIs & Services → Credentials → OAuth Client ID**
- **Authorized redirect URIs** debe incluir EXACTO el callback de Supabase:
  `https://<project-ref>.supabase.co/auth/v1/callback`
- **OAuth consent screen**: si está en modo *Testing*, solo entran los usuarios de prueba. Publícala o añade testers.

### Síntomas y diagnóstico

| Síntoma | Causa | Fix |
|---------|-------|-----|
| `Error 400: redirect_uri_mismatch` en Google | El callback de Supabase no está en *Authorized redirect URIs* | Añadir `https://<project-ref>.supabase.co/auth/v1/callback` en Google Cloud |
| "Acceso bloqueado / app no verificada" | Consent screen en *Testing* | Publicar app o añadir testers |
| Tras Google aterrizas en `http://localhost:3000/?code=...` (en `/`, no en `/auth/callback`) | El `redirectTo` no está en *Redirect URLs* → Supabase cae a *Site URL* (mal configurada a localhost) | Corregir **Site URL** y añadir el `/auth/callback` de producción a **Redirect URLs** |

Para depurar el flujo en vivo se puede usar el MCP de Chrome DevTools: navegar al sitio, pulsar "Continuar con Google" e inspeccionar la cadena de red (parámetros `redirect_to` y `redirect_uri`).

---

## Deploy

- Hosting típico: **Vercel**. Configura **ambas** versiones de las variables Supabase (`NEXT_PUBLIC_*` y sin prefijo). Ver [VARIABLES_ENTORNO.md](./VARIABLES_ENTORNO.md).
- Solo necesitas redeploy cuando cambias variables `NEXT_PUBLIC_*` (se inyectan en build). Cambios en paneles de Supabase/Google son inmediatos, sin deploy.

## MCP (Supabase) para la IA

`.cursor/mcp.json` (copiar desde `.cursor/mcp.example.json`) configura el MCP de Supabase:

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase", "--project-ref=<project-ref>"],
      "env": { "SUPABASE_ACCESS_TOKEN": "<access-token>" }
    }
  }
}
```

`<access-token>` se genera en Supabase → Account → Access Tokens. `<project-ref>` es el subdominio de la URL del proyecto.

## A quién preguntar

Para credenciales actuales del proyecto en producción, contacta con **Diego Razquin**.
