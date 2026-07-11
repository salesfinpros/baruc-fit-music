-- Baruc Fit Music — Schema v2: Votação e Histórico
-- Execute no SQL Editor do Supabase APÓS o schema.sql original

-- ============================================================
-- Coluna votos_count na fila de sugestões
-- ============================================================
ALTER TABLE fila_sugestoes ADD COLUMN IF NOT EXISTS votos_count INT NOT NULL DEFAULT 0;

-- ============================================================
-- Votos (cada aluno vota uma vez por música na fila)
-- ============================================================
CREATE TABLE IF NOT EXISTS votos (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fila_item_id  UUID NOT NULL REFERENCES fila_sugestoes(id) ON DELETE CASCADE,
  aluno_id      UUID NOT NULL REFERENCES alunos(id) ON DELETE CASCADE,
  academia_id   UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (fila_item_id, aluno_id)
);

ALTER TABLE votos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votos_select" ON votos FOR SELECT USING (true);

ALTER PUBLICATION supabase_realtime ADD TABLE votos;

-- ============================================================
-- Histórico de músicas tocadas
-- ============================================================
CREATE TABLE IF NOT EXISTS historico_tocadas (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academia_id       UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  aluno_id          UUID REFERENCES alunos(id) ON DELETE SET NULL,
  spotify_track_id  TEXT NOT NULL,
  nome_musica       TEXT NOT NULL,
  artista           TEXT NOT NULL,
  capa_url          TEXT,
  duracao_ms        INT,
  tocada_em         TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE historico_tocadas ENABLE ROW LEVEL SECURITY;
-- Histórico acessível apenas via service key (painel admin)

-- ============================================================
-- RPCs para votos atômicos
-- ============================================================
CREATE OR REPLACE FUNCTION incrementar_votos(p_fila_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE fila_sugestoes SET votos_count = votos_count + 1 WHERE id = p_fila_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION decrementar_votos(p_fila_item_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE fila_sugestoes SET votos_count = GREATEST(0, votos_count - 1) WHERE id = p_fila_item_id;
END;
$$;
