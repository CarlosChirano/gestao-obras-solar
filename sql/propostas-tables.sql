-- ============================================
-- MÓDULO DE PROPOSTAS COMERCIAIS
-- ============================================

-- 1. Modelos de Proposta (templates)
CREATE TABLE IF NOT EXISTS proposta_modelos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  condicoes_pagamento TEXT,
  texto_garantia TEXT,
  validade_dias INTEGER DEFAULT 30,
  observacoes TEXT,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 2. Propostas
CREATE TABLE IF NOT EXISTS propostas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  numero TEXT NOT NULL UNIQUE,
  status TEXT DEFAULT 'rascunho',

  -- Empresa Emissora
  empresa_id UUID REFERENCES empresas_contratantes(id),

  -- Destinatário
  destinatario_tipo TEXT DEFAULT 'cliente_final',
  cliente_id UUID REFERENCES clientes(id),
  destinatario_nome TEXT,
  destinatario_cpf_cnpj TEXT,
  destinatario_telefone TEXT,
  destinatario_email TEXT,
  destinatario_endereco TEXT,
  destinatario_cidade TEXT,
  destinatario_estado TEXT,
  destinatario_cep TEXT,

  -- Dados da Obra
  tipo_servico TEXT,
  endereco_obra TEXT,
  cidade_obra TEXT,
  estado_obra TEXT,
  potencia_kwp NUMERIC(10,2),
  quantidade_placas INTEGER,
  prazo_execucao TEXT,

  -- Condições
  condicoes_pagamento TEXT,
  texto_garantia TEXT,
  validade_dias INTEGER DEFAULT 15,
  observacoes TEXT,

  -- Valores
  valor_total NUMERIC(12,2) DEFAULT 0,
  desconto NUMERIC(12,2) DEFAULT 0,

  -- Referências
  modelo_id UUID REFERENCES proposta_modelos(id),

  -- Controle
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now(),
  enviado_em TIMESTAMPTZ,
  aprovado_em TIMESTAMPTZ,
  recusado_em TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_propostas_numero ON propostas(numero);
CREATE INDEX IF NOT EXISTS idx_propostas_status ON propostas(status);
CREATE INDEX IF NOT EXISTS idx_propostas_empresa ON propostas(empresa_id);

-- 3. Itens da Proposta
CREATE TABLE IF NOT EXISTS proposta_itens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  tipo TEXT DEFAULT 'material',
  quantidade NUMERIC(10,2) DEFAULT 1,
  valor_unitario NUMERIC(12,2) DEFAULT 0,
  valor_total NUMERIC(12,2) DEFAULT 0,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_itens_proposta ON proposta_itens(proposta_id);

-- 4. Fotos da Proposta
CREATE TABLE IF NOT EXISTS proposta_fotos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  proposta_id UUID NOT NULL REFERENCES propostas(id) ON DELETE CASCADE,
  foto_url TEXT NOT NULL,
  legenda TEXT,
  ordem INTEGER DEFAULT 0,
  criado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proposta_fotos_proposta ON proposta_fotos(proposta_id);

-- 5. RLS Policies
ALTER TABLE proposta_modelos ENABLE ROW LEVEL SECURITY;
ALTER TABLE propostas ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposta_itens ENABLE ROW LEVEL SECURITY;
ALTER TABLE proposta_fotos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Acesso total proposta_modelos" ON proposta_modelos FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total propostas" ON propostas FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total proposta_itens" ON proposta_itens FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Acesso total proposta_fotos" ON proposta_fotos FOR ALL USING (true) WITH CHECK (true);

-- 6. Storage bucket (executar via Dashboard > Storage)
-- Criar bucket 'propostas' com acesso público
-- INSERT INTO storage.buckets (id, name, public) VALUES ('propostas', 'propostas', true);
