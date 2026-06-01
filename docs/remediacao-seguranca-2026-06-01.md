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

**Fase 3-parcial (FEITO 2026-06-01):** trancadas tabelas só-do-gestor que não dependem
do login do colaborador — propostas*, faixas_preco_*, servicos_extras, usuarios, perfis,
perfis_acesso, permissoes, relatorios_obra*. Migration `sql/2026-06-01-rls-fase3-parcial.sql`.
Provado anônimo bloqueado. Faltam (até o cutover): ordens_servico, clientes, equipes,
veiculos, servicos, empresas_contratantes, colaboradores e os_* lidas pelo colaborador.

**Fase 4 (FEITO 2026-06-01):** RBAC de rota (commit ef17ada). Colaborador não acessa
área do gestor. Verificado em produção.

### Provisionamento (passo 1 do cutover) — runbook pro Carlos
A Management API `/api-keys` estava com rate-limit e o agente não conseguiu a service_role.
Rodar você mesmo, no terminal do Mac (fora do Claude — `npm install` no Drive é bloqueado,
mas o clone em ~/dev é fora do Drive):

```bash
cd ~/dev/gestao-obras-solar
git pull
npm install
export SUPABASE_URL="https://ebpxqmakimkvqoqwfeeh.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service_role do painel: Settings > API>"
node scripts/provisionar-colaboradores.mjs
```
Esperado: `criados=42 ... erros=0`. Depois me diz o resultado — aí eu conecto o login novo
(push) e a gente testa o login real de 1 colaborador antes de trancar o resto.

> Se o script reclamar que email `.local` é inválido, me avisa: troco o esquema de email
> nos dois lados (script + ColaboradorLogin.novo.jsx) e você roda de novo.

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
