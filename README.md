# Jakala Talks

Una aplicación de gestión y votación de charlas construida con Next.js y Supabase, implementando arquitectura hexagonal.

## Descripción

Esta aplicación permite a los usuarios:

- Proponer charlas técnicas
- Votar por las charlas que más les interesen
- Ver el ranking de charlas por número de votos
- Autenticarse con Google

La aplicación está construida siguiendo los principios de arquitectura hexagonal, separando claramente las capas de dominio, aplicación e infraestructura.

## Requisitos Previos

- Node.js (versión 18 o superior)
- npm, yarn, pnpm o bun
- Una cuenta de Supabase

## Configuración del Entorno

### 1. Configurar Variables de Entorno

Crea un archivo `.env.local` en la raíz del proyecto con las siguientes variables:

```bash
# Para desarrollo
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase

# Para producción
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

**Nota importante**: Las variables de entorno se cargan automáticamente basándose en el entorno:

- En **desarrollo**: Se usan las variables con prefijo `NEXT_PUBLIC_`
- En **producción**:
  - **Lado del servidor**: Se usan las variables sin prefijo `NEXT_PUBLIC_` (preferidas) o con prefijo como fallback
  - **Lado del cliente**: Siempre se usan las variables con prefijo `NEXT_PUBLIC_`

### Para deployment en Vercel

Configura **ambas** versiones de las variables:

```bash
SUPABASE_URL=tu_url_de_supabase
SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anonima_de_supabase
```

### 2. Obtener las Credenciales de Supabase

- Si necesitas, puedes consultar con Diego Razquin cuále son las credenciales actuales o seguir con el proceso para crear un proyecto nuevo.

1. Ve a [Supabase](https://supabase.com) y crea una cuenta si no tienes una
2. Crea un nuevo proyecto
3. En el dashboard de tu proyecto, ve a **Settings** > **API**
4. Copia la **Project URL** y pégala como `NEXT_PUBLIC_SUPABASE_URL`
5. Copia la **anon public** key y pégala como `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Configurar la Base de Datos

En el editor SQL de Supabase, ejecuta las siguientes consultas para crear las tablas necesarias:

```sql
-- Tabla de charlas
CREATE TABLE talks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  author TEXT NOT NULL,
  duration INTEGER NOT NULL,
  votes INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla de votos de usuarios
CREATE TABLE user_votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  talk_id UUID NOT NULL REFERENCES talks(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, talk_id)
);

-- Habilitar Row Level Security
ALTER TABLE talks ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_votes ENABLE ROW LEVEL SECURITY;

-- Políticas para permitir lectura pública de charlas
CREATE POLICY "Permitir lectura pública de charlas" ON talks
  FOR SELECT USING (true);

-- Políticas para permitir inserción de charlas a usuarios autenticados
CREATE POLICY "Permitir inserción de charlas a usuarios autenticados" ON talks
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para permitir actualización de votos en charlas
CREATE POLICY "Permitir actualización de votos" ON talks
  FOR UPDATE USING (auth.role() = 'authenticated');

-- Políticas para votos de usuarios
CREATE POLICY "Usuarios pueden ver sus propios votos" ON user_votes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden insertar sus propios votos" ON user_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuarios pueden eliminar sus propios votos" ON user_votes
  FOR DELETE USING (auth.uid() = user_id);
```

### 4. Configurar Autenticación con Google

1. En tu proyecto de Supabase, ve a **Authentication** > **Providers**
2. Habilita **Google** como proveedor
3. Configura las credenciales de OAuth de Google (necesitarás crear un proyecto en Google Cloud Console)

## Instalación y Ejecución

### 1. Instalar dependencias

```bash
npm install
# o
yarn install
# o
pnpm install
# o
bun install
```

### 2. Ejecutar en modo desarrollo

#### Opción A: Desarrollo normal (requiere configuración de Supabase)

```bash
npm run dev
# o
yarn dev
# o
pnpm dev
# o
bun dev
```

#### Opción B: Desarrollo con modo mock (sin autenticación)

```bash
npm run dev:mock
# o
yarn dev:mock
# o
pnpm dev:mock
# o
bun dev:mock
```

El modo mock incluye:

- Usuario ficticio preconfigurado
- Charlas de ejemplo precargadas
- Votaciones simuladas localmente
- No requiere configuración de Supabase

La aplicación estará disponible en [http://localhost:3000](http://localhost:3000).

### 3. Ejecutar tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch
```

### 4. Compilar para producción

```bash
npm run build
npm start
```

## Estructura del Proyecto

```
src/
├── domain/              # Lógica de negocio pura
│   ├── entities/        # Entidades del dominio
│   ├── valueObjects/    # Objetos de valor
│   └── ports/           # Interfaces (puertos)
├── application/         # Casos de uso
│   └── services/        # Servicios de aplicación
└── infrastructure/      # Adaptadores e implementaciones
    └── adapters/        # Implementaciones de puertos

components/              # Componentes React
├── auth/               # Componentes de autenticación
├── layout/             # Componentes de layout
└── talks/              # Componentes relacionados con charlas

app/                    # App Router de Next.js
├── auth/               # Rutas de autenticación
└── page.tsx            # Página principal
```

## Tecnologías Utilizadas

- **Next.js 15** - Framework de React con App Router
- **React 19** - Librería de UI
- **Supabase** - Backend como servicio (base de datos y autenticación)
- **TypeScript** - Tipado estático
- **Styled Components** - Estilos en componentes
- **Jest & Testing Library** - Testing
- **Arquitectura Hexagonal** - Patrón arquitectónico

## Scripts Disponibles

- `npm run dev` - Ejecuta el servidor de desarrollo con Turbopack (requiere Supabase)
- `npm run dev:mock` - Ejecuta el servidor de desarrollo con modo mock habilitado
- `npm run build` - Compila la aplicación para producción
- `npm start` - Ejecuta la aplicación compilada
- `npm test` - Ejecuta todos los tests
- `npm run test:watch` - Ejecuta tests en modo watch

## Modos de Entorno

La aplicación soporta diferentes modos de funcionamiento:

### 🎭 Modo Mock (Recomendado para desarrollo)

- Usuario ficticio preconfigurado
- Charlas de ejemplo precargadas
- No requiere configuración de Supabase
- Ideal para desarrollo y testing

### 🏠 Modo Local con Supabase

- Autenticación real con Supabase
- Base de datos real
- Requiere configuración de variables de entorno

### 🚀 Modo Producción

- Configuración optimizada para producción
- Variables de entorno de producción

Para más detalles, consulta [Modos de Entorno](docs/ENVIRONMENT_MODES.md).

## Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz commit de tus cambios (`git commit -am 'Añade nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## Licencia

Este proyecto está bajo la licencia MIT.
