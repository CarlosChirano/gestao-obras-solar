# Deploy - Diário de Obra (Opção B)

## Arquivos Criados

1. **MotivosPausa.jsx** - Cadastro de motivos de pausa
2. **DiarioObra.jsx** - Componente de acompanhamento diário (usado dentro da OS)
3. **OrdemServicoForm.jsx** - Atualizado com:
   - Campo "Previsão de Dias"
   - Aba "Checklists" para selecionar checklists da obra
   - Aba "Diário de Obra" (só aparece ao editar OS existente)

---

## 1. Copiar Arquivos

```bash
# MotivosPausa - Nova tela de cadastro
cp MotivosPausa.jsx src/pages/cadastros/MotivosPausa.jsx

# DiarioObra - Componente usado dentro da OS
cp DiarioObra.jsx src/pages/ordens-servico/DiarioObra.jsx

# OrdemServicoForm - Substituir o existente
cp OrdemServicoForm.jsx src/pages/ordens-servico/OrdemServicoForm.jsx
```

---

## 2. Adicionar Rota para Motivos de Pausa

No arquivo `src/App.jsx` ou onde estão suas rotas, adicione:

```jsx
import MotivosPausa from './pages/cadastros/MotivosPausa'

// Dentro das rotas:
<Route path="/motivos-pausa" element={<MotivosPausa />} />
```

---

## 3. Adicionar no Menu Lateral

No arquivo do menu/sidebar, adicione o link para Motivos de Pausa:

```jsx
// Importar ícone
import { PauseCircle } from 'lucide-react'

// No array de itens do menu (seção Cadastros):
{
  path: '/motivos-pausa',
  label: 'Motivos de Pausa',
  icon: PauseCircle
}
```

---

## 4. Executar SQL no Supabase

Execute o SQL que já foi criado anteriormente (`diario_obra_estrutura_v3.sql`) no Supabase:

```sql
-- Se ainda não executou, as tabelas necessárias são:

-- Adicionar coluna previsao_dias na tabela ordens_servico
ALTER TABLE ordens_servico ADD COLUMN IF NOT EXISTS previsao_dias INTEGER DEFAULT 1;

-- Tabela de motivos de pausa (se não existir)
CREATE TABLE IF NOT EXISTS motivos_pausa (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome VARCHAR(100) NOT NULL,
  descricao TEXT,
  icone VARCHAR(50) DEFAULT 'pause-circle',
  cor VARCHAR(20) DEFAULT '#6B7280',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inserir motivos padrão
INSERT INTO motivos_pausa (nome, descricao, icone, cor) VALUES
('Chuva', 'Obra pausada devido a condições climáticas', 'cloud-rain', '#3B82F6'),
('Falta de Material', 'Aguardando entrega de materiais', 'package', '#F59E0B'),
('Alteração de Projeto', 'Cliente solicitou alterações', 'file-edit', '#8B5CF6'),
('Falta de Energia', 'Sem energia elétrica no local', 'zap-off', '#EF4444'),
('Colaborador Ausente', 'Membro da equipe faltou', 'user-x', '#EC4899'),
('Cliente Cancelou', 'Cliente cancelou o dia de trabalho', 'x-circle', '#DC2626'),
('Aguardando Aprovação', 'Esperando aprovação do cliente', 'clock', '#F97316'),
('Problema Técnico', 'Problema técnico identificado', 'alert-triangle', '#EF4444'),
('Outros', 'Outros motivos', 'more-horizontal', '#6B7280')
ON CONFLICT DO NOTHING;

-- Tabela de acompanhamento diário
CREATE TABLE IF NOT EXISTS os_acompanhamento_diario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_servico_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  data DATE NOT NULL,
  dia_numero INTEGER,
  status VARCHAR(20) DEFAULT 'trabalhado' CHECK (status IN ('trabalhado', 'pausado', 'nao_iniciado')),
  motivo_pausa_id UUID REFERENCES motivos_pausa(id),
  motivo_pausa_obs TEXT,
  progresso_percentual INTEGER DEFAULT 0 CHECK (progresso_percentual >= 0 AND progresso_percentual <= 100),
  atividades_realizadas TEXT,
  observacoes TEXT,
  clima VARCHAR(30),
  hora_inicio TIME,
  hora_fim TIME,
  veiculo_id UUID REFERENCES veiculos(id),
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(ordem_servico_id, data)
);

-- Tabela de equipe por dia
CREATE TABLE IF NOT EXISTS os_acompanhamento_equipe (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acompanhamento_id UUID NOT NULL REFERENCES os_acompanhamento_diario(id) ON DELETE CASCADE,
  colaborador_id UUID NOT NULL REFERENCES colaboradores(id),
  tipo_diaria VARCHAR(20) DEFAULT 'completa' CHECK (tipo_diaria IN ('completa', 'meia')),
  valor_diaria DECIMAL(10,2) DEFAULT 0,
  valor_alimentacao DECIMAL(10,2) DEFAULT 0,
  observacoes TEXT,
  UNIQUE(acompanhamento_id, colaborador_id)
);

-- Tabela de fotos por dia
CREATE TABLE IF NOT EXISTS os_acompanhamento_fotos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acompanhamento_id UUID NOT NULL REFERENCES os_acompanhamento_diario(id) ON DELETE CASCADE,
  tipo VARCHAR(20) DEFAULT 'durante' CHECK (tipo IN ('inicio_dia', 'durante', 'fim_dia')),
  arquivo_url TEXT NOT NULL,
  arquivo_nome VARCHAR(255),
  descricao TEXT,
  criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de checklists preenchidos por dia
CREATE TABLE IF NOT EXISTS os_acompanhamento_checklist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  acompanhamento_id UUID NOT NULL REFERENCES os_acompanhamento_diario(id) ON DELETE CASCADE,
  checklist_modelo_id UUID REFERENCES checklist_modelos(id),
  tipo VARCHAR(20) DEFAULT 'customizado',
  titulo VARCHAR(200),
  respostas JSONB,
  concluido BOOLEAN DEFAULT false,
  concluido_em TIMESTAMP WITH TIME ZONE,
  concluido_por UUID REFERENCES auth.users(id)
);

-- Tabela de checklists selecionados para a OS
CREATE TABLE IF NOT EXISTS os_checklists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ordem_servico_id UUID NOT NULL REFERENCES ordens_servico(id) ON DELETE CASCADE,
  checklist_modelo_id UUID NOT NULL REFERENCES checklist_modelos(id),
  tipo VARCHAR(20) DEFAULT 'avulso' CHECK (tipo IN ('inicio_obra', 'fim_obra', 'diario_inicio', 'diario_fim', 'avulso')),
  obrigatorio BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  UNIQUE(ordem_servico_id, checklist_modelo_id, tipo)
);

-- Habilitar RLS
ALTER TABLE motivos_pausa ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_acompanhamento_diario ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_acompanhamento_equipe ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_acompanhamento_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_acompanhamento_checklist ENABLE ROW LEVEL SECURITY;
ALTER TABLE os_checklists ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso (ajuste conforme sua necessidade)
CREATE POLICY "Acesso total motivos_pausa" ON motivos_pausa FOR ALL USING (true);
CREATE POLICY "Acesso total os_acompanhamento_diario" ON os_acompanhamento_diario FOR ALL USING (true);
CREATE POLICY "Acesso total os_acompanhamento_equipe" ON os_acompanhamento_equipe FOR ALL USING (true);
CREATE POLICY "Acesso total os_acompanhamento_fotos" ON os_acompanhamento_fotos FOR ALL USING (true);
CREATE POLICY "Acesso total os_acompanhamento_checklist" ON os_acompanhamento_checklist FOR ALL USING (true);
CREATE POLICY "Acesso total os_checklists" ON os_checklists FOR ALL USING (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_os_acomp_diario_os ON os_acompanhamento_diario(ordem_servico_id);
CREATE INDEX IF NOT EXISTS idx_os_acomp_diario_data ON os_acompanhamento_diario(data);
CREATE INDEX IF NOT EXISTS idx_os_acomp_equipe_acomp ON os_acompanhamento_equipe(acompanhamento_id);
CREATE INDEX IF NOT EXISTS idx_os_checklists_os ON os_checklists(ordem_servico_id);
```

---

## 5. Commit e Deploy

```bash
git add .
git commit -m "Diário de Obra: Motivos de Pausa, Acompanhamento Diário, Checklists na OS"
git push
```

---

## Como Usar

### Fluxo de Trabalho:

1. **Criar OS**: 
   - Preencher dados normais
   - Definir "Previsão de Dias" (ex: 3 dias)
   - Na aba "Checklists", selecionar quais usar (início, fim, avulsos)
   - Na aba "Equipe", adicionar colaboradores
   - Salvar

2. **Executar Obra (cada dia)**:
   - Abrir a OS existente
   - Ir na aba "Diário de Obra"
   - Clicar "Registrar Dia"
   - Preencher:
     - Data
     - Status (Trabalhado ou Pausado)
     - Se pausado: selecionar motivo
     - Se trabalhado: clima, equipe do dia, progresso %, atividades
   - Salvar

3. **Custos Automáticos**:
   - Sistema calcula custos baseado nos dias efetivamente trabalhados
   - Equipe pode variar por dia
   - Veículo pode variar por dia
   - Dias pausados não geram custo de mão de obra

---

## Estrutura Visual

```
OS #123 - Instalação Solar
├── Previsão: 3 dias
├── Checklists: Início, Fim, Vistoria Final
│
├── 📅 DIA 1 - 05/12 ✅ Trabalhado
│   ├── Equipe: João, Pedro
│   ├── Progresso: 40%
│   └── Custo: R$ 850,00
│
├── 📅 DIA 2 - 06/12 ⏸️ Pausado (Chuva)
│   └── Custo: R$ 0,00
│
├── 📅 DIA 3 - 07/12 ✅ Trabalhado  
│   ├── Equipe: João, Pedro, Maria
│   ├── Progresso: 100%
│   └── Custo: R$ 1.200,00
│
└── 💰 TOTAL: 2 dias trabalhados = R$ 2.050,00
```

---

## Próximos Passos (Opções Futuras)

- **A**: Lançamentos automáticos ao concluir OS
- **C**: Rateio de veículo entre OS do mesmo dia
- **D**: Relatório de rentabilidade por cliente
- **E**: Exportação PDF/Excel
