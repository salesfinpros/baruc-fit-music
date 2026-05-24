-- migration_v3_fix.sql
-- Adicionar gêneros faltantes nas academias existentes
-- Executar no Supabase SQL Editor

UPDATE config_academia
SET generos_bloqueados = array_cat(
  generos_bloqueados,
  ARRAY[
    'forro',
    'piseiro',
    'pagode',
    'axe',
    'brega',
    'funk ostentacao',
    'sertanejo universitario'
  ]
)
WHERE academia_id IN (SELECT id FROM academias)
AND NOT (generos_bloqueados @> ARRAY['forro']);
