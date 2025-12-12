import { useState, useMemo } from 'react'
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
  Calendar,
  FileText,
  Users,
  Car,
  Wrench,
  Coffee,
  Fuel,
  ClipboardCheck,
  AlertCircle,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import toast from 'react-hot-toast'

const Financeiro = () => {
  const [abaAtiva, setAbaAtiva] = useState('visao-geral')
  const [periodoFiltro, setPeriodoFiltro] = useState('mes-atual')
  
  // Estados para Filtros de Lançamentos
  const [lancTipoFiltro, setLancTipoFiltro] = useState('')
  const [lancStatusFiltro, setLancStatusFiltro] = useState('')
  const [lancDataInicio, setLancDataInicio] = useState('')
  const [lancDataFim, setLancDataFim] = useState('')
  const [lancPagina, setLancPagina] = useState(1)
  const lancPorPagina = 20
  
  // Estados para Fechamento de Período
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split('T')[0])
  const [colaboradoresSelecionados, setColaboradoresSelecionados] = useState([])
  
  // Estados para DRE
  const [drePeriodo, setDrePeriodo] = useState('mes-atual')
  const [dreDataInicio, setDreDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dreDataFim, setDreDataFim] = useState(() => new Date().toISOString().split('T')[0])
  
  const queryClient = useQueryClient()

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
          plano_conta:plano_contas(id, codigo, nome, tipo),
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

  // Buscar Ordens de Serviço para Conciliação
  const { data: ordensServico, isLoading: loadingOS } = useQuery({
    queryKey: ['os-conciliacao'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(nome),
          os_servicos(valor_total),
          os_colaboradores(
            colaborador_id, 
            valor_diaria, 
            dias_trabalhados, 
            valor_total,
            colaborador:colaboradores(nome, valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia)
          ),
          os_custos_extras(valor),
          veiculo:veiculos(placa, modelo, valor_aluguel_dia, valor_gasolina_dia)
        `)
        .in('status', ['concluida', 'em_execucao', 'confirmada'])
        .order('data_agendamento', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Buscar colaboradores com diárias no período (para fechamento)
  const { data: colaboradoresComDiarias } = useQuery({
    queryKey: ['colaboradores-diarias', dataInicio, dataFim],
    queryFn: async () => {
      const { data: osColabs, error } = await supabase
        .from('os_colaboradores')
        .select(`
          *,
          colaborador:colaboradores(id, nome, pix, valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia),
          ordem_servico:ordens_servico!inner(id, numero, data_agendamento, status, cliente:clientes(nome))
        `)
        .gte('ordem_servico.data_agendamento', dataInicio)
        .lte('ordem_servico.data_agendamento', dataFim)
        .in('ordem_servico.status', ['concluida', 'em_execucao', 'confirmada'])
      
      if (error) throw error
      
      // Agrupar por colaborador
      const agrupado = {}
      osColabs?.forEach(oc => {
        const colabId = oc.colaborador?.id
        if (!colabId) return
        
        if (!agrupado[colabId]) {
          agrupado[colabId] = {
            colaborador: oc.colaborador,
            oss: [],
            totalDiarias: 0,
            totalValorDiarias: 0,
            totalAlimentacao: 0,
            diasTrabalhados: 0
          }
        }
        
        const dias = parseFloat(oc.dias_trabalhados) || 0
        const valorDiaria = parseFloat(oc.valor_total) || 0
        const cafe = (parseFloat(oc.colaborador?.valor_cafe_dia) || 0) * dias
        const almoco = (parseFloat(oc.colaborador?.valor_almoco_dia) || 0) * dias
        const transporte = (parseFloat(oc.colaborador?.valor_transporte_dia) || 0) * dias
        const outros = (parseFloat(oc.colaborador?.valor_outros_dia) || 0) * dias
        const alimentacao = cafe + almoco + transporte + outros
        
        agrupado[colabId].oss.push({
          numero: oc.ordem_servico?.numero,
          cliente: oc.ordem_servico?.cliente?.nome,
          data: oc.ordem_servico?.data_agendamento,
          dias,
          valorDiaria,
          alimentacao
        })
        
        agrupado[colabId].diasTrabalhados += dias
        agrupado[colabId].totalValorDiarias += valorDiaria
        agrupado[colabId].totalAlimentacao += alimentacao
      })
      
      return Object.values(agrupado)
    },
    enabled: abaAtiva === 'fechamento'
  })

  // Cálculos do período - Corrigido para evitar problemas de timezone
  const hoje = new Date()
  const anoAtual = hoje.getFullYear()
  const mesAtual = hoje.getMonth()
  
  // Formata datas como YYYY-MM-DD para comparação segura
  const inicioMesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-01`
  const ultimoDia = new Date(anoAtual, mesAtual + 1, 0).getDate()
  const fimMesStr = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`

  const lancamentosMes = lancamentos?.filter(l => {
    if (!l.data_vencimento) return false
    const dataStr = l.data_vencimento.split('T')[0] // Pega apenas YYYY-MM-DD
    return dataStr >= inicioMesStr && dataStr <= fimMesStr
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

  const receitasPendentes = lancamentosMes
    .filter(l => l.tipo === 'receita' && l.status === 'pendente')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const despesasPendentes = lancamentosMes
    .filter(l => l.tipo === 'despesa' && l.status === 'pendente')
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const lancamentosAtrasados = lancamentos?.filter(l => {
    if (!l.data_vencimento) return false
    const dataStr = l.data_vencimento.split('T')[0]
    const hojeStr = hoje.toISOString().split('T')[0]
    return dataStr < hojeStr && l.status === 'pendente'
  }) || []

  const valorAtrasado = lancamentosAtrasados
    .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

  const saldoTotal = contasBancarias?.reduce((sum, c) => sum + (parseFloat(c.saldo_atual) || 0), 0) || 0

  // Calcular dados das OS para conciliação
  const osComCalculos = useMemo(() => {
    return ordensServico?.map(os => {
      // Receita (serviços)
      const receita = os.valor_total || os.os_servicos?.reduce((sum, s) => sum + (parseFloat(s.valor_total) || 0), 0) || 0
      
      // Custos de mão de obra (diárias)
      const custoDiarias = os.os_colaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0) || 0
      
      // Custos de alimentação
      const custoAlimentacao = os.os_colaboradores?.reduce((sum, c) => {
        const dias = parseFloat(c.dias_trabalhados) || 0
        const cafe = parseFloat(c.colaborador?.valor_cafe_dia) || 0
        const almoco = parseFloat(c.colaborador?.valor_almoco_dia) || 0
        const transporte = parseFloat(c.colaborador?.valor_transporte_dia) || 0
        const outros = parseFloat(c.colaborador?.valor_outros_dia) || 0
        return sum + (dias * (cafe + almoco + transporte + outros))
      }, 0) || 0
      
      // Custos de veículo
      const custoVeiculo = (parseFloat(os.veiculo?.valor_aluguel_dia) || 0) + 
                          (parseFloat(os.veiculo?.valor_gasolina_dia) || 0) +
                          (parseFloat(os.valor_gasolina_extra) || 0)
      
      // Custos extras
      const custosExtras = os.os_custos_extras?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0
      
      // Total de custos
      const totalCustos = custoDiarias + custoAlimentacao + custoVeiculo + custosExtras
      
      // Lucro
      const lucro = receita - totalCustos
      const margem = receita > 0 ? (lucro / receita) * 100 : 0
      
      return {
        ...os,
        receita,
        custoDiarias,
        custoAlimentacao,
        custoVeiculo,
        custosExtras,
        totalCustos,
        lucro,
        margem
      }
    }) || []
  }, [ordensServico])

  // Dados para DRE
  const dadosDRE = useMemo(() => {
    let inicioStr, fimStr
    
    if (drePeriodo === 'mes-atual') {
      inicioStr = inicioMesStr
      fimStr = fimMesStr
    } else if (drePeriodo === 'mes-anterior') {
      const mesAnterior = mesAtual === 0 ? 11 : mesAtual - 1
      const anoMesAnterior = mesAtual === 0 ? anoAtual - 1 : anoAtual
      const ultimoDiaMesAnt = new Date(anoMesAnterior, mesAnterior + 1, 0).getDate()
      inicioStr = `${anoMesAnterior}-${String(mesAnterior + 1).padStart(2, '0')}-01`
      fimStr = `${anoMesAnterior}-${String(mesAnterior + 1).padStart(2, '0')}-${String(ultimoDiaMesAnt).padStart(2, '0')}`
    } else if (drePeriodo === 'ano-atual') {
      inicioStr = `${anoAtual}-01-01`
      fimStr = `${anoAtual}-12-31`
    } else {
      inicioStr = dreDataInicio
      fimStr = dreDataFim
    }
    
    // Filtrar OS do período
    const osPeriodo = osComCalculos.filter(os => {
      if (!os.data_agendamento) return false
      const dataStr = os.data_agendamento.split('T')[0]
      return dataStr >= inicioStr && dataStr <= fimStr && os.status === 'concluida'
    })
    
    // Receitas
    const receitaServicos = osPeriodo.reduce((sum, os) => sum + os.receita, 0)
    
    // Custos
    const custoMaoObra = osPeriodo.reduce((sum, os) => sum + os.custoDiarias, 0)
    const custoAlimentacao = osPeriodo.reduce((sum, os) => sum + os.custoAlimentacao, 0)
    const custoVeiculos = osPeriodo.reduce((sum, os) => sum + os.custoVeiculo, 0)
    const custoExtras = osPeriodo.reduce((sum, os) => sum + os.custosExtras, 0)
    
    const totalCustos = custoMaoObra + custoAlimentacao + custoVeiculos + custoExtras
    const lucroOperacional = receitaServicos - totalCustos
    const margemOperacional = receitaServicos > 0 ? (lucroOperacional / receitaServicos) * 100 : 0
    
    return {
      periodo: { inicio: inicioStr, fim: fimStr },
      quantidadeOS: osPeriodo.length,
      receitaServicos,
      custoMaoObra,
      custoAlimentacao,
      custoVeiculos,
      custoExtras,
      totalCustos,
      lucroOperacional,
      margemOperacional
    }
  }, [osComCalculos, drePeriodo, dreDataInicio, dreDataFim, inicioMesStr, fimMesStr, mesAtual, anoAtual])

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
      const ano = hoje.getFullYear()
      const mes = hoje.getMonth() - i
      const dataRef = new Date(ano, mes, 1)
      const ultimoDia = new Date(ano, mes + 1, 0).getDate()
      
      // Formato YYYY-MM-DD para comparação segura
      const inicioStr = `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}-01`
      const fimStr = `${dataRef.getFullYear()}-${String(dataRef.getMonth() + 1).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`
      
      const receitas = lancamentos
        ?.filter(l => {
          if (!l.data_vencimento) return false
          const dataStr = l.data_vencimento.split('T')[0]
          return dataStr >= inicioStr && dataStr <= fimStr && l.tipo === 'receita'
        })
        .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0) || 0

      const despesas = lancamentos
        ?.filter(l => {
          if (!l.data_vencimento) return false
          const dataStr = l.data_vencimento.split('T')[0]
          return dataStr >= inicioStr && dataStr <= fimStr && l.tipo === 'despesa'
        })
        .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0) || 0

      meses.push({
        mes: dataRef.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
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
    // Corrige problema de timezone: adiciona T12:00:00 para evitar conversão errada
    const dateStr = date.includes('T') ? date : `${date}T12:00:00`
    return new Date(dateStr).toLocaleDateString('pt-BR')
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
    { id: 'conciliacao-obras', label: 'Conciliação de Obras', icon: ClipboardCheck },
    { id: 'dre', label: 'DRE', icon: FileText },
    { id: 'fechamento', label: 'Fechamento de Período', icon: Users },
    { id: 'conciliacao', label: 'Conciliação Bancária', icon: GitCompare },
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
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saldo em Contas</p>
                  <p className={`text-2xl font-bold ${saldoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(saldoTotal)}
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <Wallet className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Receitas do Mês</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(receitasMes)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <ArrowUpCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Despesas do Mês</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(despesasMes)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <ArrowDownCircle className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Saldo do Mês</p>
                  <p className={`text-2xl font-bold ${saldoMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(saldoMes)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${saldoMes >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  {saldoMes >= 0 ? <TrendingUp className="w-6 h-6 text-green-600" /> : <TrendingDown className="w-6 h-6 text-red-600" />}
                </div>
              </div>
            </div>
          </div>

          {/* Gráficos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Fluxo de Caixa</h3>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={fluxoCaixaMensal()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="mes" />
                  <YAxis tickFormatter={(v) => formatCurrencyShort(v)} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="receitas" name="Receitas" fill="#22c55e" />
                  <Bar dataKey="despesas" name="Despesas" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="card">
              <h3 className="text-lg font-semibold mb-4">Por Categoria</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={dadosPorCategoria()}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="despesa"
                    nameKey="nome"
                    label={({ nome, percent }) => `${nome} (${(percent * 100).toFixed(0)}%)`}
                  >
                    {dadosPorCategoria().map((entry, index) => (
                      <Cell key={index} fill={entry.cor} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {abaAtiva === 'lancamentos' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="card">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="label">Tipo</label>
                <select 
                  value={lancTipoFiltro}
                  onChange={(e) => { setLancTipoFiltro(e.target.value); setLancPagina(1) }}
                  className="input-field w-auto"
                >
                  <option value="">Todos os tipos</option>
                  <option value="receita">Receitas</option>
                  <option value="despesa">Despesas</option>
                </select>
              </div>
              <div>
                <label className="label">Status</label>
                <select 
                  value={lancStatusFiltro}
                  onChange={(e) => { setLancStatusFiltro(e.target.value); setLancPagina(1) }}
                  className="input-field w-auto"
                >
                  <option value="">Todos os status</option>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>
              <div>
                <label className="label">Data Início</label>
                <input
                  type="date"
                  value={lancDataInicio}
                  onChange={(e) => { setLancDataInicio(e.target.value); setLancPagina(1) }}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input
                  type="date"
                  value={lancDataFim}
                  onChange={(e) => { setLancDataFim(e.target.value); setLancPagina(1) }}
                  className="input-field"
                />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const hoje = new Date()
                    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                    setLancDataInicio(inicioMes.toISOString().split('T')[0])
                    setLancDataFim(hoje.toISOString().split('T')[0])
                    setLancPagina(1)
                  }}
                  className="btn-secondary text-sm"
                >
                  Mês Atual
                </button>
                <button
                  onClick={() => {
                    const hoje = new Date()
                    const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
                    const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
                    setLancDataInicio(inicioMesAnterior.toISOString().split('T')[0])
                    setLancDataFim(fimMesAnterior.toISOString().split('T')[0])
                    setLancPagina(1)
                  }}
                  className="btn-secondary text-sm"
                >
                  Mês Anterior
                </button>
                <button
                  onClick={() => {
                    setLancTipoFiltro('')
                    setLancStatusFiltro('')
                    setLancDataInicio('')
                    setLancDataFim('')
                    setLancPagina(1)
                  }}
                  className="btn-secondary text-sm text-red-600"
                >
                  Limpar
                </button>
              </div>
            </div>
          </div>

          {/* Tabela de Lançamentos */}
          {(() => {
            // Filtrar lançamentos
            const lancamentosFiltrados = lancamentos?.filter(l => {
              if (lancTipoFiltro && l.tipo !== lancTipoFiltro) return false
              if (lancStatusFiltro && l.status !== lancStatusFiltro) return false
              if (lancDataInicio) {
                const dataStr = l.data_vencimento?.split('T')[0]
                if (dataStr < lancDataInicio) return false
              }
              if (lancDataFim) {
                const dataStr = l.data_vencimento?.split('T')[0]
                if (dataStr > lancDataFim) return false
              }
              return true
            }) || []

            const totalPaginas = Math.ceil(lancamentosFiltrados.length / lancPorPagina)
            const lancamentosPagina = lancamentosFiltrados.slice(
              (lancPagina - 1) * lancPorPagina,
              lancPagina * lancPorPagina
            )

            // Totais do filtro
            const totalReceitas = lancamentosFiltrados
              .filter(l => l.tipo === 'receita')
              .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)
            const totalDespesas = lancamentosFiltrados
              .filter(l => l.tipo === 'despesa')
              .reduce((sum, l) => sum + (parseFloat(l.valor) || 0), 0)

            return (
              <>
                {/* Resumo do Filtro */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  <div className="card bg-gray-50">
                    <p className="text-sm text-gray-500">Total de Registros</p>
                    <p className="text-2xl font-bold text-gray-900">{lancamentosFiltrados.length}</p>
                  </div>
                  <div className="card bg-green-50">
                    <p className="text-sm text-gray-500">Total Receitas</p>
                    <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
                  </div>
                  <div className="card bg-red-50">
                    <p className="text-sm text-gray-500">Total Despesas</p>
                    <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
                  </div>
                  <div className={`card ${totalReceitas - totalDespesas >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <p className="text-sm text-gray-500">Saldo</p>
                    <p className={`text-2xl font-bold ${totalReceitas - totalDespesas >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(totalReceitas - totalDespesas)}
                    </p>
                  </div>
                </div>

                {/* Tabela */}
                <div className="card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vencimento</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Descrição</th>
                          <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plano de Contas</th>
                          <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Valor</th>
                          <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {lancamentosPagina.length === 0 ? (
                          <tr>
                            <td colSpan="5" className="px-4 py-8 text-center text-gray-500">
                              Nenhum lançamento encontrado
                            </td>
                          </tr>
                        ) : (
                          lancamentosPagina.map((l) => {
                            const dataStr = l.data_vencimento?.split('T')[0]
                            const hojeStr = new Date().toISOString().split('T')[0]
                            const atrasado = dataStr < hojeStr && l.status === 'pendente'
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
                                    <p className="text-xs text-gray-500">{l.cliente.nome}</p>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  {l.plano_conta ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-blue-50 text-blue-700">
                                      <span className="font-mono text-blue-500">{l.plano_conta.codigo}</span>
                                      {l.plano_conta.nome}
                                    </span>
                                  ) : l.categoria ? (
                                    <span 
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                      style={{ backgroundColor: `${l.categoria?.cor || '#6B7280'}20`, color: l.categoria?.cor || '#6B7280' }}
                                    >
                                      {l.categoria?.nome || 'Sem categoria'}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-xs">Sem categoria</span>
                                  )}
                                </td>
                                <td className={`px-4 py-3 text-right font-medium ${l.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                                  {l.tipo === 'receita' ? '+' : '-'} {formatCurrency(l.valor)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                    l.status === 'pago' ? 'bg-green-100 text-green-700' :
                                    l.status === 'cancelado' ? 'bg-gray-100 text-gray-700' :
                                    atrasado ? 'bg-red-100 text-red-700' :
                                    'bg-yellow-100 text-yellow-700'
                                  }`}>
                                    {l.status === 'pago' && <CheckCircle2 className="w-3 h-3" />}
                                    {l.status === 'pendente' && !atrasado && <Clock className="w-3 h-3" />}
                                    {atrasado && <AlertTriangle className="w-3 h-3" />}
                                    {atrasado ? 'Atrasado' : l.status.charAt(0).toUpperCase() + l.status.slice(1)}
                                  </span>
                                </td>
                              </tr>
                            )
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação */}
                  {totalPaginas > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
                      <p className="text-sm text-gray-500">
                        Mostrando {((lancPagina - 1) * lancPorPagina) + 1} a {Math.min(lancPagina * lancPorPagina, lancamentosFiltrados.length)} de {lancamentosFiltrados.length}
                      </p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setLancPagina(1)}
                          disabled={lancPagina === 1}
                          className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Primeira
                        </button>
                        <button
                          onClick={() => setLancPagina(prev => Math.max(1, prev - 1))}
                          disabled={lancPagina === 1}
                          className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Anterior
                        </button>
                        <span className="px-3 py-1 text-sm font-medium">
                          Página {lancPagina} de {totalPaginas}
                        </span>
                        <button
                          onClick={() => setLancPagina(prev => Math.min(totalPaginas, prev + 1))}
                          disabled={lancPagina === totalPaginas}
                          className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Próxima
                        </button>
                        <button
                          onClick={() => setLancPagina(totalPaginas)}
                          disabled={lancPagina === totalPaginas}
                          className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                        >
                          Última
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )
          })()}
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
        </div>
      )}

      {/* NOVA ABA: Conciliação de Obras */}
      {abaAtiva === 'conciliacao-obras' && (
        <div className="space-y-6">
          {/* Cards de resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="card bg-green-50 border-green-200">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-sm text-green-700">Com Lucro</p>
                  <p className="text-2xl font-bold text-green-600">
                    {osComCalculos.filter(os => os.lucro > 0).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-yellow-50 border-yellow-200">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-8 h-8 text-yellow-600" />
                <div>
                  <p className="text-sm text-yellow-700">Margem Baixa (&lt;15%)</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {osComCalculos.filter(os => os.margem > 0 && os.margem < 15).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-red-50 border-red-200">
              <div className="flex items-center gap-3">
                <X className="w-8 h-8 text-red-600" />
                <div>
                  <p className="text-sm text-red-700">Com Prejuízo</p>
                  <p className="text-2xl font-bold text-red-600">
                    {osComCalculos.filter(os => os.lucro < 0).length}
                  </p>
                </div>
              </div>
            </div>
            <div className="card bg-blue-50 border-blue-200">
              <div className="flex items-center gap-3">
                <DollarSign className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-sm text-blue-700">Lucro Total</p>
                  <p className="text-xl font-bold text-blue-600">
                    {formatCurrencyShort(osComCalculos.reduce((sum, os) => sum + os.lucro, 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de OS */}
          <div className="card overflow-hidden">
            <h3 className="text-lg font-semibold mb-4">Ordens de Serviço</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">OS</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cliente</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Receita</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Custos</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Lucro</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Margem</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {osComCalculos.slice(0, 30).map((os) => (
                    <tr key={os.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link to={`/ordens-servico/${os.id}`} className="font-medium text-blue-600 hover:underline">
                          {os.numero}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-gray-900">{os.cliente?.nome}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(os.data_agendamento)}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(os.receita)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(os.totalCustos)}</td>
                      <td className={`px-4 py-3 text-right font-bold ${os.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(os.lucro)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          os.margem >= 30 ? 'bg-green-100 text-green-700' :
                          os.margem >= 15 ? 'bg-yellow-100 text-yellow-700' :
                          os.margem >= 0 ? 'bg-orange-100 text-orange-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {os.margem.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {os.lucro >= 0 && os.margem >= 15 ? (
                          <CheckCircle2 className="w-5 h-5 text-green-500 mx-auto" />
                        ) : os.lucro >= 0 ? (
                          <AlertCircle className="w-5 h-5 text-yellow-500 mx-auto" />
                        ) : (
                          <X className="w-5 h-5 text-red-500 mx-auto" />
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* NOVA ABA: DRE */}
      {abaAtiva === 'dre' && (
        <div className="space-y-6">
          {/* Filtro de período */}
          <div className="card">
            <div className="flex flex-wrap items-center gap-4">
              <select 
                value={drePeriodo} 
                onChange={(e) => setDrePeriodo(e.target.value)}
                className="input w-auto"
              >
                <option value="mes-atual">Mês Atual</option>
                <option value="mes-anterior">Mês Anterior</option>
                <option value="ano-atual">Ano Atual</option>
                <option value="personalizado">Personalizado</option>
              </select>
              
              {drePeriodo === 'personalizado' && (
                <>
                  <input 
                    type="date" 
                    value={dreDataInicio}
                    onChange={(e) => setDreDataInicio(e.target.value)}
                    className="input w-auto"
                  />
                  <span className="text-gray-500">até</span>
                  <input 
                    type="date" 
                    value={dreDataFim}
                    onChange={(e) => setDreDataFim(e.target.value)}
                    className="input w-auto"
                  />
                </>
              )}
            </div>
          </div>

          {/* DRE */}
          <div className="card">
            <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
              <FileText className="w-6 h-6 text-blue-600" />
              Demonstrativo de Resultado do Exercício
            </h3>
            
            <p className="text-sm text-gray-500 mb-6">
              Período: {formatDate(dadosDRE.periodo.inicio)} a {formatDate(dadosDRE.periodo.fim)} | 
              {dadosDRE.quantidadeOS} OS concluídas
            </p>

            <div className="space-y-4">
              {/* Receitas */}
              <div className="p-4 bg-green-50 rounded-xl">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-800">RECEITA OPERACIONAL</span>
                  </div>
                  <span className="text-2xl font-bold text-green-600">{formatCurrency(dadosDRE.receitaServicos)}</span>
                </div>
                <div className="mt-2 text-sm text-green-700">
                  Serviços executados em {dadosDRE.quantidadeOS} OS
                </div>
              </div>

              {/* Custos */}
              <div className="p-4 bg-red-50 rounded-xl">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-800">CUSTOS OPERACIONAIS</span>
                  </div>
                  <span className="text-2xl font-bold text-red-600">-{formatCurrency(dadosDRE.totalCustos)}</span>
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-2 border-b border-red-200">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Users className="w-4 h-4" /> Mão de Obra (Diárias)
                    </span>
                    <span className="text-red-600">-{formatCurrency(dadosDRE.custoMaoObra)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-red-200">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Coffee className="w-4 h-4" /> Alimentação/Transporte
                    </span>
                    <span className="text-red-600">-{formatCurrency(dadosDRE.custoAlimentacao)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-red-200">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Car className="w-4 h-4" /> Veículos
                    </span>
                    <span className="text-red-600">-{formatCurrency(dadosDRE.custoVeiculos)}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Wrench className="w-4 h-4" /> Custos Extras
                    </span>
                    <span className="text-red-600">-{formatCurrency(dadosDRE.custoExtras)}</span>
                  </div>
                </div>
              </div>

              {/* Resultado */}
              <div className={`p-6 rounded-xl ${dadosDRE.lucroOperacional >= 0 ? 'bg-gradient-to-r from-green-100 to-blue-100' : 'bg-gradient-to-r from-red-100 to-orange-100'}`}>
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-lg font-bold text-gray-800">LUCRO OPERACIONAL</span>
                    <div className="flex items-center gap-2 mt-1">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className={`text-sm font-medium ${dadosDRE.margemOperacional >= 30 ? 'text-green-600' : dadosDRE.margemOperacional >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        Margem: {dadosDRE.margemOperacional.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <span className={`text-3xl font-bold ${dadosDRE.lucroOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(dadosDRE.lucroOperacional)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Gráfico de composição */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Composição dos Custos</h3>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Mão de Obra', value: dadosDRE.custoMaoObra, cor: '#3b82f6' },
                    { name: 'Alimentação', value: dadosDRE.custoAlimentacao, cor: '#f97316' },
                    { name: 'Veículos', value: dadosDRE.custoVeiculos, cor: '#22c55e' },
                    { name: 'Extras', value: dadosDRE.custoExtras, cor: '#8b5cf6' }
                  ].filter(d => d.value > 0)}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  nameKey="name"
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                >
                  {[
                    { cor: '#3b82f6' },
                    { cor: '#f97316' },
                    { cor: '#22c55e' },
                    { cor: '#8b5cf6' }
                  ].map((entry, index) => (
                    <Cell key={index} fill={entry.cor} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(value)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* NOVA ABA: Fechamento de Período */}
      {abaAtiva === 'fechamento' && (
        <div className="space-y-6">
          {/* Filtro de período */}
          <div className="card">
            <h3 className="text-lg font-semibold mb-4">Selecione o Período</h3>
            <div className="flex flex-wrap items-center gap-4">
              <div>
                <label className="label">Data Início</label>
                <input 
                  type="date" 
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input"
                />
              </div>
              <div className="flex gap-2 pt-6">
                <button 
                  onClick={() => {
                    const hoje = new Date()
                    if (hoje.getDate() <= 15) {
                      setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])
                      setDataFim(new Date(hoje.getFullYear(), hoje.getMonth(), 15).toISOString().split('T')[0])
                    } else {
                      setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth(), 16).toISOString().split('T')[0])
                      setDataFim(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0])
                    }
                  }}
                  className="btn-secondary text-sm"
                >
                  Quinzena Atual
                </button>
                <button 
                  onClick={() => {
                    const hoje = new Date()
                    setDataInicio(new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().split('T')[0])
                    setDataFim(new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0).toISOString().split('T')[0])
                  }}
                  className="btn-secondary text-sm"
                >
                  Mês Atual
                </button>
              </div>
            </div>
          </div>

          {/* Lista de colaboradores */}
          {colaboradoresComDiarias?.length > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Colaboradores no Período</h3>
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total a Pagar</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(colaboradoresComDiarias.reduce((sum, c) => sum + c.totalValorDiarias + c.totalAlimentacao, 0))}
                  </p>
                </div>
              </div>

              {colaboradoresComDiarias.map((item) => (
                <div key={item.colaborador.id} className="card">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                        <Users className="w-6 h-6 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-900">{item.colaborador.nome}</h4>
                        <p className="text-sm text-gray-500">
                          {item.diasTrabalhados} dias trabalhados | {item.oss.length} OS
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(item.totalValorDiarias + item.totalAlimentacao)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Diárias: {formatCurrency(item.totalValorDiarias)} | Alimentação: {formatCurrency(item.totalAlimentacao)}
                      </p>
                    </div>
                  </div>

                  {/* Detalhes das OS */}
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-2">Ordens de Serviço:</p>
                    <div className="flex flex-wrap gap-2">
                      {item.oss.map((os, idx) => (
                        <span key={idx} className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded border text-xs">
                          <span className="font-medium">{os.numero}</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-gray-600">{os.dias} dia(s)</span>
                          <span className="text-gray-400">|</span>
                          <span className="text-green-600">{formatCurrency(os.valorDiaria + os.alimentacao)}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                  {item.colaborador.pix && (
                    <div className="mt-3 pt-3 border-t">
                      <p className="text-xs text-gray-500">PIX: <span className="font-medium text-gray-700">{item.colaborador.pix}</span></p>
                    </div>
                  )}
                </div>
              ))}

              {/* Resumo final */}
              <div className="card bg-gradient-to-r from-blue-50 to-green-50">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Colaboradores</p>
                    <p className="text-2xl font-bold text-gray-900">{colaboradoresComDiarias.length}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Diárias</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(colaboradoresComDiarias.reduce((sum, c) => sum + c.totalValorDiarias, 0))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total Alimentação</p>
                    <p className="text-2xl font-bold text-orange-600">
                      {formatCurrency(colaboradoresComDiarias.reduce((sum, c) => sum + c.totalAlimentacao, 0))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600">Total a Pagar</p>
                    <p className="text-2xl font-bold text-red-600">
                      {formatCurrency(colaboradoresComDiarias.reduce((sum, c) => sum + c.totalValorDiarias + c.totalAlimentacao, 0))}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">Nenhum colaborador trabalhou neste período</p>
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
