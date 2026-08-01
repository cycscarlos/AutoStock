-- Inspección de aut_licenses — pegar en SQL Editor de Supabase

-- 1) Estructura de la tabla
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'aut_licenses'
ORDER BY ordinal_position;

-- 2) Índices y constraints
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'aut_licenses';

-- 3) Data completa (las más recientes primero)
SELECT id, license_key, activated_at, expires_at, is_active, created_at
FROM aut_licenses
ORDER BY created_at DESC;

-- 4) Vista resumida: licencias activas y días restantes
SELECT id, license_key, expires_at, is_active,
  (expires_at - CURRENT_DATE) AS dias_restantes
FROM aut_licenses
ORDER BY expires_at DESC;
