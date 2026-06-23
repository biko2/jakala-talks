# Variables de entorno — de dónde sale cada una

Copia `.env.example` a `.env.local` en la raíz y rellena las variables. La carga depende del entorno (ver `lib/supabase/config/env.ts`):

- **Desarrollo**: se usan las `NEXT_PUBLIC_*`.
- **Producción servidor**: se prefieren las versiones sin prefijo; las `NEXT_PUBLIC_*` son fallback.
- **Producción cliente (navegador)**: SIEMPRE las `NEXT_PUBLIC_*` (se inyectan en el bundle en build; cambiarlas requiere redeploy).

## Supabase

### `NEXT_PUBLIC_SUPABASE_URL` y `SUPABASE_URL`
URL del proyecto. Mismo valor en ambas.
- Supabase Dashboard → **Settings → API → Project URL**.
- Formato: `https://<project-ref>.supabase.co`.

### `NEXT_PUBLIC_SUPABASE_ANON_KEY` y `SUPABASE_ANON_KEY`
Clave pública anónima (segura para el cliente; respeta Row Level Security). Mismo valor en ambas.
- Supabase Dashboard → **Settings → API → Project API keys → `anon` `public`**.
- Es un JWT largo (`eyJ...`). Nunca uses aquí la `service_role` key.

> En Vercel, define **las cuatro**: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

## URL de la aplicación

### `NEXTAUTH_URL`
URL base de la app. A pesar del nombre, NO se usa NextAuth; la consume `getAppUrl()` como fallback en servidor/dev.
- Desarrollo: `http://localhost:3000`
- Producción: el dominio real (ej. `https://charlas-open-space.jakala.es`). En cliente no aplica (no es `NEXT_PUBLIC_*`).

### `NEXT_PUBLIC_APP_URL` (opcional)
Si se define, tiene prioridad en cliente para construir el `redirectTo` de OAuth. Si no, se usa `window.location.origin` (correcto en prod). Útil para forzar el dominio.

## OAuth Google (opcional en .env)

Normalmente el `Client ID`/`Secret` de Google se configuran **dentro de Supabase** (Authentication → Providers → Google), no en `.env`. Estas variables solo hacen falta si integras Google directamente en Next.js.

### `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`
- [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services → Credentials → Create OAuth client ID** (tipo *Web application*).
- En *Authorized redirect URIs* añade el callback de Supabase: `https://<project-ref>.supabase.co/auth/v1/callback`.
- Copia el `Client ID` y `Client Secret` generados.

## OAuth Microsoft / Azure (opcional)

### `AZURE_AD_CLIENT_ID`, `AZURE_AD_CLIENT_SECRET`, `AZURE_AD_TENANT_ID`
- [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID → App registrations → New registration**.
- `CLIENT_ID` = Application (client) ID; `TENANT_ID` = Directory (tenant) ID.
- `CLIENT_SECRET`: **Certificates & secrets → New client secret** (copia el *value* al momento, no se vuelve a mostrar).

## Desarrollo

### `NODE_ENV`
`development` en local, `production` en build/deploy. En Vercel se gestiona solo; no suele tocarse a mano.

### `PORT` (opcional)
Puerto del servidor de desarrollo. Por defecto `3000`.

### `NEXT_PUBLIC_USE_MOCK_USER`
`true` activa el modo mock (usuario y datos ficticios, sin Supabase). `yarn dev:mock` lo pone a `true`. En producción debe ser `false`.

## Testing (opcional)

### `TEST_SUPABASE_URL` y `TEST_SUPABASE_ANON_KEY`
Proyecto Supabase separado para tests de integración, para no tocar datos reales. Se obtienen igual que las de producción pero de un proyecto/entorno de test.

## MCP (Supabase) — fuera de .env.example

Para el MCP de Supabase (`.cursor/mcp.json`):
- `SUPABASE_ACCESS_TOKEN`: Supabase → **Account → Access Tokens → Generate new token**.
- `--project-ref=<project-ref>`: el subdominio de la Project URL.

## Checklist mínimo para desarrollo real

```bash
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_URL=...
SUPABASE_ANON_KEY=...
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_USE_MOCK_USER=false
```

> ¿Necesitas las credenciales reales del proyecto? Pregunta a **Diego Razquin**.
