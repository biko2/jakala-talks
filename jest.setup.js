import "@testing-library/jest-dom";

// Mock de variables de entorno para Supabase
process.env.NODE_ENV = "development";
process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "test-key";
