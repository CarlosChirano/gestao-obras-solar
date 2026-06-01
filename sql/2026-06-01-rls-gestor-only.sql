-- RLS — endurecer tabelas só-do-gestor de "qualquer autenticado" para "só gestor".
-- Motivo: após o cutover, colaboradores terão sessão real (role=authenticated). Policies
-- 'TO authenticated' deixariam o colaborador LER o financeiro/propostas/usuarios via API
-- (mesmo com a tela bloqueada pela Fase 4). Provado: colaborador logado lia lancamentos.
-- Gestor tem email real; colaborador tem email sintético colab.<cpf>@gestao-obras.local.
-- Predicado: bloqueia quem tem email @gestao-obras.local. Anon segue negado (TO authenticated).
-- Aplicada em produção (ebpxqmakimkvqoqwfeeh) em 2026-06-01.

DO $$
DECLARE
  t text; p record;
  tabelas text[] := ARRAY[
    -- Fase 0 (financeiro/banco)
    'lancamentos','lancamentos_financeiros','lancamento_clientes','contas_bancarias',
    'transacoes_bancarias','importacoes_ofx','plano_contas','categorias_financeiras',
    'formas_pagamento','pagamentos_colaboradores',
    -- Fase 3-parcial (só-gestor)
    'propostas','proposta_itens','proposta_fotos','proposta_modelos',
    'faixas_preco_venda','faixas_preco_custo','servicos_extras',
    'usuarios','perfis','perfis_acesso','permissoes',
    'relatorios_obra','relatorio_secoes','relatorio_itens','relatorio_fotos'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    FOR p IN SELECT polname FROM pg_policy WHERE polrelid = ('public.'||t)::regclass LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.polname, t);
    END LOOP;
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (coalesce(auth.jwt()->>''email'','''') NOT LIKE ''%%@gestao-obras.local'') '
      || 'WITH CHECK (coalesce(auth.jwt()->>''email'','''') NOT LIKE ''%%@gestao-obras.local'')',
      t||'_gestor_only', t
    );
  END LOOP;
END $$;
