# Instruções para Integrar o Módulo Financeiro

## 1. Adicionar Imports no App.jsx

No topo do arquivo App.jsx, adicione:

```jsx
// Financeiro
import Financeiro from './pages/financeiro/Financeiro'
import LancamentoForm from './pages/financeiro/LancamentoForm'
import ContaBancariaForm from './pages/financeiro/ContaBancariaForm'
import ImportarOFX from './pages/financeiro/ImportarOFX'
```

## 2. Adicionar Rotas no App.jsx

Dentro do `<Routes>`, adicione estas rotas:

```jsx
{/* Financeiro */}
<Route path="/financeiro" element={<Financeiro />} />
<Route path="/financeiro/novo" element={<LancamentoForm />} />
<Route path="/financeiro/:id" element={<LancamentoForm />} />
<Route path="/financeiro/contas/nova" element={<ContaBancariaForm />} />
<Route path="/financeiro/contas/:id" element={<ContaBancariaForm />} />
<Route path="/financeiro/importar-ofx" element={<ImportarOFX />} />
```

## 3. Adicionar no Menu Lateral (Sidebar)

No arquivo do Sidebar/Menu, adicione o item:

```jsx
import { DollarSign } from 'lucide-react'

// No array de itens do menu:
{
  path: '/financeiro',
  label: 'Financeiro',
  icon: DollarSign
}
```

## 4. Estrutura de Pastas

Certifique-se que a estrutura está assim:

```
src/
├── lib/
│   └── ofxParser.js
├── pages/
│   └── financeiro/
│       ├── Financeiro.jsx
│       ├── LancamentoForm.jsx
│       ├── ContaBancariaForm.jsx
│       └── ImportarOFX.jsx
```

## 5. Verificar se o SQL foi Executado

O SQL cria estas tabelas:
- contas_bancarias
- categorias_financeiras
- formas_pagamento
- lancamentos_financeiros
- transacoes_bancarias
- pagamentos_colaboradores
- importacoes_ofx

E também insere categorias e formas de pagamento padrão.

## Pronto!

Após esses passos, o módulo financeiro estará funcionando com:
- Dashboard financeiro com gráficos
- Gestão de contas bancárias
- Lançamentos (receitas/despesas)
- Importação de extrato OFX
- Conciliação bancária
