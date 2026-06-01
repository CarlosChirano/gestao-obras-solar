-- RLS Fase 0 — trancar tabelas financeiras/banco para exigir login (authenticated)
-- Contexto: anon key é pública (vai no bundle) e a RLS estava USING(true) => banco
-- financeiro inteiro legível por qualquer um sem login. Esta fase fecha o pior
-- vazamento sem afetar o app do colaborador (ele NÃO lê nenhuma tabela financeira)
-- nem o gestor (que tem sessão autenticada).
-- Aplicada em produção (ebpxqmakimkvqoqwfeeh) em 2026-06-01.
-- Modelo: RLS ligada + única policy FOR ALL TO authenticated. Sem policy para o
-- role anon => anônimo é negado por padrão (deny). Reversível.

DO $$
DECLARE
  t text;
  p record;
  tabelas text[] := ARRAY[
    'lancamentos','lancamentos_financeiros','lancamento_clientes',
    'contas_bancarias','transacoes_bancarias','importacoes_ofx',
    'plano_contas','categorias_financeiras','formas_pagamento',
    'pagamentos_colaboradores'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    -- garante RLS ligada (plano_contas estava OFF)
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- remove todas as policies existentes (incl. as permissivas USING(true))
    FOR p IN SELECT polname FROM pg_policy WHERE polrelid = ('public.'||t)::regclass LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', p.polname, t);
    END LOOP;
    -- cria política única: só autenticado acessa (anon fica sem policy => negado)
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t||'_authenticated_all', t
    );
  END LOOP;
END $$;
