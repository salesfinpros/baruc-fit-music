-- migration_v3.sql
-- Executar no Supabase SQL Editor

-- PARTE 1: Bloqueios expandidos (albuns e artistas)
ALTER TABLE config_academia
  ADD COLUMN IF NOT EXISTS albuns_bloqueados TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS artistas_bloqueados TEXT[] DEFAULT '{}';

-- PARTE 2: Suspensão de alunos
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS suspenso BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS motivo_suspensao TEXT,
  ADD COLUMN IF NOT EXISTS suspenso_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS suspenso_por TEXT;

-- PARTE 3: CPF dos alunos
ALTER TABLE alunos
  ADD COLUMN IF NOT EXISTS cpf TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS alunos_academia_cpf_unique
  ON alunos (academia_id, cpf)
  WHERE cpf IS NOT NULL;
