# SolarSync — Capacidades do App

> Mapa do que este app **faz hoje**, derivado do código em `src/`. Fonte de verdade
> pra qualquer sessão Claude antes de mexer. Atualizar sempre que adicionar ou
> remover módulo.
>
> Última varredura: 2026-06-01 (commit inicial pendente — repo ainda sem histórico)

---

## 1. Identidade

- **Nome interno (manifest/index):** SolarSync — Gestão de Obras
- **Descrição:** Sistema de gestão de obras solares (Critéria Energia)
- **PWA:** sim — `manifest.json`, ícones 192/512, `start_url=/colaborador/login`
- **Theme color:** `#2563eb` (azul)
- **Repositório:** `https://github.com/CarlosChirano/gestao-obras-solar` (público, repo id 1110230198) — **tem histórico completo** no GitHub.
- **Deploy:** Vercel — project real **`gestao-obras-solar-obwu`** (`prj_7hMdYSwG0zbgfDDiAZV3FqcaSxk0`) / team `team_9xkV3N7prppH0gkiV8Yazsir` (carlos-chiranos-projects).
  - **Produção:** https://gestao-obras-solar-obwu.vercel.app
  - **Auto-deploy:** push no `main` do GitHub dispara build (integração GitHub↔Vercel ativa). Não precisa `vercel deploy` manual.
  - **Framework detectado:** Vite. Node 24.x.
  - ⚠️ O `.vercel/project.json` **local aponta pra project errado** (`prj_E1NOwIjo7AvBEqBYomzAhQk13hL3` / `gestao-obras-solar`) que **não existe mais** nesse team. Re-linkar (`vercel link`) pro project `-obwu` se for deployar via CLI.

---

## 2. Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19 + Vite 7 |
| Estilo | Tailwind 4 + PostCSS |
| Roteamento | react-router-dom 7 |
| Data fetching | @tanstack/react-query 5 |
| Forms | react-hook-form 7 + zod 4 + @hookform/resolvers |
| UI/Ícones | lucide-react |
| Charts | recharts 3 |
| PDF/Imagem | html2canvas + jspdf + jspdf-autotable |
| Notificações | react-hot-toast |
| Datas | date-fns 4 |
| Backend (BaaS) | Supabase JS 2 (auth + Postgres + Storage) |

Scripts (`package.json`):

- `npm run dev` — Vite dev server (porta 3000, abre browser)
- `npm run build` — build produção
- `npm run preview` — preview do build

> **AVISO:** projeto está dentro do Google Drive — **NUNCA rodar `npm install` aqui**.
> Pra desenvolver, clonar em `~/dev/gestao-obras-solar`. Ver `~/.claude/rules/drive-safety.md`.

---

## 3. Conexões externas

### 3.1 Supabase

- **URL:** `https://ebpxqmakimkvqoqwfeeh.supabase.co`
- **Cliente:** `src/lib/supabase.js` — anon key **hardcoded** no fonte (frontend).
- **Auth:** Supabase Auth (`signInWithPassword`, `resetPasswordForEmail`, `onAuthStateChange`).
  - Sessão é resolvida com timeout de 5s (`AuthContext`).
  - Perfil do usuário é cruzado entre tabelas `usuarios` (legada) e `colaboradores` + `perfis_acesso`.
  - Flag `is_admin` vem do `perfil_acesso` do colaborador.
- **DB:** Postgres do Supabase. RLS ativo em várias tabelas com policy "Acesso total" (USING `true`) — política permissiva, não granular.

> ✅ **MCP `supabase-obras` conectado** (project `ebpxqmakimkvqoqwfeeh`, scope user).
> Registrado em 2026-06-01 com PAT. Tools `mcp__...supabase...__*` disponíveis após reiniciar a sessão.
> O MCP `supabase` (legado, ref `aqncmhnevqmugqnsqdtf`) é do **Full Manager**, não deste app — não usar aqui.

### 3.2 Vercel

- **MCP Vercel:** ✅ autenticado (OAuth, 2026-06-01).
- Project real: **`gestao-obras-solar-obwu`** (`prj_7hMdYSwG0zbgfDDiAZV3FqcaSxk0`), team `team_9xkV3N7prppH0gkiV8Yazsir`.
- Produção: https://gestao-obras-solar-obwu.vercel.app
- **Deploy automático** no push pro `main` do GitHub. Não precisa CLI.
- `vercel.json` — única regra: rewrite SPA (`/(.*)` → `/`).
- ⚠️ `.vercel/project.json` local está **stale** (aponta pra project inexistente). Re-linkar antes de usar `vercel` CLI.

### 3.3 GitHub

- Remote `origin`: `CarlosChirano/gestao-obras-solar` (repo público, id 1110230198).
- **GitHub tem histórico completo** — último commit conhecido `25a1576` ("feat: DRE detalhado…"). Deploys saem daqui.
- **MCP GitHub:** ✗ `Failed to connect` — usar `gh` CLI direto.
- ⚠️ **A cópia LOCAL no Drive tem git quebrado/vazio** (`git log` → "does not have any commits yet"). Ou seja: a pasta do Drive **não** é o working tree conectado ao histórico do GitHub. **Não commitar daqui** sem antes reconciliar (ver seção 8.1). Pra desenvolver de verdade: `git clone` em `~/dev/gestao-obras-solar`.

### 3.4 Outros MCPs do ambiente

| MCP | Status | Relevância para este projeto |
|---|---|---|
| basic-memory | ✓ Connected | Busca semântica no vault Obsidian |
| claude-mem | ✓ Connected | Memória entre sessões |
| context-mode | ✓ Connected | Indexação FTS5 para output grande |
| canva | ✓ Connected | Design de imagens/banners |
| figma / figma-remote | falhou / precisa auth | Não usado hoje |

---

## 4. Estrutura de pastas

```
src/
├── App.jsx                    # Router + AuthProvider + QueryClient
├── main.jsx                   # Entry — BrowserRouter
├── index.css                  # Tailwind base
├── lib/
│   ├── supabase.js            # Cliente Supabase (anon key hardcoded)
│   └── ofxParser.js           # Parser OFX bancário
├── contexts/
│   └── AuthContext.jsx        # Auth + carregamento de perfil
├── layouts/
│   ├── AuthLayout.jsx
│   └── MainLayout.jsx         # Sidebar + topo
├── components/                # Sub-componentes da OS
│   ├── OrdemServicoDetalhes.jsx
│   ├── OSAnexos.jsx
│   ├── OSAssinaturas.jsx
│   ├── OSChecklist.jsx (+ OSChecklist (1).jsx ← duplicata)
│   ├── OSFotos.jsx
│   ├── OSHistorico.jsx
│   ├── OSRelatorio.jsx
│   ├── OSRelatorioObra.jsx
│   ├── PagePlaceholder.jsx
│   ├── SelectConta.jsx
│   └── SignaturePad.jsx
└── pages/
    ├── Dashboard.jsx
    ├── auth/                  # Login, recuperação, convite
    ├── colaborador/           # Mobile — login + lista de OS
    ├── operacao/              # Núcleo do app (OS, Calendário, Propostas, Relatórios)
    ├── cadastros/             # Tudo que é "tabela mestre"
    ├── financeiro/            # Lançamentos, OFX, contas, plano de contas
    ├── usuarios/              # Usuários + perfis de acesso
    ├── configuracoes/         # Tela genérica (subutilizada)
    └── relatorios/            # DREObras + Relatórios consolidados
```

---

## 5. Rotas e módulos

### 5.1 Públicas

| Rota | Página | Função |
|---|---|---|
| `/login` | `auth/Login` | Login do gestor (web) |
| `/redefinir-senha` | `auth/RedefinirSenha` | Reset via link |
| `/aceitar-convite` | `auth/AceitarConvite` | Aceitar convite e setar senha |
| `/colaborador/login` | `colaborador/ColaboradorLogin` | Login mobile do técnico |
| `/colaborador/minhas-os` | `colaborador/MinhasOS` | Lista de OS atribuídas + check-in |

### 5.2 Privadas (PrivateRoute → MainLayout)

**Operação**
| Rota | Página |
|---|---|
| `/` | Dashboard (KPIs + ranking) |
| `/ordens-servico` | Listagem de OS |
| `/ordens-servico/nova` | Criar OS |
| `/ordens-servico/:id` | Detalhes (abas: dados, fotos, anexos, checklist, histórico, assinaturas, relatório) |
| `/ordens-servico/:id/editar` | Editar OS |
| `/calendario` | Visão calendário das OS |
| `/relatorios` | Relatórios consolidados |
| `/checkins` | Dashboard de check-ins (controle de presença) |
| `/aprovacoes` | Fila de aprovações sensíveis (`os_aprovacoes`) |
| `/custos-equipe` | Custos consolidados de equipe |
| `/relatorios-obra` / `/relatorio-obra/novo` / `/relatorio-obra/:id` | Relatório fotográfico / técnico de obra |
| `/relatorios-checklist` | Relatórios de execução de checklist |
| `/propostas` / `/proposta/nova` / `/proposta/:id` | Propostas comerciais (com PDF via jsPDF) |

**Financeiro**
| Rota | Página |
|---|---|
| `/financeiro` | Visão geral (KPIs + abas) |
| `/financeiro/novo` / `/financeiro/:id` | Lançamento individual |
| `/financeiro/contas/nova` / `/financeiro/contas/:id` | Contas bancárias |
| `/financeiro/importar-ofx` | Importação OFX (parser próprio em `lib/ofxParser.js`) |
| `/plano-contas` | Plano de contas |

**Usuários**
| Rota | Página |
|---|---|
| `/usuarios` | Listar usuários |
| `/usuarios/:id` | Form de usuário |
| `/usuarios/perfis` | Perfis de acesso (RBAC) |

**Cadastros**
| Rota | Página |
|---|---|
| `/colaboradores` + nova/:id | Cadastro de colaboradores |
| `/clientes` + novo/:id | Cadastro de clientes (com endereços) |
| `/funcoes` + novo/:id | Funções de colaborador |
| `/equipes` + nova/:id | Equipes (membros) |
| `/servicos` | Serviços oferecidos |
| `/veiculos` | Veículos da operação |
| `/empresas-contratantes` | Empresas que contratam |
| `/checklist-modelos` | Modelos de checklist |
| `/motivos-pausa` | Motivos pré-cadastrados (chuva, falta de material, etc.) |
| `/faixas-preco-venda` | Faixas de preço de venda |
| `/faixas-preco-custo` | Faixas de preço de custo |
| `/servicos-extras` | Serviços extras avulsos |
| `/proposta-modelos` | Modelos de proposta |

Fallback: `*` → redirect pra `/`.

---

## 6. Tabelas Supabase em uso

> Extraído via grep `.from('...')` no `src/`. **60 referências distintas no código**.
> **Banco real tem 73 tabelas + 10 views.** Diferença mapeada na seção 6.4 (bugs)
> e 6.5 (features prontas no DB sem UI).

### Operação
`ordens_servico`, `os` (legada?), `os_servicos`, `ordem_servico_servicos`, `os_colaboradores`, `os_veiculos`, `os_checkins`, `os_checklists`, `os_checklist_itens`, `os_fotos`, `os_anexos`, `os_assinaturas`, `os_historico`, `os_alteracoes_log`, `os_aprovacoes`, `os_acompanhamento_diario`, `os_acompanhamento_equipe`, `os_custos_extras`, `motivos_pausa`, `checkin_config`

### Checklists
`checklist_modelos`, `checklist_modelo_itens`

### Relatórios de obra
`relatorios_obra`, `relatorio_secoes`, `relatorio_itens`, `relatorio_fotos`

### Propostas
`propostas`, `proposta_itens`, `proposta_fotos`, `proposta_modelos`

### Cadastros / mestres
`clientes`, `cliente_enderecos`, `colaboradores`, `colaborador_usuarios`, `funcoes`, `equipes`, `equipe_membros`, `servicos`, `servicos_extras`, `veiculos`, `empresas_contratantes`, `faixas_preco_venda`, `faixas_preco_custo`, `certificados`, `epis`

### Financeiro
`lancamentos`, `lancamentos_financeiros`, `lancamento_clientes`, `contas_bancarias`, `transacoes_bancarias`, `importacoes_ofx`, `categorias_financeiras`, `formas_pagamento`, `plano_contas`

### Auth / permissões
`usuarios`, `perfis`, `perfis_acesso`, `permissoes`

### Auxiliares
`anexos`, `uploads`

> ⚠️ Existe `os` **e** `ordens_servico` — possivelmente legado vs atual. Auditar
> antes de migration. Também existem `lancamentos` **e** `lancamentos_financeiros`.

### 6.1 Storage buckets

`uploads`, `anexos`, `propostas` — usados via `supabase.storage.from(...)`.

### 6.2 RPC functions

Nenhuma. Toda lógica vive no client.

### 6.3 Schemas SQL versionados no repo

- `sql/propostas-tables.sql`
- `sql/seed-checklists-relatorio.sql`

(SQLs de migration mais antigos estão referenciados em `DEPLOY_DIARIO_OBRA.md` e
`INSTRUCOES_FINANCEIRO.md`, mas os arquivos não estão no repo — foram executados
direto no Supabase.)

### 6.4 ✅ RESOLVIDO (2026-06-01) — feature "múltiplos serviços por OS"

> **Status:** corrigido. Tabela `os_servicos` criada em produção + código padronizado.
> Migration versionada em `sql/2026-06-01-os_servicos.sql`.
> Verificado via API Supabase (project `ebpxqmakimkvqoqwfeeh`) + leitura do código, 2026-06-01.
>
> **O que foi feito:**
> 1. `CREATE TABLE os_servicos` (8 colunas, 2 FKs → `ordens_servico`/`servicos`, RLS permissivo, 2 índices). Aplicada (HTTP 201).
> 2. Código: `Dashboard.jsx:65` e `OSRelatorio.jsx:52` migrados de `ordem_servico_servicos` → `os_servicos`. Agora há **um só nome** no código (7 usos consistentes).
> 3. Verificação: PostgREST resolve os joins aninhados (HTTP 200) e round-trip transacional (insert no formato do app + join + ROLLBACK) passou — FKs aceitam o payload, nada vazou pra prod.
> 4. ⚠️ Pendente commit/push do clone `~/dev` (edições em `Dashboard.jsx`, `OSRelatorio.jsx`, `sql/`). Push dispara o deploy.
>
> _Histórico do bug abaixo, pra referência._

**Falso-positivo (NÃO são bugs):** `.from('os')` (era prefixo de `os_fotos` etc. na varredura),
`anexos` e `uploads` (são `supabase.storage.from(...)` — buckets, corretos). Ignorar.

**Bug real:** a tabela de linha de serviços de uma OS **nunca foi criada**, e o código a chama
por **dois nomes diferentes**, nenhum existente no banco:

| Arquivo:linha | Chamada | Efeito |
|---|---|---|
| `pages/operacao/OrdemServicoForm.jsx:1190` | `insert` em `os_servicos` | **Serviços digitados na OS nunca são salvos** (erro ignorado) |
| `pages/operacao/OrdemServicoForm.jsx:337` | `select` `os_servicos` | Aba de serviços sempre vazia ao editar |
| `pages/operacao/OrdemServicoForm.jsx:1149` | `delete` `os_servicos` | No-op silencioso |
| `pages/operacao/OrdemServicoDetalhes.jsx:45` + `components/OrdemServicoDetalhes.jsx:44` | `select` `os_servicos` | Detalhe não mostra serviços |
| `pages/Dashboard.jsx:65` | `select` `ordem_servico_servicos` | Ranking de serviços do dashboard quebrado |
| `components/OSRelatorio.jsx:52` | join aninhado `ordem_servico_servicos` | **Relatório da OS falha por inteiro** (join inválido derruba a query) |

- DB hoje só guarda **um** serviço por OS, via `ordens_servico.servico_id` (FK única). Não há itens, não há JSON.
- Existe `os_servicos_extras` (conceito diferente — serviços EXTRAS, schema `servico_extra_id` + valor venda/custo, 0 linhas). **Não confundir** com `os_servicos`.
- 752 OS em produção; nenhuma com lista de serviços persistida.

**Fix proposto (pendente OK do Carlos):**
1. Migration: `CREATE TABLE os_servicos (id uuid pk, ordem_servico_id uuid FK→ordens_servico, servico_id uuid FK→servicos, descricao text, quantidade numeric, valor_unitario numeric, valor_total numeric, created_at)` + RLS + índices. FKs são necessárias pros joins aninhados do PostgREST.
2. Padronizar código: trocar os 2 usos de `ordem_servico_servicos` (Dashboard, OSRelatorio) por `os_servicos`.
3. Opcional: passar a checar `error` nessas queries pra não falhar em silêncio de novo.

### 6.5 Features prontas no DB sem UI no frontend

> 19 tabelas existem no banco mas nenhum `.from(...)` no `src/` as toca.
> Indica feature roadmap parado / scope cortado / criação especulativa.

**Operação avançada**
- `agendamentos` — agenda paralela às OS?
- `assinaturas` — versão genérica vs `os_assinaturas` específica.
- `os_acompanhamento_checklist`, `os_acompanhamento_fotos` — completar o diário de obra (já existe `os_acompanhamento_diario` + `os_acompanhamento_equipe`).
- `os_custos` — custos consolidados por OS.
- `os_pausas` — registro estruturado de pausas (hoje só catálogo em `motivos_pausa`).
- `os_servicos_extras` — extras vinculados a OS (front usa só `os_custos_extras`).
- `checkin_liberacoes` — workflow de aprovação manual de check-in.

**Comunicação / experiência**
- `chat_conversas`, `chat_mensagens` — chat interno entre gestor e técnico.
- `notificacoes` — notificações in-app / push.
- `pesquisas_satisfacao` — NPS pós-obra.

**Checklists alternativos** (paralelos a `checklist_modelos`)
- `checklists`, `checklist_itens`, `checklist_respostas` — estrutura mais nova? Decidir qual vai vencer.

**Financeiro**
- `pagamentos_colaboradores` — folha de pagamento dos técnicos.

**Cadastros auxiliares (usados por views)**
- `tipos_custo`, `tipos_telhado` — categorização pra DRE/relatórios.

**Auditoria**
- `logs_atividade` — log estruturado de ações dos usuários.

### 6.6 Views consolidadas no banco (10)

Disponíveis no Postgres, **podem ser consumidas direto pelo frontend** via
`supabase.from('vw_<nome>').select('*')`. Algumas já vão direto pra dashboards.

| View | O que entrega |
|---|---|
| `vw_checkins_em_andamento` | Lista de OS com check-in aberto (sem checkout) |
| `vw_os_disponiveis_checkin` | OS aptas a receber check-in agora |
| `vw_custos_os_rateado` | Custos rateados por OS |
| `vw_custos_por_cliente` | Custo agregado por cliente |
| `vw_custos_por_faixa_placas` | Custo segmentado por faixa (tamanho da usina) |
| `vw_custos_por_telhado` | Custo segmentado por `tipos_telhado` |
| `vw_diarias_colaborador` | Diárias trabalhadas por colaborador |
| `vw_dre_plano_contas` | DRE alinhado ao plano de contas (alimenta `DREObras.jsx`?) |
| `vw_fluxo_caixa` | Fluxo de caixa consolidado |
| `vw_os_financeiro` | Resultado financeiro por OS |
| `vw_os_rateio` | Rateio de custos entre OS |
| `vw_resumo_financeiro` | KPIs financeiros agregados |

---

## 7. Capacidades funcionais (o que o app faz)

### 7.1 Gestão de Ordens de Serviço (núcleo)
- Criar / editar / detalhar / arquivar OS (`ativo` + soft-delete via `deletado`).
- Atribuir cliente, equipe, veículos, serviços, colaboradores extras.
- **Diário de obra** dia a dia (`os_acompanhamento_diario`) com:
  - Equipe presente (`os_acompanhamento_equipe`)
  - Fotos
  - Checklist do dia
  - Motivo de pausa (catálogo `motivos_pausa`)
- Checklists vinculados (modelos pré-criados, tipos: início, fim, diário, avulso).
- Anexos (storage `anexos` / `uploads`).
- Assinaturas digitais via `SignaturePad`.
- Histórico de alterações (`os_alteracoes_log`, `os_historico`).
- Relatório final em PDF (jsPDF + html2canvas).
- Previsão de dias por OS (`previsao_dias`).

### 7.2 Mobile do colaborador (PWA)
- Login específico em `/colaborador/login` (separado do gestor).
- `/colaborador/minhas-os` lista as OS atribuídas.
- Check-in / check-out de presença (`os_checkins`, config em `checkin_config`).
- Manifest com `start_url=/colaborador/login` — atalho na home do celular cai direto na visão do técnico.

### 7.3 Dashboard
- KPIs: OS por status, atrasos, próximas, ranking de serviços.
- Gráficos (BarChart, PieChart, LineChart — recharts).
- Filtros por equipe / cliente / período.

### 7.4 Calendário
- `/calendario` — visão temporal das OS por equipe (cor da equipe vem do cadastro).

### 7.5 Aprovações (workflow)
- `os_aprovacoes` — solicitações pendentes (edição de OS sensível, deleção, etc.).
- Status: `pendente`, `aprovada`, `rejeitada`.
- Apenas superadmin (`is_admin=true` no `perfil_acesso`) aprova/rejeita com motivo.

### 7.6 Check-ins (controle de presença)
- `/checkins` — dashboard agregando entradas/saídas registradas pelo mobile.
- Configuração de regras em `checkin_config`.

### 7.7 Custos de equipe
- `/custos-equipe` — consolidação de custos por colaborador/equipe.

### 7.8 Relatórios
- **Relatórios consolidados** (`/relatorios`) — visões agregadas de OS.
- **Relatórios de Obra** (`/relatorios-obra`, `relatorios_obra` + seções + itens + fotos) — relatório técnico/fotográfico estruturado.
- **Relatórios de Checklist** (`/relatorios-checklist`) — execuções dos checklists.
- **DRE de Obras** (`relatorios/DREObras.jsx`) — demonstrativo financeiro por obra.

### 7.9 Propostas comerciais
- CRUD de propostas (`/propostas`, `/proposta/nova`, `/proposta/:id`).
- Itens tipados (material, mão de obra, serviço, outros).
- Tipos de serviço pré-definidos (padrão entrada, instalação fotovoltaica, estrutura metálica, manutenção, outro).
- Fotos da proposta (storage `propostas`).
- Geração de PDF (jsPDF + html2canvas).
- Compartilhamento: WhatsApp / Email (botões dedicados).
- Modelos reutilizáveis (`proposta_modelos`).

### 7.10 Financeiro
- Visão geral com KPIs (receitas, despesas, saldo, fluxo).
- Lançamentos manuais (entrada / saída) com categoria + forma de pagamento.
- Contas bancárias (`contas_bancarias`) — saldo, transações (`transacoes_bancarias`).
- **Importação OFX** (`/financeiro/importar-ofx`): parser próprio em `src/lib/ofxParser.js`
  - Trata SGML → XML
  - Extrai header, conta, transações, saldo
  - Fallback de parsing manual
  - Histórico de importações em `importacoes_ofx`
- Plano de contas hierárquico (`plano_contas`).
- Categorias e formas de pagamento (`categorias_financeiras`, `formas_pagamento`).
- Vínculo com clientes (`lancamento_clientes`).

### 7.11 Cadastros mestres
Todos com listagem + form de edição:
- Colaboradores (com certificados e EPIs)
- Clientes (com múltiplos endereços)
- Funções
- Equipes (com membros)
- Serviços / Serviços extras
- Veículos
- Empresas contratantes
- Modelos de checklist (+ itens)
- Modelos de proposta
- Motivos de pausa
- Faixas de preço (venda + custo)

### 7.12 Usuários e permissões
- Usuários (`usuarios`) vinculados a `auth.users` do Supabase.
- Perfis de acesso (`perfis_acesso`) com `is_admin` booleano.
- Permissões por módulo (lista de módulos hardcoded em `PerfisAcesso.jsx`: dashboard, ordens_servico, calendario, financeiro, relatorios, colaboradores, clientes, equipes, servicos, …).
- Tabela `permissoes` armazena a matriz módulo×ação.
- Convites por email com link de ativação (`/aceitar-convite`).

---

## 8. Estado do código — pontos de atenção

> Lista de **dívidas técnicas e inconsistências** detectadas na varredura. Atualizar
> à medida que forem resolvidas.

### 8.1 Repositório (CORRIGIDO 2026-06-01 após investigação)
- ✅ **GitHub é a fonte de verdade e está saudável.** Histórico completo, último commit `25a1576` (2026-03-27), auto-deploy pro Vercel funcionando.
- ✅ **Clone de desenvolvimento criado em `~/dev/gestao-obras-solar`.** Working tree limpo. **Desenvolver SEMPRE aqui** (regra drive-safety).
- ⚠️ **O git da pasta no Drive está quebrado/vazio** (`git init` nunca commitado, tinha `.lock` órfãos de operação interrompida pelo I/O do Drive). Os locks foram removidos, mas `git fetch` no Drive **trava** (timeout de I/O). **Não tentar operar git no Drive.**
- ✅ **Conteúdo do Drive é idêntico ao GitHub** (diff de `src/`, configs e `sql/` só acusou `.DS_Store`). A pasta do Drive é um espelho — não há trabalho perdido.
- [ ] **`.DS_Store` está versionado no repo** (6 arquivos) e **falta no `.gitignore`** (que só tem `node_modules`, `.env`, `.env.local`, `dist`). Limpar: `git rm --cached **/.DS_Store` + adicionar `.DS_Store` ao `.gitignore`. Fazer no clone `~/dev`.
- [ ] **CAPABILITIES.md + CLAUDE.md** (criados nesta sessão) vivem hoje só no Drive. Pra versionar, copiar pro clone `~/dev` e Carlos commita de lá.

### 8.2 🚨 SEGURANÇA — CRÍTICO (confirmado 2026-06-01)

> **Banco inteiro exposto à internet pública.** A anon key vai no bundle JS público;
> com RLS `USING (true)` em tudo, qualquer pessoa (sem login) lê — e provavelmente
> escreve — qualquer tabela. **Prova empírica** (anon key, sem auth): `lancamentos_financeiros`
> 372 linhas (HTTP 200), `lancamentos` 1.586, `contas_bancarias` 1, `colaboradores` 42 (com CPF),
> `clientes` 188. Não é só "colaborador vê financeiro" — é vazamento total + risco de escrita.

- 🟡 **Fase 0 aplicada (2026-06-01):** tabelas financeiras/banco trancadas pra `authenticated` (lancamentos, lancamentos_financeiros, lancamento_clientes, contas_bancarias, transacoes_bancarias, importacoes_ofx, plano_contas [RLS estava OFF], categorias_financeiras, formas_pagamento, pagamentos_colaboradores). Migration: `sql/2026-06-01-rls-fase0-financeiro.sql`. **Provado:** anônimo agora recebe `[]` nessas tabelas; tabelas do colaborador seguem 200. **Falta confirmar (não provado ao vivo, API instável na sessão):** gestor logado ainda lê o financeiro — Carlos confere abrindo `/financeiro` logado.
- 🟡 **Fase 3-parcial aplicada (2026-06-01):** trancadas mais tabelas só-do-gestor (propostas+itens/fotos/modelos, faixas_preco_venda/custo, servicos_extras, usuarios, perfis, perfis_acesso, permissoes, relatorios_obra+secoes/itens/fotos). Migration `sql/2026-06-01-rls-fase3-parcial.sql`. Provado: anônimo recebe `[]`; app do colaborador intacto.
- ✅ **Fase 4 aplicada (2026-06-01):** RBAC de rota. `PrivateRoute` redireciona sessão de colaborador (email `@gestao-obras.local`) pra `/colaborador/minhas-os`; rotas `/colaborador/*` desconhecidas não caem mais no dashboard do gestor. Verificado em produção (commit `ef17ada`).
- [ ] 🚨 **Ainda abertas ao anônimo (até o cutover do login):** `ordens_servico`, `clientes`, `equipes`, `veiculos`, `servicos`, `empresas_contratantes`, `colaboradores` e os `os_*` que o colaborador lê/joina. Só dá pra trancar depois que o colaborador tiver sessão real (Fase 1-2). Senão trava o campo.
- ✅ **Hardening gestor-only (2026-06-01):** as 25 tabelas das Fases 0/3-parcial passaram de `TO authenticated` para **só-gestor** (filtro `auth.jwt()->>'email' NOT LIKE '%@gestao-obras.local'`). Migration `sql/2026-06-01-rls-gestor-only.sql`. **Provado:** colaborador autenticado (ALEX) agora recebe 0 linhas no financeiro/usuarios/perfis; anônimo bloqueado; gestor (email real) passa. Defesa em profundidade — não depende só da Fase 4.
- ✅ **Provisionamento (passo 1 do cutover) FEITO:** 38/41 colaboradores criados no Supabase Auth (email `colab.<cpf>@gestao-obras.local`, senha inicial=CPF, `auth_user_id` preenchido). Login CPF+senha **testado e funcionando** (ALEX). Faltam 3 por dado ruim (ver abaixo).
- ⏳ **Falta:** (a) conectar o `ColaboradorLogin.novo.jsx` (push = cutover do login — fecha o leak de CPFs do login antigo); (b) limpar CPF de ~6 colaboradores antes/depois; (c) Fase 3-full: trancar `ordens_servico`/`clientes`/`os_*` com escopo (gestor vê tudo, colaborador só as OS dele) — só depois do login novo no ar.
- ⚠️ **Dado ruim a corrigir no cadastro** (impedem login do colaborador): Ana Flavia (sem CPF); JAMILLE × "Adalberto xxxx xxxxx" (CPF 02163337251 duplicado); Adem/Ely/Marcus (CPF com 10 dígitos — placeholder); "Henrique da Conceicao Jordao" 5455236522 (parece duplicata do Henrique 01170089232).
- [ ] 🚨 **Login do colaborador inseguro** (`ColaboradorLogin.jsx`): baixa TODOS os colaboradores + CPF pro navegador via anon, e usa **CPF como senha** (CPF não é segredo). Sessão é só `localStorage`, sem Supabase Auth.
- [ ] 🚨 **Sem RBAC nas rotas** (`App.jsx`): `PrivateRoute` checa só `user` autenticado, não papel. `is_admin` existe no `AuthContext` mas não gateia nenhuma rota — qualquer usuário logado vê o Dashboard com faturamento/recebimento.
- ⚠️ **Trade-off do fix:** trancar a RLS pra `authenticated` **quebra o app do colaborador** (ele não tem sessão de auth). Fix correto exige repensar o login do colaborador (auth real / magic-link / edge function) e proteção a nível de coluna nos campos financeiros de `ordens_servico` (valor_obra, valor_cobrado, margem, custo). É projeto, não one-liner — **decidir abordagem com Carlos antes de aplicar em produção.**
- [ ] **Anon key hardcoded** em `src/lib/supabase.js` — hygiene; mover pra `.env` NÃO resolve segurança (a key é pública por design). O que protege é a RLS.
- [ ] `manifest.json` aponta `start_url=/colaborador/login` — gestor que instalar o PWA cai na tela errada.

### 8.3 Duplicações
- ✅ `src/components/OSChecklist (1).jsx` — cópia órfã (zero imports). **Removida 2026-06-01** (clone ~/dev).
- ✅ `.DS_Store` versionado + ausente do `.gitignore` — **desrastreado + `.gitignore` corrigido** 2026-06-01.
- [ ] Tabelas `os` vs `ordens_servico` — `os` não existe no banco; eram só matches de prefixo. Confirmado: app usa `ordens_servico`.
- [ ] Tabelas `lancamentos` (1.586) vs `lancamentos_financeiros` (372) — **ambas existem e têm dados**. Auditar qual é a canônica.
- [ ] Pastas `configuracoes/` e `usuarios/` ambas têm `Usuarios.jsx`. Só `usuarios/Usuarios.jsx` está no router atual.

### 8.4 Status de MCP (resolvido 2026-06-01)
- ✅ **MCP `supabase-obras`** conectado (ref `ebpxqmakimkvqoqwfeeh`, scope user). Tools ativam ao reiniciar a sessão.
- ✅ **MCP Vercel** autenticado (OAuth). Project `gestao-obras-solar-obwu`.
- [ ] **MCP GitHub** ainda falha conexão — usar `gh` CLI direto.
- ℹ️ MCP `supabase` legado (`aqncmhnevqmugqnsqdtf`) é do **Full Manager** — ignorar neste projeto.

### 8.5 Convenções
- Type `"commonjs"` em `package.json` num projeto Vite/ESM — funciona porque Vite ignora, mas é confuso. Trocar pra `"type": "module"` (ou remover).
- Sem testes (`npm test` ainda é placeholder).
- Sem lint configurado.
- Pastas `Logo/`, `dist/`, PDFs e DOCX soltos no root — provavelmente devem entrar no `.gitignore`.

---

## 9. Como Claude deve usar este arquivo

1. Em qualquer sessão nova, **ler este `CAPABILITIES.md` antes de propor mudança**.
2. Confirmar contra o código se a capacidade descrita ainda existe (memória pode estar atrás do código).
3. Ao adicionar/remover módulo, **atualizar este arquivo no mesmo commit**.
4. Ao tocar em tabela do banco, atualizar a seção 6.
5. Em dúvida sobre Supabase MCP / Vercel MCP / GitHub MCP, conferir seção 3 antes.

---

## 10. Convenções deste projeto

- Sem PR — merge direto no `main`, push manual (Carlos).
- Code review automático **só pra lógica de negócio**, não pra config.
- Frontend é cliente fino; toda autorização real fica no Supabase RLS (que hoje está permissivo — ver 8.2).
- Tudo em **português** (UI, labels, mensagens).
