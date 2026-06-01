-- Migration: cria tabela os_servicos (linha de serviços de uma OS)
-- Contexto: a feature de "múltiplos serviços por OS" (aba Serviços do OrdemServicoForm)
-- escrevia/lia de os_servicos / ordem_servico_servicos, mas a tabela nunca existia —
-- serviços digitados nunca eram salvos (erro ignorado) e o relatório da OS quebrava.
-- Aplicada em produção (project ebpxqmakimkvqoqwfeeh) em 2026-06-01.
-- NÃO confundir com os_servicos_extras (serviços EXTRAS, schema diferente).

CREATE TABLE IF NOT EXISTS os_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ordem_servico_id uuid NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  servico_id uuid REFERENCES servicos(id) ON DELETE SET NULL,
  descricao text,
  quantidade numeric DEFAULT 1,
  valor_unitario numeric DEFAULT 0,
  valor_total numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE os_servicos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura os_servicos" ON os_servicos;
DROP POLICY IF EXISTS "Permitir insert os_servicos" ON os_servicos;
DROP POLICY IF EXISTS "Permitir update os_servicos" ON os_servicos;
DROP POLICY IF EXISTS "Permitir delete os_servicos" ON os_servicos;
CREATE POLICY "Permitir leitura os_servicos" ON os_servicos FOR SELECT USING (true);
CREATE POLICY "Permitir insert os_servicos"  ON os_servicos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir update os_servicos"  ON os_servicos FOR UPDATE USING (true);
CREATE POLICY "Permitir delete os_servicos"  ON os_servicos FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_os_servicos_os ON os_servicos(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_servicos_servico ON os_servicos(servico_id);
