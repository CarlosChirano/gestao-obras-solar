#!/usr/bin/env node
// Provisionamento dos colaboradores no Supabase Auth (passo do CUTOVER da Fase 1).
//
// Para cada colaborador ATIVO com CPF, cria (idempotente) um usuário Supabase Auth:
//   email    = colab.<digitos_cpf>@gestao-obras.local
//   password = CPF (só dígitos)            <- senha inicial; gestor troca depois
//   email_confirm = true
// e grava colaboradores.auth_user_id. Não baixa nada pro cliente — roda server-side.
//
// COMO RODAR (no cutover, fora do Drive, com a service_role em env — NUNCA commitar a chave):
//   export SUPABASE_URL="https://ebpxqmakimkvqoqwfeeh.supabase.co"
//   export SUPABASE_SERVICE_ROLE_KEY="<service_role>"   # pega no painel Supabase
//   node scripts/provisionar-colaboradores.mjs
//
// Requer: npm i @supabase/supabase-js  (rodar em ~/dev, nunca no Drive)

import { createClient } from '@supabase/supabase-js'

const URL = process.env.SUPABASE_URL
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !SERVICE_ROLE) {
  console.error('Faltam SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no ambiente.')
  process.exit(1)
}

const admin = createClient(URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const emailDoColaborador = (cpf) => `colab.${String(cpf || '').replace(/\D/g, '')}@gestao-obras.local`

async function main() {
  const { data: colaboradores, error } = await admin
    .from('colaboradores')
    .select('id, nome, cpf, auth_user_id, ativo')
    .eq('ativo', true)
  if (error) throw error

  let criados = 0, jaTinham = 0, semCpf = 0, erros = 0
  for (const c of colaboradores) {
    const cpf = String(c.cpf || '').replace(/\D/g, '')
    if (!cpf) { semCpf++; console.warn(`SEM CPF: ${c.nome} (${c.id})`); continue }
    if (c.auth_user_id) { jaTinham++; continue }

    const email = emailDoColaborador(cpf)
    try {
      const { data: created, error: cErr } = await admin.auth.admin.createUser({
        email,
        password: cpf,            // senha inicial = CPF
        email_confirm: true,
        user_metadata: { colaborador_id: c.id, nome: c.nome },
      })
      if (cErr) {
        // pode já existir de uma execução anterior — tenta achar e religar
        throw cErr
      }
      const { error: upErr } = await admin
        .from('colaboradores')
        .update({ auth_user_id: created.user.id })
        .eq('id', c.id)
      if (upErr) throw upErr
      criados++
      console.log(`OK: ${c.nome} -> ${email}`)
    } catch (e) {
      erros++
      console.error(`ERRO ${c.nome} (${email}): ${e.message || e}`)
    }
  }
  console.log(`\nResumo: criados=${criados} jaTinham=${jaTinham} semCpf=${semCpf} erros=${erros} total=${colaboradores.length}`)
}

main().catch((e) => { console.error(e); process.exit(1) })
