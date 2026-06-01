-- RLS Fase 3 (parcial) — trancar tabelas SÓ-DO-GESTOR que ainda estavam abertas ao anônimo.
-- Seguro mesmo SEM o cutover do login do colaborador, porque:
--  - Fluxos públicos (login/convite/redefinir senha) não leem tabela nenhuma (só supabase.auth).
--  - App do colaborador (anon) lê só: colaboradores, os_checkins, os_checklists,
--    os_checklist_itens, os_anexos, os_colaboradores, checkin_config, anexos(storage).
--  - AuthContext lê usuarios/perfis/colaboradores apenas COM sessão (gestor autenticado).
-- Por isso ficam de FORA aqui (só no cutover): ordens_servico, clientes, equipes, veiculos,
--  servicos, empresas_contratantes e os_* lidas/joinadas pelo colaborador.
-- Aplicada em produção (ebpxqmakimkvqoqwfeeh) em 2026-06-01.

DO $$
DECLARE
  t text; p record;
  tabelas text[] := ARRAY[
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
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',
      t||'_authenticated_all', t
    );
  END LOOP;
END $$;
