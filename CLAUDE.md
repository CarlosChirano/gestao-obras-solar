# gestao-obras-solar (SolarSync) — Instruções Claude Code

> Este arquivo carrega automaticamente em TODA sessão neste projeto.
> Última atualização: 2026-06-01

## OBRIGATÓRIO antes de qualquer trabalho

**Leia `CAPABILITIES.md` na raiz do projeto.** É o mapa completo das funcionalidades
do app, das rotas, das 57 tabelas Supabase em uso, dos pontos de atenção e dos
gotchas (MCPs que precisam reauth, anon key hardcoded, RLS permissivo, duplicações).

Se o `CAPABILITIES.md` parecer desatualizado em relação ao código, atualize-o
**no mesmo commit** da mudança que detectou a divergência.

## Quem é o app

**SolarSync** — sistema de gestão de obras solares da Critéria Energia.
SPA React 19 + Vite, backend Supabase (auth + Postgres + Storage), deploy Vercel.

Stack-resumo, schema, módulos, rotas, capacidades → ver `CAPABILITIES.md`.

## Quem é o usuário

Carlos Chirano — empresário Critéria Energia (Manaus/AM). Não é dev de formação,
programa com IA. Perfil completo no `~/.claude/CLAUDE.md`.

## Regras de ouro deste projeto

1. **Git manual.** NUNCA `git commit` / `git push` automático. Carlos commita.
2. **Sem PR** — merge direto no `main`. Mas no momento o repo **ainda não tem o 1º commit** (ver CAPABILITIES seção 8.1).
3. **NUNCA `npm install` aqui dentro.** O projeto vive no Google Drive — instalar deps no Drive já fritou o PC do Carlos antes. Para desenvolver, clonar em `~/dev/gestao-obras-solar` e trabalhar lá. Ver `~/.claude/rules/drive-safety.md`.
4. **Tudo em português** — UI, labels, mensagens de toast, commits.
5. **Code review por complexidade:** trivial (config, schema, rename) inline; lógica de negócio → subagent reviewer obrigatório antes de marcar pronto.

## MCPs deste projeto

| MCP | Status hoje | Como usar |
|---|---|---|
| Supabase | precisa reauth | Banco do app (ref `ebpxqmakimkvqoqwfeeh`). MCP aponta pra outro project (`aqncmhnevqmugqnsqdtf`) — **conferir** antes de aplicar migration. |
| Vercel | precisa reauth | Deploy. Project `gestao-obras-solar` (`prj_E1NOwIjo7AvBEqBYomzAhQk13hL3`). |
| GitHub | falhou | Usar `gh` CLI direto enquanto não restaurar. Remote: `CarlosChirano/gestao-obras-solar`. |
| basic-memory, claude-mem, context-mode, canva | conectados | Disponíveis. |

## Stack rápido

- React 19, Vite 7, Tailwind 4
- Supabase JS 2 (auth + Postgres + Storage `uploads`, `anexos`, `propostas`)
- React Router 7, React Query 5, React Hook Form + Zod
- jsPDF + html2canvas pra relatórios e propostas em PDF
- Parser OFX próprio em `src/lib/ofxParser.js`

## O que NÃO fazer

- Não rodar `npm install` dentro do Drive.
- Não commitar `node_modules/`, `dist/`, `.DS_Store`, ou PDFs/DOCX do root sem antes ajustar `.gitignore`.
- Não mover o anon key do `src/lib/supabase.js` pra `.env` sem confirmar com Carlos (mexe na config do Vercel também).
- Não confundir `os` com `ordens_servico` nem `lancamentos` com `lancamentos_financeiros` — auditar uso antes de migrar.
- Não assumir RBAC enforçado no banco — policies RLS hoje são `USING (true)`. Qualquer mudança sensível precisa pensar em RLS junto.

## Convenções

- Frontmatter / docs em PT-BR.
- Sentence case em títulos.
- Datas ISO 8601 (`YYYY-MM-DD`).
- Componentes em PascalCase.
- Sem comentários explicando o quê — só o porquê quando não-óbvio.

## Pendências conhecidas

Lista viva em `CAPABILITIES.md` seção 8. Resumo:

- 1º commit ainda pendente
- Anon key hardcoded
- RLS permissivo
- Duplicações (`OSChecklist (1).jsx`, `os` vs `ordens_servico`, etc.)
- MCPs Supabase + Vercel precisam reauth
