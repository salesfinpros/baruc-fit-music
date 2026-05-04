-- Baruc Fit Music — Schema Supabase
-- Execute este arquivo no SQL Editor do Supabase

create extension if not exists "uuid-ossp";

-- ============================================================
-- Academias
-- ============================================================
create table if not exists academias (
  id                        uuid primary key default uuid_generate_v4(),
  nome                      text not null,
  slug                      text unique not null,
  spotify_access_token      text,
  spotify_refresh_token     text,
  spotify_token_expires_at  timestamptz,
  ativo                     boolean default true,
  created_at                timestamptz default now()
);

-- Inserir as duas academias
insert into academias (nome, slug) values
  ('Academia Umirim', 'umirim'),
  ('Academia São Luís do Curu', 'sao-luis-do-curu')
on conflict (slug) do nothing;

-- ============================================================
-- Alunos
-- ============================================================
create table if not exists alunos (
  id                      uuid primary key default uuid_generate_v4(),
  academia_id             uuid not null references academias(id) on delete cascade,
  nome                    text not null,
  telefone                text not null,
  total_sugestoes_hoje    int default 0,
  ultima_sugestao_em      timestamptz,
  created_at              timestamptz default now(),
  unique (academia_id, telefone)
);

-- ============================================================
-- Fila de Sugestões
-- ============================================================
create table if not exists fila_sugestoes (
  id                    uuid primary key default uuid_generate_v4(),
  academia_id           uuid not null references academias(id) on delete cascade,
  aluno_id              uuid not null references alunos(id) on delete cascade,
  spotify_track_id      text not null,
  nome_musica           text not null,
  artista               text not null,
  capa_url              text,
  duracao_ms            int,
  status                text not null default 'na_fila' check (status in ('na_fila','tocada','removida')),
  created_at            timestamptz default now(),
  added_to_spotify_at   timestamptz
);

-- ============================================================
-- Log de Bloqueios
-- ============================================================
create table if not exists bloqueios_log (
  id                    uuid primary key default uuid_generate_v4(),
  academia_id           uuid not null references academias(id) on delete cascade,
  aluno_id              uuid references alunos(id) on delete set null,
  spotify_track_id      text not null,
  nome_musica           text not null,
  artista               text not null,
  genero_detectado      text,
  motivo                text not null check (motivo in ('genero_bloqueado','musica_bloqueada','duplicada','limite_aluno','musica_explicita','duracao_excedida')),
  created_at            timestamptz default now()
);

-- ============================================================
-- Config por Academia
-- ============================================================
create table if not exists config_academia (
  academia_id                       uuid primary key references academias(id) on delete cascade,
  generos_bloqueados                text[] default array['funk','funk carioca','brega funk','sertanejo','sertanejo universitario','trap'],
  musicas_bloqueadas                text[] default '{}',
  limite_sugestoes_aluno_por_dia    int default 5,
  duracao_maxima_ms                 int default 600000,
  bloquear_explicitas               boolean default true
);

-- Inserir config padrão para cada academia
insert into config_academia (academia_id)
select id from academias
on conflict (academia_id) do nothing;

-- ============================================================
-- Habilitar Realtime
-- ============================================================
alter publication supabase_realtime add table fila_sugestoes;
alter publication supabase_realtime add table bloqueios_log;

-- ============================================================
-- Reset diário de sugestões (função + cron via pg_cron)
-- ============================================================
create or replace function reset_sugestoes_diarias()
returns void language plpgsql as $$
begin
  update alunos set total_sugestoes_hoje = 0;
end;
$$;

-- Rodar às 00:00 BRT (03:00 UTC)
-- Requer pg_cron habilitado no Supabase (Dashboard > Database > Extensions)
-- select cron.schedule('reset-sugestoes', '0 3 * * *', 'select reset_sugestoes_diarias()');

-- ============================================================
-- Row Level Security (RLS)
-- ============================================================
alter table academias          enable row level security;
alter table alunos             enable row level security;
alter table fila_sugestoes     enable row level security;
alter table bloqueios_log      enable row level security;
alter table config_academia    enable row level security;

-- Leitura pública (anon key) — necessário para o app funcionar no frontend
create policy "academias_select" on academias for select using (true);
create policy "alunos_select" on alunos for select using (true);
create policy "fila_select" on fila_sugestoes for select using (true);
create policy "bloqueios_select" on bloqueios_log for select using (true);
create policy "config_select" on config_academia for select using (true);

-- Escrita usa service key (backend) — sem política pública de insert/update/delete

-- ============================================================
-- Função RPC: incrementar sugestão do aluno
-- ============================================================
create or replace function incrementar_sugestao(p_aluno_id uuid)
returns void language plpgsql security definer as $$
begin
  update alunos
  set
    total_sugestoes_hoje = total_sugestoes_hoje + 1,
    ultima_sugestao_em = now()
  where id = p_aluno_id;
end;
$$;
