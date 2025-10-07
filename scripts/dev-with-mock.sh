#!/bin/bash

# Script para ejecutar el servidor de desarrollo con modo mock habilitado

echo "🚀 Iniciando servidor de desarrollo con modo mock..."

# Crear archivo .env.local si no existe
if [ ! -f .env.local ]; then
    echo "📝 Creando archivo .env.local..."
    cat > .env.local << EOF
# Modo mock para desarrollo local
NEXT_PUBLIC_USE_MOCK_USER=true

# Configuración de Supabase (opcional para modo mock)
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here
EOF
    echo "✅ Archivo .env.local creado con modo mock habilitado"
else
    echo "📝 Actualizando .env.local para habilitar modo mock..."
    # Verificar si NEXT_PUBLIC_USE_MOCK_USER ya existe
    if grep -q "NEXT_PUBLIC_USE_MOCK_USER" .env.local; then
        # Actualizar el valor existente
        sed -i '' 's/NEXT_PUBLIC_USE_MOCK_USER=.*/NEXT_PUBLIC_USE_MOCK_USER=true/' .env.local
    else
        # Agregar la variable
        echo "NEXT_PUBLIC_USE_MOCK_USER=true" >> .env.local
    fi
    echo "✅ Modo mock habilitado en .env.local"
fi

echo ""
echo "🎭 Modo mock activado:"
echo "   - Usuario: Usuario Mock (usuario.mock@jakala.com)"
echo "   - Charlas: 3 charlas de ejemplo precargadas"
echo "   - Votaciones: Simuladas localmente"
echo ""

# Ejecutar el servidor de desarrollo
echo "🌐 Iniciando servidor..."
yarn dev
