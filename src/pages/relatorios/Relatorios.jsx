import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, TrendingUp, TrendingDown, DollarSign, Users, 
  Calendar, BarChart3, MapPin, Target, Building2, Sun, 
  Loader2, Home, Layers, AlertCircle
} from 'lucide-react'

// ============================================
// FORMATAÇÃO
// ============================================
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value)
}

const formatPercent = (value) => {
  if (!value && value !== 0) return '0%'
  return `${value.toFixed(1)}%`
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================
const Relatorios = () => {
  // Filtros de data
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const ultimoDiaMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes.toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(ultimoDiaMes.toISOString().split('T')[0])
  const [abaAtiva, setAbaAtiva] = useState('resumo')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTelhado, setFiltroTelhado] = useState('')

  // Atalhos de período
  const setPeriodo = (tipo) => {
    const hoje = new Date()
    let inicio, fim

    switch (tipo) {
      case 'semana':
        const diaSemana = hoje.getDay()
        inicio = new Date(hoje)
        inicio.setDate(hoje.getDate() - diaSemana)
        fim = new Date(inicio)
        fim.setDate(inicio.getDate() + 6)
        break
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break
      case 'trimestre':
        const trimestre = Math.floor(hoje.getMonth() / 3)
        inicio = new Date(hoje.getFullYear(), trimestre * 3, 1)
        fim = new Date(hoje.getFullYear(), (trimestre + 1) * 3, 0)
        break
      case 'ano':
        inicio = new Date(hoje.getFullYear(), 0, 1)
        fim = new Date(hoje.getFullYear(), 11, 31)
        break
      default:
        return
    }

    setDataInicio(inicio.toISOString().split('T')[0])
    setDataFim(fim.toISOString().split('T')[0])
  }

  // ============================================
  // QUERY: BUSCAR OS DO PERÍODO
  // ============================================
  const { data: osData, isLoading: loadingOS, error: queryError } = useQuery({
    queryKey: ['relatorio-os', dataInicio, dataFim],
    queryFn: async () => {
      console.log('Buscando OS de', dataInicio, 'até', dataFim)
      
      // Query simples - sem filtros complexos
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select(`
          id,
          numero_os,
          data_agendamento,
          status,
          valor_total,
          quantidade_placas,
          tipo_telhado,
          potencia_kwp,
          endereco,
          cidade,
          cliente_id,
          equipe_id,
          cliente:clientes(id, nome),
          equipe:equipes(id, nome)
        `)
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)
        .order('data_agendamento', { ascending: false })

      if (error) {
        console.error('Erro ao buscar OS:', error)
        throw error
      }

      console.log('OS encontradas:', ordens?.length || 0)

      if (!ordens || ordens.length === 0) {
        return []
      }

      // Buscar colaboradores de cada OS
      const osIds = ordens.map(o => o.id)
      
      const { data: colaboradores } = await supabase
        .from('os_colaboradores')
        .select('ordem_servico_id, colaborador_id, valor_total, dias_trabalhados, valor_cafe, valor_almoco, valor_transporte, valor_outros')
        .in('ordem_servico_id', osIds)

      // Buscar veículos de cada OS
      const { data: veiculos } = await supabase
        .from('os_veiculos')
        .select('ordem_servico_id, valor_total')
        .in('ordem_servico_id', osIds)

      // Agrupar colaboradores por data para calcular rateio individual
      const colaboradoresPorData = {}
      colaboradores?.forEach(c => {
        // Buscar a data da OS deste colaborador
        const os = ordens.find(o => o.id === c.ordem_servico_id)
        if (os && os.data_agendamento) {
          const key = `${c.colaborador_id}_${os.data_agendamento}`
          if (!colaboradoresPorData[key]) colaboradoresPorData[key] = []
          colaboradoresPorData[key].push(c.ordem_servico_id)
        }
      })

      // Agrupar por OS
      const colaboradoresPorOS = (colaboradores || []).reduce((acc, c) => {
        if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = []
        acc[c.ordem_servico_id].push(c)
        return acc
      }, {})

      const veiculosPorOS = (veiculos || []).reduce((acc, v) => {
        if (!acc[v.ordem_servico_id]) acc[v.ordem_servico_id] = []
        acc[v.ordem_servico_id].push(v)
        return acc
      }, {})

      // Calcular rateio por data/equipe (para veículos)
      const osPorDataEquipe = {}
      ordens.forEach(os => {
        const key = `${os.data_agendamento}_${os.equipe_id || 'sem-equipe'}`
        if (!osPorDataEquipe[key]) osPorDataEquipe[key] = []
        osPorDataEquipe[key].push(os.id)
      })

      // Processar cada OS
      return ordens.map(os => {
        const keyEquipe = `${os.data_agendamento}_${os.equipe_id || 'sem-equipe'}`
        const totalOSEquipeDia = osPorDataEquipe[keyEquipe]?.length || 1

        // Custo de mão de obra - COM RATEIO POR COLABORADOR
        const colabs = colaboradoresPorOS[os.id] || []
        let custoMaoObraRateado = 0
        colabs.forEach(c => {
          const valorTotal = parseFloat(c.valor_total) || 0
          // Quantas OS este colaborador fez neste dia?
          const keyColab = `${c.colaborador_id}_${os.data_agendamento}`
          const qtdOSColabDia = colaboradoresPorData[keyColab]?.length || 1
          // Ratear o custo do colaborador pelo número de OS que ele fez no dia
          custoMaoObraRateado += valorTotal / qtdOSColabDia
        })

        // Custo de veículos - COM RATEIO POR EQUIPE/DIA
        const veics = veiculosPorOS[os.id] || []
        const custoVeiculoBruto = veics.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0)
        const custoVeiculoRateado = custoVeiculoBruto / totalOSEquipeDia

        // Totais
        const custoTotalRateado = custoMaoObraRateado + custoVeiculoRateado
        const receita = parseFloat(os.valor_total) || 0
        const lucro = receita - custoTotalRateado
        const margem = receita > 0 ? (lucro / receita) * 100 : 0

        return {
          ...os,
          cliente_id: os.cliente?.id || os.cliente_id,
          cliente_nome: os.cliente?.nome || 'Sem cliente',
          equipe_nome: os.equipe?.nome,
          receita,
          custo_mao_obra_rateado: custoMaoObraRateado,
          custo_veiculo_rateado: custoVeiculoRateado,
          custo_total_rateado: custoTotalRateado,
          lucro,
          margem,
          total_os_equipe_dia: totalOSEquipeDia
        }
      })
    },
    enabled: !!dataInicio && !!dataFim
  })

  // ============================================
  // CÁLCULOS E MÉTRICAS
  // ============================================

  const metricas = useMemo(() => {
    if (!osData || osData.length === 0) return null

    const totalOS = osData.length
    const osConcluidas = osData.filter(os => os.status === 'concluida').length
    const taxaConclusao = totalOS > 0 ? (osConcluidas / totalOS) * 100 : 0

    const receitaTotal = osData.reduce((sum, os) => sum + os.receita, 0)
    const custoMaoObra = osData.reduce((sum, os) => sum + os.custo_mao_obra_rateado, 0)
    const custoVeiculo = osData.reduce((sum, os) => sum + os.custo_veiculo_rateado, 0)
    const custoTotal = osData.reduce((sum, os) => sum + os.custo_total_rateado, 0)
    const lucroTotal = receitaTotal - custoTotal
    const margemMedia = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0
    const ticketMedio = totalOS > 0 ? receitaTotal / totalOS : 0

    const totalPlacas = osData.reduce((sum, os) => sum + (os.quantidade_placas || 0), 0)
    const custoMedioPorPlaca = totalPlacas > 0 ? custoTotal / totalPlacas : 0

    return {
      totalOS,
      osConcluidas,
      taxaConclusao,
      receitaTotal,
      custoMaoObra,
      custoVeiculo,
      custoTotal,
      lucroTotal,
      margemMedia,
      ticketMedio,
      totalPlacas,
      custoMedioPorPlaca
    }
  }, [osData])

  // Agrupar por cliente
  const custoPorCliente = useMemo(() => {
    if (!osData || osData.length === 0) return []

    const porCliente = osData.reduce((acc, os) => {
      const id = os.cliente_id || 'sem-cliente'
      if (!acc[id]) {
        acc[id] = {
          cliente_id: id,
          cliente_nome: os.cliente_nome,
          total_os: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
          placas: 0
        }
      }
      acc[id].total_os++
      acc[id].receita += os.receita
      acc[id].custo += os.custo_total_rateado
      acc[id].lucro += os.lucro
      acc[id].placas += os.quantidade_placas || 0
      return acc
    }, {})

    return Object.values(porCliente)
      .map(c => ({
        ...c,
        margem: c.receita > 0 ? (c.lucro / c.receita) * 100 : 0,
        custo_por_placa: c.placas > 0 ? c.custo / c.placas : 0
      }))
      .sort((a, b) => b.receita - a.receita)
  }, [osData])

  // Agrupar por endereço (OBRA = Cliente + Endereço)
  const custoPorObra = useMemo(() => {
    if (!osData || osData.length === 0) return []

    const porObra = osData.reduce((acc, os) => {
      const endereco = os.endereco || 'Sem endereço'
      const cidade = os.cidade || ''
      const chave = `${os.cliente_id || 'sem-cliente'}_${endereco}_${cidade}`.toLowerCase()
      
      if (!acc[chave]) {
        acc[chave] = {
          chave,
          cliente_id: os.cliente_id,
          cliente_nome: os.cliente_nome,
          endereco,
          cidade,
          potencia_kwp: os.potencia_kwp,
          total_os: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
          placas: 0,
          ordens: []
        }
      }

      acc[chave].total_os++
      if (os.receita > acc[chave].receita) {
        acc[chave].receita = os.receita
      }
      if (os.potencia_kwp > (acc[chave].potencia_kwp || 0)) {
        acc[chave].potencia_kwp = os.potencia_kwp
      }
      acc[chave].custo += os.custo_total_rateado
      acc[chave].placas += os.quantidade_placas || 0
      acc[chave].ordens.push(os)
      return acc
    }, {})

    return Object.values(porObra)
      .map(o => ({
        ...o,
        lucro: o.receita - o.custo,
        margem: o.receita > 0 ? ((o.receita - o.custo) / o.receita) * 100 : 0
      }))
      .sort((a, b) => b.receita - a.receita)
  }, [osData])

  // Agrupar por tipo de telhado
  const custoPorTelhado = useMemo(() => {
    if (!osData || osData.length === 0) return []

    const porTelhado = osData.reduce((acc, os) => {
      const tipo = os.tipo_telhado || 'Não informado'
      if (!acc[tipo]) {
        acc[tipo] = {
          tipo_telhado: tipo,
          total_os: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
          placas: 0
        }
      }
      acc[tipo].total_os++
      acc[tipo].receita += os.receita
      acc[tipo].custo += os.custo_total_rateado
      acc[tipo].lucro += os.lucro
      acc[tipo].placas += os.quantidade_placas || 0
      return acc
    }, {})

    return Object.values(porTelhado)
      .map(t => ({
        ...t,
        margem: t.receita > 0 ? (t.lucro / t.receita) * 100 : 0,
        custo_medio_os: t.total_os > 0 ? t.custo / t.total_os : 0
      }))
      .sort((a, b) => b.total_os - a.total_os)
  }, [osData])

  // Filtrar OS
  const osFiltradas = useMemo(() => {
    if (!osData || osData.length === 0) return []
    
    return osData.filter(os => {
      if (filtroCliente && os.cliente_id !== filtroCliente) return false
      if (filtroTelhado && os.tipo_telhado !== filtroTelhado) return false
      return true
    })
  }, [osData, filtroCliente, filtroTelhado])

  // ============================================
  // RENDERIZAÇÃO
  // ============================================

  if (loadingOS) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="card text-center py-12">
        <AlertCircle className="w-12 h-12 mx-auto text-red-400 mb-4" />
        <p className="text-red-600 font-medium">Erro ao carregar relatório</p>
        <p className="text-sm text-gray-500 mt-2">{queryError.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600">Análise financeira e operacional com rateio de custos</p>
      </div>

      {/* Filtros de Período */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {['semana', 'mes', 'trimestre', 'ano'].map(periodo => (
              <button
                key={periodo}
                onClick={() => setPeriodo(periodo)}
                className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors capitalize"
              >
                {periodo === 'mes' ? 'Mês' : periodo === 'trimestre' ? 'Trimestre' : periodo.charAt(0).toUpperCase() + periodo.slice(1)}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <div>
              <label className="text-xs text-gray-500">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      {metricas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Receita Bruta</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(metricas.receitaTotal)}</p>
              </div>
              <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-red-600">Custos Totais</p>
                <p className="text-2xl font-bold text-red-700">{formatCurrency(metricas.custoTotal)}</p>
              </div>
              <div className="w-12 h-12 bg-red-200 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className={`card bg-gradient-to-br ${metricas.lucroTotal >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${metricas.lucroTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Lucro</p>
                <p className={`text-2xl font-bold ${metricas.lucroTotal >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                  {formatCurrency(metricas.lucroTotal)}
                </p>
              </div>
              <div className={`w-12 h-12 ${metricas.lucroTotal >= 0 ? 'bg-blue-200' : 'bg-orange-200'} rounded-xl flex items-center justify-center`}>
                <DollarSign className={`w-6 h-6 ${metricas.lucroTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
              </div>
            </div>
          </div>

          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600">Margem</p>
                <p className={`text-2xl font-bold ${metricas.margemMedia >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  {formatPercent(metricas.margemMedia)}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mensagem se não houver dados */}
      {(!osData || osData.length === 0) && !loadingOS && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma OS encontrada no período selecionado</p>
          <p className="text-sm text-gray-400 mt-2">Tente ajustar as datas ou cadastrar novas ordens de serviço</p>
        </div>
      )}

      {/* Abas */}
      {metricas && (
        <>
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 overflow-x-auto">
              {[
                { id: 'resumo', label: 'Resumo DRE', icon: FileText },
                { id: 'clientes', label: 'Por Cliente', icon: Users },
                { id: 'obras', label: 'Por Endereço', icon: MapPin },
                { id: 'os', label: 'Por OS', icon: Building2 },
                { id: 'telhados', label: 'Por Telhado', icon: Home },
                { id: 'placas', label: 'Por Qtd Placas', icon: Sun },
              ].map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
                    abaAtiva === aba.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <aba.icon className="w-4 h-4" />
                  {aba.label}
                </button>
              ))}
            </nav>
          </div>

          {/* ABA: RESUMO DRE */}
          {abaAtiva === 'resumo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  Demonstrativo de Resultados
                </h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="font-medium text-gray-900">RECEITA BRUTA</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(metricas.receitaTotal)}</span>
                  </div>

                  <div className="pl-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">(-) Mão de Obra</span>
                      <span className="text-red-600">{formatCurrency(metricas.custoMaoObra)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">(-) Veículos</span>
                      <span className="text-red-600">{formatCurrency(metricas.custoVeiculo)}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2 border-t">
                    <span className="font-medium text-gray-700">TOTAL CUSTOS</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(metricas.custoTotal)}</span>
                  </div>

                  <div className={`flex justify-between items-center py-3 border-t-2 ${metricas.lucroTotal >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                    <span className="font-bold text-gray-900">LUCRO OPERACIONAL</span>
                    <span className={`text-xl font-bold ${metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metricas.lucroTotal)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-blue-600" />
                  Estatísticas
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Total de OS</p>
                    <p className="text-2xl font-bold text-gray-900">{metricas.totalOS}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Concluídas</p>
                    <p className="text-2xl font-bold text-green-600">{metricas.osConcluidas}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Taxa Conclusão</p>
                    <p className="text-2xl font-bold text-blue-600">{formatPercent(metricas.taxaConclusao)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-500">Ticket Médio</p>
                    <p className="text-2xl font-bold text-purple-600">{formatCurrency(metricas.ticketMedio)}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-xl">
                    <p className="text-sm text-yellow-600">Total Placas</p>
                    <p className="text-2xl font-bold text-yellow-700">{metricas.totalPlacas}</p>
                  </div>
                  <div className="p-4 bg-yellow-50 rounded-xl">
                    <p className="text-sm text-yellow-600">Custo/Placa</p>
                    <p className="text-2xl font-bold text-yellow-700">{formatCurrency(metricas.custoMedioPorPlaca)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ABA: POR CLIENTE */}
          {abaAtiva === 'clientes' && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                Custo por Cliente (com Rateio)
              </h3>
              
              {custoPorCliente.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">OS</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Placas</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receita</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo Rateado</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lucro</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custoPorCliente.map((cliente, idx) => (
                        <tr key={cliente.cliente_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{cliente.cliente_nome}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{cliente.total_os}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{cliente.placas || '-'}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(cliente.receita)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(cliente.custo)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${cliente.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(cliente.lucro)}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${cliente.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(cliente.margem)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhum cliente encontrado no período
                </div>
              )}
            </div>
          )}

          {/* ABA: POR ENDEREÇO/OBRA */}
          {abaAtiva === 'obras' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3">
                  <Layers className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="font-medium text-blue-800">Agrupamento por Obra</p>
                    <p className="text-sm text-blue-600">
                      A receita é contada <strong>uma vez por obra</strong> (Cliente + Endereço).
                      Os custos são somados de todas as OS da obra.
                    </p>
                  </div>
                </div>
              </div>

              <div className="card overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-blue-600" />
                  Custo por Endereço/Obra ({custoPorObra.length} obras)
                </h3>
                
                {custoPorObra.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente / Endereço</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">OS</th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">kWp</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receita</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lucro</th>
                          <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {custoPorObra.map((obra, idx) => (
                          <tr key={obra.chave} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3">
                              <div className="font-medium text-gray-900">{obra.cliente_nome}</div>
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {obra.endereco}{obra.cidade ? ` - ${obra.cidade}` : ''}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                                {obra.total_os}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-center text-gray-600">
                              {obra.potencia_kwp ? `${obra.potencia_kwp} kWp` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(obra.receita)}</td>
                            <td className="px-4 py-3 text-right text-red-600">{formatCurrency(obra.custo)}</td>
                            <td className={`px-4 py-3 text-right font-bold ${obra.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(obra.lucro)}
                            </td>
                            <td className={`px-4 py-3 text-right font-medium ${obra.margem >= 20 ? 'text-green-600' : obra.margem >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                              {formatPercent(obra.margem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma obra encontrada no período
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: POR OS */}
          {abaAtiva === 'os' && (
            <div className="space-y-4">
              {/* Filtros */}
              <div className="card">
                <div className="flex flex-wrap gap-4">
                  <div className="min-w-[200px]">
                    <label className="text-sm text-gray-500">Filtrar por Cliente</label>
                    <select
                      value={filtroCliente}
                      onChange={(e) => setFiltroCliente(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Todos os clientes</option>
                      {custoPorCliente.map(c => (
                        <option key={c.cliente_id} value={c.cliente_id}>{c.cliente_nome}</option>
                      ))}
                    </select>
                  </div>
                  <div className="min-w-[200px]">
                    <label className="text-sm text-gray-500">Filtrar por Telhado</label>
                    <select
                      value={filtroTelhado}
                      onChange={(e) => setFiltroTelhado(e.target.value)}
                      className="input-field"
                    >
                      <option value="">Todos os telhados</option>
                      {custoPorTelhado.filter(t => t.tipo_telhado !== 'Não informado').map(t => (
                        <option key={t.tipo_telhado} value={t.tipo_telhado}>{t.tipo_telhado}</option>
                      ))}
                    </select>
                  </div>
                  {(filtroCliente || filtroTelhado) && (
                    <button 
                      onClick={() => { setFiltroCliente(''); setFiltroTelhado(''); }}
                      className="self-end px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Limpar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Tabela de OS */}
              <div className="card overflow-hidden">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-600" />
                  Detalhamento por OS (com Rateio)
                  {(filtroCliente || filtroTelhado) && (
                    <span className="text-sm font-normal text-gray-500">
                      ({osFiltradas.length} de {osData?.length} OS)
                    </span>
                  )}
                </h3>
                
                {osFiltradas.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Data</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">OS</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold text-gray-700">Cliente</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Placas</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700">Telhado</th>
                          <th className="px-3 py-3 text-center text-xs font-semibold text-gray-700 bg-yellow-50">Rateio</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">Receita</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">M.Obra</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">Veículo</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 bg-red-50">Custo Total</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 bg-blue-50">Lucro</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">Margem</th>
                        </tr>
                      </thead>
                      <tbody>
                        {osFiltradas.map((os, idx) => (
                          <tr key={os.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-sm text-gray-600">
                              {os.data_agendamento ? new Date(os.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-gray-900">
                              {os.numero_os || os.id.slice(0, 8)}
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-700">{os.cliente_nome}</td>
                            <td className="px-3 py-2 text-sm text-center text-gray-600">{os.quantidade_placas || '-'}</td>
                            <td className="px-3 py-2 text-sm text-center text-gray-600">{os.tipo_telhado || '-'}</td>
                            <td className="px-3 py-2 text-sm text-center bg-yellow-50">
                              {os.total_os_equipe_dia > 1 ? (
                                <span className="px-2 py-1 bg-yellow-200 text-yellow-800 rounded-full text-xs font-medium">
                                  ÷{os.total_os_equipe_dia}
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-green-600 font-medium">
                              {formatCurrency(os.receita)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-red-500">
                              {formatCurrency(os.custo_mao_obra_rateado)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right text-red-500">
                              {formatCurrency(os.custo_veiculo_rateado)}
                            </td>
                            <td className="px-3 py-2 text-sm text-right bg-red-50 text-red-600 font-medium">
                              {formatCurrency(os.custo_total_rateado)}
                            </td>
                            <td className={`px-3 py-2 text-sm text-right bg-blue-50 font-bold ${os.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(os.lucro)}
                            </td>
                            <td className={`px-3 py-2 text-sm text-right font-medium ${os.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(os.margem)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Nenhuma OS encontrada para os filtros selecionados
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ABA: POR TELHADO */}
          {abaAtiva === 'telhados' && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Home className="w-5 h-5 text-blue-600" />
                Análise por Tipo de Telhado
              </h3>
              
              {custoPorTelhado.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Tipo de Telhado</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qtd OS</th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Placas</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receita Total</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo Total</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo Médio/OS</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem Média</th>
                      </tr>
                    </thead>
                    <tbody>
                      {custoPorTelhado.map((item, idx) => (
                        <tr key={item.tipo_telhado} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.tipo_telhado}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.total_os}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.placas || '-'}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(item.receita)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(item.custo)}</td>
                          <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(item.custo_medio_os)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${item.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(item.margem)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Nenhuma OS com tipo de telhado informado
                </div>
              )}
            </div>
          )}

          {/* ABA: POR QUANTIDADE DE PLACAS */}
          {abaAtiva === 'placas' && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Sun className="w-5 h-5 text-yellow-500" />
                Análise por Quantidade de Placas
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Faixa de Placas</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Qtd OS</th>
                      <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Total Placas</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receita Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lucro Total</th>
                      <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem Média</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osData && (() => {
                      const getFaixa = (qtd) => {
                        if (!qtd || qtd <= 0) return null
                        if (qtd <= 10) return '01-10 placas'
                        if (qtd <= 20) return '11-20 placas'
                        if (qtd <= 30) return '21-30 placas'
                        if (qtd <= 50) return '31-50 placas'
                        return '51+ placas'
                      }

                      const porFaixa = osData.reduce((acc, os) => {
                        const faixa = getFaixa(os.quantidade_placas)
                        if (!faixa) return acc
                        if (!acc[faixa]) {
                          acc[faixa] = { faixa, total_os: 0, receita: 0, custo: 0, lucro: 0, placas: 0 }
                        }
                        acc[faixa].total_os++
                        acc[faixa].receita += os.receita
                        acc[faixa].custo += os.custo_total_rateado
                        acc[faixa].lucro += os.lucro
                        acc[faixa].placas += os.quantidade_placas || 0
                        return acc
                      }, {})

                      const faixas = Object.values(porFaixa)
                        .map(f => ({ ...f, margem: f.receita > 0 ? (f.lucro / f.receita) * 100 : 0 }))
                        .sort((a, b) => a.faixa.localeCompare(b.faixa))

                      return faixas.map((item, idx) => (
                        <tr key={item.faixa} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{item.faixa}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.total_os}</td>
                          <td className="px-4 py-3 text-center text-gray-600">{item.placas}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(item.receita)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(item.custo)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${item.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                            {formatCurrency(item.lucro)}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${item.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercent(item.margem)}
                          </td>
                        </tr>
                      ))
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Relatorios
