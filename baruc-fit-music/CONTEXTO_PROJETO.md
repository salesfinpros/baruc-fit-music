# CONTEXTO DO PROJETO — Baruc Fit Music

**Última atualização:** 2026-05-24  
**Ambiente de produção:** https://baruc-fit-music.vercel.app  
**Repositório:** github.com/salesfinpros/baruc-fit-music (branch: master, privado)  
**Banco de dados:** Supabase — projeto `eyqhjeijbirelgxhupwu`

---

## 1. O QUE É O APP

Sistema web para academias gerenciarem uma fila colaborativa de músicas integrada ao Spotify. Alunos escaneiam um QR Code, cadastram nome e telefone, buscam músicas e sugerem para a fila. O admin controla o que pode ou não tocar.

**Academias cadastradas:**
- Academia Umirim (`slug: umirim`)
- Academia São Luís do Curu (`slug: sao-luis-do-curu`)

---

## 2. STACK TÉCNICA

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16.2.4 (App Router) |
| UI | React 19 + Tailwind CSS v4 |
| Banco | Supabase (PostgreSQL + Realtime) |
| Auth admin | JWT via cookie (biblioteca `jose`) |
| Integração | Spotify Web API (OAuth 2.0) |
| Deploy | Vercel (Hobby plan) |
| Linguagem | TypeScript strict |

---

## 3. ESTRUTURA DE PASTAS

```
baruc-fit-music/
├── app/
│   ├── layout.tsx                     # Layout raiz: fontes, metadata, tema dark
│   ├── page.tsx                       # Redireciona / → /admin/login
│   ├── globals.css                    # Tema, cores, animações soundwave
│   ├── admin/
│   │   ├── login/page.tsx             # Tela de login do admin
│   │   └── [slug]/
│   │       ├── page.tsx               # SSR: valida sessão, carrega academia
│   │       ├── PainelClient.tsx       # Painel admin (7 abas)
│   │       └── ConfiguracaoPanel.tsx  # CRUD de configurações da academia
│   ├── sugerir/
│   │   └── [slug]/page.tsx            # Tela pública do aluno
│   └── api/
│       ├── alunos/
│       │   ├── route.ts               # POST: cadastro/login do aluno
│       │   └── sugestao/route.ts      # DELETE: aluno cancela sua sugestão
│       ├── sugerir/route.ts           # POST: valida e adiciona música à fila
│       ├── sugestoes/route.ts         # POST: salva feedback | GET: lista (admin)
│       ├── votar/route.ts             # POST/DELETE: voto em item da fila (*)
│       ├── historico/route.ts         # GET: histórico 30 dias | POST: registra tocada
│       ├── admin/
│       │   ├── login/route.ts         # POST: auth | DELETE: logout
│       │   ├── fila/route.ts          # DELETE: remove item da fila
│       │   ├── config/route.ts        # GET/PATCH: configurações da academia
│       │   ├── alunos/route.ts        # DELETE: remove aluno (LGPD)
│       │   └── historico/route.ts     # GET: histórico paginado com filtros
│       ├── spotify/
│       │   ├── login/route.ts         # GET: inicia OAuth Spotify
│       │   ├── callback/route.ts      # GET: finaliza OAuth, salva tokens
│       │   ├── search/route.ts        # GET: busca músicas
│       │   ├── now-playing/route.ts   # GET: faixa tocando agora
│       │   └── disconnect/route.ts    # POST: desconecta conta Spotify
│       └── cron/
│           └── reset-daily/route.ts   # GET: reset diário (Vercel Cron)
├── components/
│   ├── FilaAluno.tsx          # Fila em tempo real — visão do aluno
│   ├── FilaTempoReal.tsx      # Fila em tempo real — visão do admin
│   ├── MusicaAtual.tsx        # Card "tocando agora" (polling 12s)
│   ├── BuscaMusica.tsx        # Input de busca com debounce 300ms
│   ├── CardMusica.tsx         # Card clicável de resultado de busca
│   ├── CadastroAluno.tsx      # Formulário nome + telefone
│   ├── HistoricoAdmin.tsx     # Histórico + top 10 mais tocadas
│   ├── LogBloqueios.tsx       # Log de rejeições em tempo real
│   ├── QRCodeAcademia.tsx     # QR Code com download PNG
│   ├── SugestaoFlutuante.tsx  # Botão flutuante + modal de feedback
│   └── SugestoesAdmin.tsx     # Listagem de sugestões de melhoria
├── lib/
│   ├── supabase.ts    # Clientes Supabase (anon e admin) + tipos TypeScript
│   ├── spotify.ts     # Funções da Spotify API + auto-refresh de token
│   ├── auth.ts        # Criação e verificação de JWT admin
│   ├── validacao.ts   # 6 critérios de validação de sugestão
│   └── telefone.ts    # Máscara, limpeza e validação de telefone
├── supabase/
│   ├── schema.sql     # Schema v1: 5 tabelas base
│   └── schema_v2.sql  # Schema v2: votos + historico_tocadas
├── next.config.ts     # images.unoptimized: true (sem consumo Image Optimization)
├── vercel.json        # Cron job diário às 3h UTC
├── package.json
└── CONTEXTO_PROJETO.md
```

---

## 4. BANCO DE DADOS (SUPABASE)

### Tabelas implementadas e rodando em produção

#### `academias`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| nome | TEXT | Nome exibido |
| slug | TEXT UNIQUE | Identificador na URL |
| spotify_access_token | TEXT | Token atual do Spotify |
| spotify_refresh_token | TEXT | Token para renovar |
| spotify_token_expires_at | TIMESTAMPTZ | Validade do access token |
| ativo | BOOLEAN | Academia habilitada |
| created_at | TIMESTAMPTZ | |

#### `alunos`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| academia_id | UUID FK | |
| nome | TEXT | |
| telefone | TEXT | Apenas dígitos |
| total_sugestoes_hoje | INT | Resetado pelo cron |
| ultima_sugestao_em | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

**Constraint:** UNIQUE(academia_id, telefone)

#### `fila_sugestoes`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| academia_id | UUID FK | |
| aluno_id | UUID FK nullable | |
| spotify_track_id | TEXT | ID da faixa no Spotify |
| nome_musica | TEXT | |
| artista | TEXT | |
| capa_url | TEXT | URL da capa do álbum |
| duracao_ms | INT | |
| status | TEXT | `na_fila` / `tocada` / `removida` |
| votos_count | INT | Contador (campo existe, UI removida) |
| added_to_spotify_at | TIMESTAMPTZ | |
| created_at | TIMESTAMPTZ | |

#### `votos`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| fila_item_id | UUID FK → fila_sugestoes | ON DELETE CASCADE |
| aluno_id | UUID FK → alunos | ON DELETE CASCADE |
| academia_id | UUID FK | |
| created_at | TIMESTAMPTZ | |

**Constraint:** UNIQUE(fila_item_id, aluno_id)  
**Obs:** Tabela existe mas não tem UI ativa — votação foi removida.

#### `config_academia`
| Coluna | Tipo | Descrição |
|---|---|---|
| academia_id | UUID PK FK | |
| generos_bloqueados | TEXT[] | Ex: ['funk', 'sertanejo'] |
| musicas_bloqueadas | TEXT[] | IDs de tracks Spotify |
| limite_sugestoes_aluno_por_dia | INT | Padrão: 3 |
| duracao_maxima_ms | INT | Padrão: 420000 (7 min) |
| bloquear_explicitas | BOOLEAN | |

#### `bloqueios_log`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| academia_id | UUID FK | |
| aluno_id | UUID FK nullable | |
| spotify_track_id | TEXT | |
| nome_musica | TEXT | |
| artista | TEXT | |
| genero_detectado | TEXT nullable | |
| motivo | TEXT | `musica_bloqueada` / `musica_explicita` / `duracao_excedida` / `ja_na_fila` / `limite_aluno` / `genero_bloqueado` |
| created_at | TIMESTAMPTZ | |

**Obs:** Duplicatas (`ja_na_fila`) não são registradas aqui — tratamento feito no código.

#### `historico_tocadas`
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| academia_id | UUID FK | |
| aluno_id | UUID FK nullable | ON DELETE SET NULL |
| spotify_track_id | TEXT | |
| nome_musica | TEXT | |
| artista | TEXT | |
| capa_url | TEXT nullable | |
| duracao_ms | INT nullable | |
| tocada_em | TIMESTAMPTZ | |

#### `sugestoes_melhoria` ⚠️ PRECISA SER CRIADA
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| academia_id | UUID FK | ON DELETE CASCADE |
| aluno_id | UUID FK nullable | ON DELETE SET NULL |
| texto | TEXT | Máx. 500 caracteres |
| created_at | TIMESTAMPTZ | |

**SQL para criar:**
```sql
CREATE TABLE sugestoes_melhoria (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  academia_id UUID NOT NULL REFERENCES academias(id) ON DELETE CASCADE,
  aluno_id    UUID REFERENCES alunos(id) ON DELETE SET NULL,
  texto       TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE sugestoes_melhoria ENABLE ROW LEVEL SECURITY;
```

### RPCs (funções Postgres)
- `incrementar_sugestao(p_aluno_id)` — incrementa `total_sugestoes_hoje` + seta `ultima_sugestao_em`
- `incrementar_votos(p_fila_item_id)` — +1 em `votos_count`
- `decrementar_votos(p_fila_item_id)` — -1 em `votos_count` (mínimo 0)

### Realtime ativo
- `fila_sugestoes` — usado por FilaAluno e FilaTempoReal
- `bloqueios_log` — usado por LogBloqueios
- `votos` — publicada mas sem listener ativo (UI removida)

---

## 5. MÓDULOS IMPLEMENTADOS

### Tela do Aluno (`/sugerir/[slug]`)
- [x] Cadastro com nome + telefone (validação de 10-11 dígitos)
- [x] Persistência do aluno no localStorage por academia
- [x] Card "tocando agora" com progresso (polling 12s)
- [x] Busca de músicas com debounce 300ms
- [x] Sugestão com validação completa (6 critérios)
- [x] Fila em tempo real via Supabase Realtime
- [x] Cancelamento da própria sugestão
- [x] Limite diário de sugestões por aluno
- [x] Botão flutuante de sugestão de melhoria do app
- [x] Mensagens de erro amigáveis para cada motivo de rejeição

### Painel Admin (`/admin/[slug]`)
- [x] Login por senha única com JWT (cookie httpOnly, 8h)
- [x] **Aba Fila** — visão da fila numerada em tempo real, remoção manual
- [x] **Aba Bloqueios** — log das últimas 50 rejeições com motivo e cor
- [x] **Aba Histórico** — log detalhado + top 10 mais tocadas (hoje/7/30 dias)
- [x] **Aba QR Code** — geração e download PNG do QR para os alunos
- [x] **Aba Spotify** — conexão e desconexão da conta Spotify via OAuth
- [x] **Aba Config** — CRUD de gêneros e músicas bloqueados, limite diário, duração máxima, conteúdo explícito
- [x] **Aba Sugestões** — listagem de feedbacks dos alunos com nome e horário
- [x] Card "tocando agora" fixo no topo do painel (polling 5s)
- [x] Registro automático no histórico quando faixa muda
- [x] Remoção de aluno (LGPD) com cascade delete

### Integração Spotify
- [x] OAuth 2.0 completo (login → callback → tokens salvos no Supabase)
- [x] Auto-refresh de token quando expira em menos de 60s
- [x] Busca de músicas (`GET /search?type=track`)
- [x] Adição à fila (`POST /me/player/queue`)
- [x] "Tocando agora" (`GET /me/player/currently-playing`)
- [x] Gêneros do artista para validação (`GET /artists/{id}`)

### Reset Diário (Vercel Cron)
- [x] Executa todo dia à meia-noite (Fortaleza, UTC-3)
- [x] Zera `fila_sugestoes` (status `na_fila` → `removida`)
- [x] Zera `total_sugestoes_hoje` de todos os alunos
- [x] Protegido por `CRON_SECRET` no header Authorization

### Validação de Sugestões (ordem de execução)
1. Config da academia existe?
2. Música está na blacklist?
3. Conteúdo explícito e bloqueado?
4. Duração excede o máximo?
5. Música já está na fila?
6. Aluno atingiu limite diário?
7. Gênero do artista bloqueado?

---

## 6. VARIÁVEIS DE AMBIENTE

Todas configuradas no Vercel. O arquivo `.env.local` local está no `.gitignore`.

| Variável | Onde é usada |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Cliente público Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente público Supabase |
| `SUPABASE_SERVICE_KEY` | Cliente admin Supabase (server-side apenas) |
| `SPOTIFY_CLIENT_ID` | OAuth Spotify |
| `SPOTIFY_CLIENT_SECRET` | OAuth Spotify (server-side apenas) |
| `SPOTIFY_REDIRECT_URI` | OAuth callback URL |
| `ADMIN_PASSWORD` | Senha do painel admin |
| `JWT_SECRET` | Assinatura do token JWT |
| `CRON_SECRET` | Autenticação do endpoint de reset |
| `NEXT_PUBLIC_APP_URL` | URL base para geração do QR Code |

---

## 7. DESIGN

- **Fundo:** `#0D0D0D`
- **Surface (cards):** `#1A1A1A`
- **Borda:** `#2A2A2A`
- **Dourado (destaque):** `#F5A800`
- **Muted (texto secundário):** `#999`
- **Perigo:** `#FF4444`
- **Fontes:** Bebas Neue (títulos/labels) + Inter (corpo)
- **Animação:** Barras de soundwave no header do aluno

---

## 8. LIMITAÇÕES CONHECIDAS

### Spotify — Ordem da Fila
A API do Spotify (`POST /me/player/queue`) só permite adicionar ao **final** da fila. Não existe endpoint para reordenar. Por isso a votação foi removida — ela mostrava ordem diferente na UI mas não afetava o que tocava no Spotify.

**Solução possível (não implementada):** Botão manual "Tocar a seguir" no admin que usa `POST /me/player/next` para pular e adicionar a música prioritária novamente ao início.

### Vercel Hobby Plan
- Cron jobs: máximo 2, mínimo 1 por dia
- Image Optimization: 5.000/mês — resolvido com `unoptimized: true` + `<img>` nativo

### Conta Spotify Premium
A academia precisa ter conta Spotify Premium para que a API de controle de fila funcione. Com conta gratuita, o endpoint retorna 403.

---

## 9. PENDÊNCIAS

| Item | Status | Detalhe |
|---|---|---|
| Criar tabela `sugestoes_melhoria` no Supabase | **PENDENTE** | SQL disponível na seção 4 deste arquivo |
| Botão "Tocar a seguir" no admin | Não iniciado | Contorna limitação da fila Spotify |
| Rate limiting no login admin | Não iniciado | Não há bloqueio por tentativas |
| Notificação push quando a música do aluno está tocando | Não iniciado | Ideia futura |
| Geração de playlist no Spotify com top músicas | Não iniciado | Botão "GERAR PLAYLIST" já existe na UI (desabilitado) |

---

## 10. COMO RODAR LOCALMENTE

```bash
# Na pasta do projeto
cd "C:\Users\valde\Documents\Valdecirio\Academia\Claude Teste\baruc-fit-music"

# Instalar dependências (já instaladas)
npm install

# Rodar em dev (porta 3001)
npm run dev
```

O Spotify OAuth em dev usa `SPOTIFY_REDIRECT_URI=http://127.0.0.1:3001/api/spotify/callback`.
