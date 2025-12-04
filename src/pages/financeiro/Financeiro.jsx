import { useState } from 'react'
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  CreditCard,
  PiggyBank,
  Receipt,
  ArrowUpCircle,
  ArrowDownCircle,
  Building2,
  Upload,
  GitCompare,
  Wallet,
  BarChart3,
  Plus,
  Filter,
  Download,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Calendar
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from 'recharts'

const Financeiro = () => {
  const [abaAtiva, setAbaAtiva] = useState('visao-geral')
  const [periodoFiltro, setPeriodoFiltro] = useState('mes-atual')

  // Buscar contas bancárias
  const { data: contasBancarias, isLoading: loadingContas } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar lançamentos
  const { data: lancamentos, isLoading: loadingLancamentos } = useQuery({
    queryKey: ['lancamentos-financeiros'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select(`
          *,
          categoria:categorias_financeiras(nome, cor, tipo),
          conta:contas_bancarias(nome),
          cliente:clientes(nome),
          colaborador:colaboradores(nome)
        `)
        .eq('ativo', true)
        .order('data_vencimento', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Buscar categorias
  const { data: categorias } = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Cálculos do período
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  const lancamentosMes = lancamentos?.filter(l => {
    const data = new Date(l.data_vencimento)
    return data >= inicioMes && data <= fimMes
  }) || []

  // Totais
  const receitasMes = lancamentosMes
    .filter(l => l.tipo === 'receita')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const despesasMes = lancamentosMes
    .filter(l => l.tipo === 'despesa')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const saldoMes = receitasMes - despesasMes

  const receitasPagas = lancamentosMes
    .filter(l => l.tipo === 'receita' && l.status === 'pago')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const despesasPagas = lancamentosMes
    .filter(l => l.tipo === 'despesa' && l.status === 'pago')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  // Pendentes
  const receitasPendentes = lancamentosMes
    .filter(l => l.tipo === 'receita' && l.status === 'pendente')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const despesasPendentes = lancamentosMes
    .filter(l => l.tipo === 'despesa' && l.status === 'pendente')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  // Atrasados
  const lancamentosAtrasados = lancamentos?.filter(l => {
    const data = new Date(l.data_vencimento)
    return data < hoje && l.status === 'pendente'
  }) || []

  const valorAtrasado = lancamentosAtrasados
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  // Saldo total das contas
  const saldoTotal = contasBancarias?.reduce((sum, c) => sum + (parseFloat(c.saldo_atual) || 0), 0) || 0

  // Dados para gráficos
  const dadosPorCategoria = () => {
    const agrupado = {}
    lancamentosMes.forEach(l => {
      const cat = l.categoria?.nome || 'Sem categoria'
      if (!agrupado[cat]) {
        agrupado[cat] = { nome: cat, receita: 0, despesa: 0, cor: l.categoria?.cor || '#6B7280' }
      }
      if (l.tipo === 'receita') {
        agrupado[cat].receita += parseFloat(l.valor) || 0
      } else {
        agrupado[cat].despesa += parseFloat(l.valor) || 0
      }
    })
    return Object.values(agrupado).sort((a, b) => (b.receita + b.despesa) - (a.receita + a.despesa)).slice(0, 8)
  }

  const fluxoCaixaMensal = () => {
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0)
      
      const receitas = lancamentos
        ?.filter(l => {
          const dataL = new Date(l.data_vencimento)
          return dataL >= data && dataL <= fim && l.tipo === 'receita'
        })
        .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0) || 0

      const despesas = lancamentos
        ?.filter(l => {
          const dataL = new Date(l.data_vencimento)
          return dataL >= data && dataL <= fim && l.tipo === 'despesa'
        })
        .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0) || 0

      meses.push({
        mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        receitas,
        despesas,
        saldo: receitas - despesas
      })
    }
    return meses
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatCurrencyShort = (value) => {
    if (Math.abs(value) >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`
    }
    if (Math.abs(value) >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`
    }
    return formatCurrency(value)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {formatCurrency(entry.value)}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const abas = [
    { id: 'visao-geral', label: 'Visão Geral', icon: BarChart3 },
    { id: 'lancamentos', label: 'Lançamentos', icon: Receipt },
    { id: 'contas', label: 'Contas', icon: Building2 },
    { id: 'conciliacao', label: 'Conciliação', icon: GitCompare },
  ]

  if (loadingContas || loadingLancamentos) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
          <p className="text-gray-600">Gestão de contas a pagar e receber</p>
        </div>
        <div className="flex gap-2">
          <Link
            to="/financeiro/importar-ofx"
            className="btn btn-secondary flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            Importar OFX
          </Link>
          <Link
            to="/financeiro/novo"
            className="btn btn-primary flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Novo Lançamento
          </Link>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {abas.map((aba) => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                abaAtiva === aba.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <aba.icon className="w-4 h-4" />
              {aba.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Conteúdo das abas */}
      {abaAtiva === 'visao-geral' && (
        <div className="space-y-6">
          {/* Cards Principais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Saldo em Contas */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saldo em Contas</p>
                  <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyShort(saldoTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-3 text-sm text-gray-500">
                {contasBancarias?.length || 0} contas ativas
              </div>
            </div>

            {/* Receitas do Mês */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Receitas do Mês</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrencyShort(receitasMes)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <ArrowUpCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-green-600">{formatCurrencyShort(receitasPagas)}</span>
                <span className="text-gray-400">recebido</span>
                <span className="text-gray-300">|</span>
                <span className="text-yellow-600">{formatCurrencyShort(receitasPendentes)}</span>
                <span className="text-gray-400">a receber</span>
              </div>
            </div>

            {/* Despesas do Mês */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Despesas do Mês</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrencyShort(despesasMes)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2 text-sm">
                <span className="text-red-600">{formatCurrencyShort(despesasPagas)}</span>
                <span className="text-gray-400">pago</span>
                <span className="text-gray-300">|</span>
                <span className="text-yellow-600">{formatCurrencyShort(despesasPendentes)}</span>
                <span className="text-gray-400">a pagar</span>
              </div>
            </div>

            {/* Saldo do Mês */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saldo do Mês</p>
                  <p className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrencyShort(saldoMes)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${saldoMes >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {saldoMes >= 0 ? (
                    <TrendingUp className="w-6 h-6 text-green-600" />
                  ) : (
                    <TrendingDown className="w-6 h-6 text-red-600" />
                  )}
                </div>
              </div>
              {lancamentosAtrasados.length > 0 && (
                <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                  <AlertTriangle className="w-4 h-4" />
                  {lancamentosAtrasados.length} atrasados ({formatCurrencyShort(valorAtrasado)})
                </div>
              )}
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fluxo de Caixa */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Fluxo de Caixa (6 meses)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={fluxoCaixaMensal()}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis dataKey="mes" tick={{ fontSize: 12, fill: '#6B7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => formatCurrencyShort(v)} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receitas" name="Receitas" fill="#22C55E" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="despesas" name="Despesas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Por Categoria */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Categoria (mês atual)</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosPorCategoria()} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#6B7280' }} tickFormatter={(v) => formatCurrencyShort(v)} />
                    <YAxis type="category" dataKey="nome" tick={{ fontSize: 11, fill: '#6B7280' }} width={100} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="receita" name="Receita" fill="#22C55E" radius={[0, 4, 4, 0]} />
                    <Bar dataKey="despesa" name="Despesa" fill="#EF4444" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Contas Bancárias */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Contas Bancárias</h3>
              <Link to="/financeiro/contas/nova" className="text-sm text-blue-600 hover:underline">
                Adicionar conta →
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {contasBancarias?.map((conta) => (
                <div 
                  key={conta.id} 
                  className="p-4 rounded-lg border border-gray-200"
                  style={{ borderLeftWidth: '4px', borderLeftColor: conta.cor }}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{conta.nome}</p>
                      <p className="text-sm text-gray-500">{conta.banco}</p>
                    </div>
                    <Building2 className="w-5 h-5 text-gray-400" />
                  </div>
                  <p className={`text-xl font-bold mt-2 ${parseFloat(conta.saldo_atual) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldo_atual)}
                  </p>
                </div>
              ))}
              {(!contasBancarias || contasBancarias.length === 0) && (
                <div className="col-span-full text-center py-8 text-gray-500">
                  Nenhuma conta cadastrada
                </div>
              )}
            </div>
          </div>

          {/* Próximos Vencimentos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* A Receber */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowUpCircle className="w-5 h-5 text-green-600" />
                Próximos a Receber
              </h3>
              <div className="space-y-2">
                {lancamentos
                  ?.filter(l => l.tipo === 'receita' && l.status === 'pendente')
                  .slice(0, 5)
                  .map((l) => (
                    <Link
                      key={l.id}
                      to={`/financeiro/${l.id}`}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100"
                    >
                      <div>
                        <p className="font-medium text-gray-900">{l.descricao}</p>
                        <p className="text-sm text-gray-500">
                          {l.cliente?.nome || l.categoria?.nome || 'Sem categoria'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-green-600">{formatCurrency(l.valor)}</p>
                        <p className="text-sm text-gray-500">{formatDate(l.data_vencimento)}</p>
                      </div>
                    </Link>
                  ))
                }
                {lancamentos?.filter(l => l.tipo === 'receita' && l.status === 'pendente').length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum valor a receber</p>
                )}
              </div>
            </div>

            {/* A Pagar */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-red-600" />
                Próximos a Pagar
              </h3>
              <div className="space-y-2">
                {lancamentos
                  ?.filter(l => l.tipo === 'despesa' && l.status === 'pendente')
                  .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
                  .slice(0, 5)
                  .map((l) => {
                    const atrasado = new Date(l.data_vencimento) < hoje
                    return (
                      <Link
                        key={l.id}
                        to={`/financeiro/${l.id}`}
                        className={`flex items-center justify-between p-3 rounded-lg ${atrasado ? 'bg-red-50 hover:bg-red-100' : 'bg-gray-50 hover:bg-gray-100'}`}
                      >
                        <div>
                          <p className="font-medium text-gray-900">{l.descricao}</p>
                          <p className="text-sm text-gray-500">
                            {l.colaborador?.nome || l.categoria?.nome || 'Sem categoria'}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium text-red-600">{formatCurrency(l.valor)}</p>
                          <p className={`text-sm ${atrasado ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                            {atrasado && <AlertTriangle className="w-3 h-3 inline mr-1" />}
                            {formatDate(l.data_vencimento)}
                          </p>
                        </div>
                      </Link>
                    )
                  })
                }
                {lancamentos?.filter(l => l.tipo === 'despesa' && l.status === 'pendente').length === 0 && (
                  <p className="text-gray-500 text-center py-4">Nenhum valor a pagar</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="card">
            <div className="flex flex-wrap gap-4">
              <select
                value={periodoFiltro}
                onChange={(e) => setPeriodoFiltro(e.target.value)}
                className="input w-auto"
              >
                <option value="mes-atual">Mês Atual</option>
                <option value="mes-anterior">Mês Anterior</option>
                <option value="ultimos-90">Últimos 90 dias</option>
                <option value="ano-atual">Ano Atual</option>
                <option value="todos">Todos</option>
              </select>
              <select className="input w-auto">
                <option value="">Todos os tipos</option>
                <option value="receita">Receitas</option>
                <option value="despesa">Despesas</option>
              </select>
              <select className="input w-auto">
                <option value="">Todos os status</option>
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="atrasado">Atrasado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {/* Lista de Lançamentos */}
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Categoria</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Conta</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {lancamentos?.slice(0, 20).map((l) => {
                    const atrasado = new Date(l.data_vencimento) < hoje && l.status === 'pendente'
                    return (
                      <tr key={l.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <span className={atrasado ? 'text-red-600 font-medium' : ''}>
                            {formatDate(l.data_vencimento)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Link to={`/financeiro/${l.id}`} className="font-medium text-gray-900 hover:text-blue-600">
                            {l.descricao}
                          </Link>
                          {l.cliente?.nome && (
                            <p className="text-sm text-gray-500">{l.cliente.nome}</p>
                          )}
                          {l.colaborador?.nome && (
                            <p className="text-sm text-gray-500">{l.colaborador.nome}</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <span 
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                            style={{ backgroundColor: `${l.categoria?.cor}20`, color: l.categoria?.cor }}
                          >
                            {l.categoria?.nome || 'Sem categoria'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {l.conta?.nome || '-'}
                        </td>
                        <td className={`px-4 py-3 text-right font-medium ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                          {l.tipo === 'receita' ? '+' : '-'} {formatCurrency(l.valor)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                            l.status === 'pago' ? 'bg-green-100 text-green-700' :
                            l.status === 'pendente' && atrasado ? 'bg-red-100 text-red-700' :
                            l.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                            l.status === 'cancelado' ? 'bg-gray-100 text-gray-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {l.status === 'pago' && <CheckCircle2 className="w-3 h-3" />}
                            {l.status === 'pendente' && !atrasado && <Clock className="w-3 h-3" />}
                            {l.status === 'pendente' && atrasado && <AlertTriangle className="w-3 h-3" />}
                            {atrasado ? 'Atrasado' : l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {(!lancamentos || lancamentos.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                Nenhum lançamento encontrado
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'contas' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Link to="/financeiro/contas/nova" className="btn btn-primary flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Nova Conta
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {contasBancarias?.map((conta) => (
              <Link
                key={conta.id}
                to={`/financeiro/contas/${conta.id}`}
                className="card hover:shadow-lg transition-shadow"
                style={{ borderLeftWidth: '4px', borderLeftColor: conta.cor }}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{conta.nome}</h3>
                    <p className="text-sm text-gray-500">{conta.banco}</p>
                    {conta.agencia && (
                      <p className="text-xs text-gray-400 mt-1">
                        Ag: {conta.agencia} | Conta: {conta.conta}
                      </p>
                    )}
                  </div>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center`} style={{ backgroundColor: `${conta.cor}20` }}>
                    <Building2 className="w-5 h-5" style={{ color: conta.cor }} />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm text-gray-500">Saldo atual</p>
                  <p className={`text-2xl font-bold ${parseFloat(conta.saldo_atual) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(conta.saldo_atual)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
          {(!contasBancarias || contasBancarias.length === 0) && (
            <div className="card text-center py-12">
              <Building2 className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">Nenhuma conta bancária cadastrada</p>
              <Link to="/financeiro/contas/nova" className="btn btn-primary">
                Cadastrar Primeira Conta
              </Link>
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'conciliacao' && (
        <div className="space-y-4">
          <div className="card">
            <div className="text-center py-8">
              <GitCompare className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Conciliação Bancária</h3>
              <p className="text-gray-500 mb-4">
                Importe um extrato OFX para conciliar as transações bancárias com seus lançamentos
              </p>
              <Link to="/financeiro/importar-ofx" className="btn btn-primary">
                <Upload className="w-4 h-4 mr-2" />
                Importar Extrato OFX
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Financeiro
