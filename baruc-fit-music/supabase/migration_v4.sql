-- migration_v4.sql
-- Sistema de redes de academias
-- Executar no Supabase SQL Editor

CREATE TABLE IF NOT EXISTS redes (
  id   UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE academias ADD COLUMN IF NOT EXISTS rede_id UUID REFERENCES redes(id);

-- Criar a rede e associar as academias (ajuste os slugs conforme necessário):
--
--   INSERT INTO redes (nome) VALUES ('Baruc Fit') RETURNING id;
--
-- Depois, com o UUID retornado:
--
--   UPDATE academias SET rede_id = '<UUID>' WHERE slug IN ('umirim', 'sao-luis-do-curu');
