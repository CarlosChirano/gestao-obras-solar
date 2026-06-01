# Remediação de segurança — gestão de obras (SolarSync)

> Iniciado 2026-06-01. App em produção (752 OS, 42 colaboradores em campo).
> Princípio: **app nunca quebrada**; cutover do login do colaborador é coordenado.

## Problema (confirmado)

Anon key é pública (vai no bundle JS). Com RLS `USING (true)` em tudo, qualquer
pessoa sem login lia/escrevia o banco. Prova (anon, sem auth): lancamentos_financeiros
372 linhas, lancamentos 1.586, contas_bancarias 1, colaboradores 42 (com CPF), clientes 188.

Causas:
1. RLS permissiva (`USING true`) em todas as tabelas.
2. Login do colaborador inseguro: baixa todos os CPFs pro browser, usa CPF como senha, sem sessão real (só localStorage).
3. Sem RBAC nas rotas: qualquer logado vê o dashboard do gestor (faturamento).

## Decisões do Carlos

- Login do colaborador deve ser **fácil pro campo**: **CPF + senha** (não email/OTP).
- Fazer o **fix completo** (não só mitigação).

## Plano faseado

### Fase 0 — Trancar financeiro (FEITO 2026-06-01)
- RLS `authenticated` nas tabelas financeiras/banco. Migration `sql/2026-06-01-rls-fase0-financeiro.sql`.
- Provado: anônimo bloqueado (`[]`); colaborador intacto. Falta Carlos confirmar gestor logado lê `/financeiro`.

### Fase 1 — Login seguro do colaborador (CPF + senha, sessão real)
- **Desenho:** cada colaborador vira um usuário Supabase Auth, email sintético `colab.<digitos_cpf>@gestao-obras.local` + senha real. `colaboradores.auth_user_id` liga os dois.
- Login: form pede CPF + senha; deriva o email **localmente** (sem baixar lista de CPFs) e chama `signInWithPassword`. Sessão real → RLS protege.
- **Decisões do Carlos:** senha definida pelo gestor no cadastro (modelo contínuo); migração dos 42 existentes = **senha inicial = CPF + sessão real** (ninguém trava na virada; gestor troca depois). Fazer cutover assim que API de Auth estável + equipe avisada.

**PREPARADO nesta sessão (inerte, não conectado):**
- ✅ Coluna `colaboradores.auth_user_id` (+ índice) criada em prod.
- ✅ `src/pages/colaborador/ColaboradorLogin.novo.jsx` — login novo (CPF+senha, sem leak de CPF). **Não importado** ainda.
- ✅ `scripts/provisionar-colaboradores.mjs` — cria os 42 no Auth (senha inicial=CPF) e preenche `auth_user_id`. Lê service_role de env. **Não executado** ainda.

**Passos do CUTOVER (coordenado, quando API estável + equipe avisada):**
1. Rodar `scripts/provisionar-colaboradores.mjs` (em ~/dev, service_role em env). Verificar `auth_user_id` preenchido nos 42.
2. Conectar o login novo: substituir `ColaboradorLogin.jsx` pelo `.novo.jsx` (ou ajustar o import no App.jsx) e push.
3. Testar login real de um colaborador (CPF+senha) + check-in/out de ponta a ponta.
4. Só então Fase 3 (trancar o resto da RLS + escopo por colaborador). NUNCA trancar antes do passo 1+3 validados.
5. Construir reset de senha pelo gestor no cadastro (edge function / RPC com service_role) — substitui a senha-inicial=CPF.

### Fase 2 — Cutover do colaborador
- Migrar colaboradores pro login novo, comunicar a equipe, then remover o login antigo (que baixava CPFs).

### Fase 3 — Trancar o resto da RLS
- `authenticated` + escopo por linha (colaborador vê só as OS dele via `os_colaboradores`/`auth.uid()`).
- Proteção de coluna nos campos financeiros de `ordens_servico` (valor_obra, valor_cobrado, margem_prevista, custo_previsto) — via view ou column privileges — pra colaborador não ver valores.

### Fase 4 — RBAC nas rotas
- `PrivateRoute` passa a checar papel (`is_admin`/`perfil_acesso`). Colaborador não acessa `/`, `/financeiro`, etc.

## Pendências de limpeza
- Possível usuário Auth órfão de teste (`rls-verify-temp-*@example.com`) criado na verificação da Fase 0 quando a API estava instável — apagar quando o Management API responder.
