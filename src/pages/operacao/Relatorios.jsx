import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, TrendingUp, TrendingDown, DollarSign, Users, Car, Wrench,
  Calendar, Filter, Download, ChevronDown, ChevronUp, BarChart3,
  PieChart, Target, Building2, Sun, Loader2, ArrowUpRight, ArrowDownRight,
  Home, Layers, MapPin
} from 'lucide-react'

// ============================================
// FORMATAÇÃO DE MOEDA
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
  const [obrasExpandidas, setObrasExpandidas] = useState({})

  // Toggle expansão de obra
  const toggleObra = (obraKey) => {
    setObrasExpandidas(prev => ({
      ...prev,
      [obraKey]: !prev[obraKey]
    }))
  }

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
  // QUERIES
  // ============================================

  // Buscar OS do período com custos rateados
  const { data: osData, isLoading: loadingOS } = useQuery({
    queryKey: ['relatorio-os', dataInicio, dataFim],
    queryFn: async () => {
      // Buscar todas as OS do período
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select(`
          id, numero, data_agendamento, status, valor_total,
          quantidade_placas, tipo_telhado, potencia_kwp, tipo_servico_solar,
          cliente_endereco_id, endereco, cidade, estado,
          cliente:clientes(id, nome),
          empresa:empresas_contratantes(id, nome),
          equipe:equipes(id, nome)
        `)
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)
        .order('data_agendamento', { ascending: false })

      if (error) throw error

      // Buscar colaboradores de todas as OS
      const osIds = ordens?.map(o => o.id) || []
      
      const { data: colaboradores } = await supabase
        .from('os_colaboradores')
        .select('ordem_servico_id, valor_total, dias_trabalhados')
        .in('ordem_servico_id', osIds)

      // Buscar veículos de todas as OS
      const { data: veiculos } = await supabase
        .from('os_veiculos')
        .select('ordem_servico_id, veiculo_id, valor_total, dias')
        .in('ordem_servico_id', osIds)

      // Buscar custos extras de todas as OS
      const { data: custosExtras } = await supabase
        .from('os_custos_extras')
        .select('ordem_servico_id, valor')
        .in('ordem_servico_id', osIds)

      // Agrupar colaboradores por OS
      const colaboradoresPorOS = colaboradores?.reduce((acc, c) => {
        if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = []
        acc[c.ordem_servico_id].push(c)
        return acc
      }, {}) || {}

      // Agrupar veículos por OS
      const veiculosPorOS = veiculos?.reduce((acc, v) => {
        if (!acc[v.ordem_servico_id]) acc[v.ordem_servico_id] = []
        acc[v.ordem_servico_id].push(v)
        return acc
      }, {}) || {}

      // Agrupar custos extras por OS
      const custosPorOS = custosExtras?.reduce((acc, c) => {
        if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = 0
        acc[c.ordem_servico_id] += parseFloat(c.valor) || 0
        return acc
      }, {}) || {}

      // Calcular rateio por data/equipe
      const osPorDataEquipe = {}
      ordens?.forEach(os => {
        const key = `${os.data_agendamento}_${os.equipe?.id || 'sem-equipe'}`
        if (!osPorDataEquipe[key]) osPorDataEquipe[key] = []
        osPorDataEquipe[key].push(os.id)
      })

      // Calcular rateio por data/veículo
      const osPorDataVeiculo = {}
      veiculos?.forEach(v => {
        const os = ordens?.find(o => o.id === v.ordem_servico_id)
        if (os) {
          const key = `${os.data_agendamento}_${v.veiculo_id}`
          if (!osPorDataVeiculo[key]) osPorDataVeiculo[key] = new Set()
          osPorDataVeiculo[key].add(v.ordem_servico_id)
        }
      })

      // Processar cada OS com custos rateados
      const ordensProcessadas = ordens?.map(os => {
        const keyEquipe = `${os.data_agendamento}_${os.equipe?.id || 'sem-equipe'}`
        const totalOSEquipeDia = osPorDataEquipe[keyEquipe]?.length || 1

        // Custo de mão de obra
        const custoMaoObraBruto = colaboradoresPorOS[os.id]?.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0) || 0
        const custoMaoObraRateado = custoMaoObraBruto / totalOSEquipeDia

        // Custo de veículos (ratear por quantas OS usaram o mesmo veículo no dia)
        let custoVeiculoBruto = 0
        let custoVeiculoRateado = 0
        
        veiculosPorOS[os.id]?.forEach(v => {
          const valorVeiculo = parseFloat(v.valor_total) || 0
          custoVeiculoBruto += valorVeiculo
          
          const keyVeiculo = `${os.data_agendamento}_${v.veiculo_id}`
          const totalOSVeiculoDia = osPorDataVeiculo[keyVeiculo]?.size || 1
          custoVeiculoRateado += valorVeiculo / totalOSVeiculoDia
        })

        // Custos extras (não são rateados)
        const custoExtras = custosPorOS[os.id] || 0

        // Totais
        const custoTotalRateado = custoMaoObraRateado + custoVeiculoRateado + custoExtras
        const receita = parseFloat(os.valor_total) || 0
        const lucro = receita - custoTotalRateado
        const margem = receita > 0 ? (lucro / receita) * 100 : 0

        return {
          ...os,
          cliente_id: os.cliente?.id,
          cliente_nome: os.cliente?.nome || 'Sem cliente',
          empresa_nome: os.empresa?.nome,
          equipe_nome: os.equipe?.nome,
          receita,
          custo_mao_obra_bruto: custoMaoObraBruto,
          custo_mao_obra_rateado: custoMaoObraRateado,
          custo_veiculo_bruto: custoVeiculoBruto,
          custo_veiculo_rateado: custoVeiculoRateado,
          custo_extras: custoExtras,
          custo_total_rateado: custoTotalRateado,
          lucro,
          margem,
          total_os_equipe_dia: totalOSEquipeDia
        }
      }) || []

      return ordensProcessadas
    },
    enabled: !!dataInicio && !!dataFim
  })

  // Buscar colaboradores do período
  const { data: colaboradoresData } = useQuery({
    queryKey: ['relatorio-colaboradores', dataInicio, dataFim],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_colaboradores')
        .select(`
          colaborador_id, dias_trabalhados, valor_total,
          colaborador:colaboradores(nome),
          ordem_servico:ordens_servico!inner(data_agendamento)
        `)
        .gte('ordem_servico.data_agendamento', dataInicio)
        .lte('ordem_servico.data_agendamento', dataFim)

      // Agrupar por colaborador
      const porColaborador = data?.reduce((acc, c) => {
        const id = c.colaborador_id
        if (!acc[id]) {
          acc[id] = {
            nome: c.colaborador?.nome || 'Desconhecido',
            dias: 0,
            valor: 0
          }
        }
        acc[id].dias += parseFloat(c.dias_trabalhados) || 0
        acc[id].valor += parseFloat(c.valor_total) || 0
        return acc
      }, {}) || {}

      return Object.entries(porColaborador)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.dias - a.dias)
    }
  })

  // ============================================
  // CÁLCULOS E MÉTRICAS
  // ============================================

  const metricas = useMemo(() => {
    if (!osData) return null

    const totalOS = osData.length
    const osConcluidas = osData.filter(os => os.status === 'concluida').length
    const taxaConclusao = totalOS > 0 ? (osConcluidas / totalOS) * 100 : 0

    const receitaTotal = osData.reduce((sum, os) => sum + os.receita, 0)
    const custoMaoObra = osData.reduce((sum, os) => sum + os.custo_mao_obra_rateado, 0)
    const custoVeiculo = osData.reduce((sum, os) => sum + os.custo_veiculo_rateado, 0)
    const custoExtras = osData.reduce((sum, os) => sum + os.custo_extras, 0)
    const custoTotal = osData.reduce((sum, os) => sum + os.custo_total_rateado, 0)
    const lucroTotal = receitaTotal - custoTotal
    const margemMedia = receitaTotal > 0 ? (lucroTotal / receitaTotal) * 100 : 0
    const ticketMedio = totalOS > 0 ? receitaTotal / totalOS : 0

    // Total de placas
    const totalPlacas = osData.reduce((sum, os) => sum + (os.quantidade_placas || 0), 0)
    const custoMedioPorPlaca = totalPlacas > 0 ? custoTotal / totalPlacas : 0

    return {
      totalOS,
      osConcluidas,
      taxaConclusao,
      receitaTotal,
      custoMaoObra,
      custoVeiculo,
      custoExtras,
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
    if (!osData) return []

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

  // Agrupar por OBRA (mesmo cliente + mesmo endereço)
  const custoPorObra = useMemo(() => {
    if (!osData) return []

    const porObra = osData.reduce((acc, os) => {
      // Criar chave única: cliente_id + endereço normalizado
      const enderecoKey = `${os.endereco || ''}_${os.cidade || ''}_${os.estado || ''}`.toLowerCase().trim()
      const key = `${os.cliente_id || 'sem-cliente'}_${enderecoKey}`
      
      if (!acc[key]) {
        acc[key] = {
          key,
          cliente_id: os.cliente_id,
          cliente_nome: os.cliente_nome,
          endereco: os.endereco || 'Sem endereço',
          cidade: os.cidade || '',
          estado: os.estado || '',
          total_os: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
          placas: 0,
          os_list: [] // Lista de OS desta obra
        }
      }
      acc[key].total_os++
      acc[key].receita += os.receita
      acc[key].custo += os.custo_total_rateado
      acc[key].lucro += os.lucro
      acc[key].placas += os.quantidade_placas || 0
      acc[key].os_list.push(os)
      return acc
    }, {})

    return Object.values(porObra)
      .map(o => ({
        ...o,
        margem: o.receita > 0 ? (o.lucro / o.receita) * 100 : 0,
        custo_por_placa: o.placas > 0 ? o.custo / o.placas : 0
      }))
      .sort((a, b) => b.receita - a.receita)
  }, [osData])

  // Agrupar por tipo de telhado
  const custoPorTelhado = useMemo(() => {
    if (!osData) return []

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
        custo_por_placa: t.placas > 0 ? t.custo / t.placas : 0,
        custo_medio_os: t.total_os > 0 ? t.custo / t.total_os : 0
      }))
      .sort((a, b) => b.total_os - a.total_os)
  }, [osData])

  // Agrupar por faixa de placas
  const custoPorFaixaPlacas = useMemo(() => {
    if (!osData) return []

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
        acc[faixa] = {
          faixa,
          total_os: 0,
          receita: 0,
          custo: 0,
          lucro: 0,
          placas: 0
        }
      }
      acc[faixa].total_os++
      acc[faixa].receita += os.receita
      acc[faixa].custo += os.custo_total_rateado
      acc[faixa].lucro += os.lucro
      acc[faixa].placas += os.quantidade_placas || 0
      return acc
    }, {})

    return Object.values(porFaixa)
      .map(f => ({
        ...f,
        margem: f.receita > 0 ? (f.lucro / f.receita) * 100 : 0,
        custo_por_placa: f.placas > 0 ? f.custo / f.placas : 0
      }))
      .sort((a, b) => a.faixa.localeCompare(b.faixa))
  }, [osData])

  // Filtrar OS por cliente/telhado
  const osFiltradas = useMemo(() => {
    if (!osData) return []
    
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Análise financeira e operacional com rateio de custos</p>
        </div>
      </div>

      {/* Filtros de Período */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          {/* Atalhos */}
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

          {/* Datas */}
          <div className="flex items-center gap-2 ml-auto">
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
                <p className={`text-sm ${metricas.lucroTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Lucro Operacional</p>
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
                <p className="text-sm text-purple-600">Margem de Lucro</p>
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

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {[
            { id: 'resumo', label: 'Resumo DRE', icon: FileText },
            { id: 'clientes', label: 'Por Cliente', icon: Users },
            { id: 'enderecos', label: 'Por Endereço', icon: MapPin },
            { id: 'obras', label: 'Por OS', icon: Building2 },
            { id: 'telhados', label: 'Por Telhado', icon: Home },
            { id: 'placas', label: 'Por Qtd Placas', icon: Sun },
            { id: 'colaboradores', label: 'Colaboradores', icon: Users }
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors whitespace-nowrap ${
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

      {/* Conteúdo das Abas */}
      <div className="space-y-6">
        {/* ABA: RESUMO DRE */}
        {abaAtiva === 'resumo' && metricas && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DRE */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                DRE - Demonstrativo de Resultado
              </h3>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2">
                  <span className="font-medium text-gray-700">RECEITA BRUTA</span>
                  <span className="font-bold text-gray-900">{formatCurrency(metricas.receitaTotal)}</span>
                </div>
                
                <div className="border-t pt-2">
                  <p className="text-sm text-gray-500 mb-2">(-) Custos Operacionais</p>
                  <div className="space-y-2 pl-4">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Mão de Obra</span>
                      <span className="text-red-600">- {formatCurrency(metricas.custoMaoObra)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Veículos (Aluguel + Combustível + Gelo)</span>
                      <span className="text-red-600">- {formatCurrency(metricas.custoVeiculo)}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-gray-600">Custos Extras</span>
                      <span className="text-red-600">- {formatCurrency(metricas.custoExtras)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between items-center py-1 bg-red-50 px-2 rounded">
                    <span className="font-medium text-red-700">Total Custos</span>
                    <span className="font-bold text-red-700">- {formatCurrency(metricas.custoTotal)}</span>
                  </div>
                </div>

                <div className={`border-t-2 pt-3 ${metricas.lucroTotal >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-gray-900">LUCRO OPERACIONAL</span>
                    <span className={`text-xl font-bold ${metricas.lucroTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(metricas.lucroTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="card">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-blue-600" />
                Estatísticas do Período
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
                  <p className="text-sm text-gray-500">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold text-blue-600">{formatPercent(metricas.taxaConclusao)}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-sm text-gray-500">Ticket Médio</p>
                  <p className="text-2xl font-bold text-purple-600">{formatCurrency(metricas.ticketMedio)}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <p className="text-sm text-yellow-600">Total de Placas</p>
                  <p className="text-2xl font-bold text-yellow-700">{metricas.totalPlacas}</p>
                </div>
                <div className="p-4 bg-yellow-50 rounded-xl">
                  <p className="text-sm text-yellow-600">Custo/Placa</p>
                  <p className="text-2xl font-bold text-yellow-700">{formatCurrency(metricas.custoMedioPorPlaca)}</p>
                </div>
              </div>
            </div>

            {/* Top Colaboradores */}
            {colaboradoresData && colaboradoresData.length > 0 && (
              <div className="card lg:col-span-2">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Users className="w-5 h-5 text-blue-600" />
                  Top 5 Colaboradores (por Dias Trabalhados)
                </h3>
                
                <div className="space-y-3">
                  {colaboradoresData.slice(0, 5).map((col, idx) => (
                    <div key={col.id} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold ${
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-300'
                      }`}>
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{col.nome}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-500 rounded-full h-2" 
                            style={{ width: `${Math.min((col.dias / (colaboradoresData[0]?.dias || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">{col.dias} dias</p>
                        <p className="text-sm text-gray-500">{formatCurrency(col.valor)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ABA: POR CLIENTE */}
        {abaAtiva === 'clientes' && (
          <div className="card overflow-hidden">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Custo por Cliente (com Rateio)
            </h3>
            
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
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">R$/Placa</th>
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
                      <td className="px-4 py-3 text-right text-purple-600">
                        {cliente.placas > 0 ? formatCurrency(cliente.custo_por_placa) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ABA: POR ENDEREÇO (OBRA) */}
        {abaAtiva === 'enderecos' && (
          <div className="space-y-4">
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-blue-600" />
                Custo por Endereço/Obra
                <span className="text-sm font-normal text-gray-500">
                  ({custoPorObra.length} obras)
                </span>
              </h3>
              
              <p className="text-sm text-gray-500 mb-4">
                Clique em uma obra para ver todas as OS relacionadas
              </p>

              <div className="space-y-3">
                {custoPorObra.map((obra) => (
                  <div key={obra.key} className="border border-gray-200 rounded-xl overflow-hidden">
                    {/* Cabeçalho da Obra - Clicável */}
                    <div 
                      onClick={() => toggleObra(obra.key)}
                      className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{obra.cliente_nome}</span>
                            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                              {obra.total_os} OS
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 flex items-center gap-1 mt-1">
                            <MapPin className="w-4 h-4" />
                            {obra.endereco}{obra.cidade ? `, ${obra.cidade}` : ''}{obra.estado ? `/${obra.estado}` : ''}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Receita</p>
                            <p className="font-semibold text-green-600">{formatCurrency(obra.receita)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Custo</p>
                            <p className="font-semibold text-red-600">{formatCurrency(obra.custo)}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Lucro</p>
                            <p className={`font-bold ${obra.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              {formatCurrency(obra.lucro)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Margem</p>
                            <p className={`font-semibold ${obra.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercent(obra.margem)}
                            </p>
                          </div>
                          {obrasExpandidas[obra.key] ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Lista de OS da Obra - Expansível */}
                    {obrasExpandidas[obra.key] && (
                      <div className="border-t border-gray-200">
                        <table className="w-full">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Data</th>
                              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">OS</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Status</th>
                              <th className="px-4 py-2 text-center text-xs font-semibold text-gray-600">Placas</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Receita</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Custo</th>
                              <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Lucro</th>
                            </tr>
                          </thead>
                          <tbody>
                            {obra.os_list.map((os, idx) => (
                              <tr key={os.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-4 py-2 text-sm text-gray-600">
                                  {os.data_agendamento ? new Date(os.data_agendamento).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td className="px-4 py-2 text-sm font-medium text-gray-900">
                                  {os.numero || os.id?.slice(0, 8)}
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    os.status === 'concluida' ? 'bg-green-100 text-green-700' :
                                    os.status === 'em_execucao' ? 'bg-yellow-100 text-yellow-700' :
                                    os.status === 'confirmada' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {os.status}
                                  </span>
                                </td>
                                <td className="px-4 py-2 text-sm text-center text-gray-600">
                                  {os.quantidade_placas || '-'}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-green-600">
                                  {formatCurrency(os.receita)}
                                </td>
                                <td className="px-4 py-2 text-sm text-right text-red-600">
                                  {formatCurrency(os.custo_total_rateado)}
                                </td>
                                <td className={`px-4 py-2 text-sm text-right font-medium ${os.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                  {formatCurrency(os.lucro)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-blue-50 font-semibold">
                              <td colSpan={4} className="px-4 py-2 text-sm text-gray-700">
                                TOTAL DA OBRA
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-green-700">
                                {formatCurrency(obra.receita)}
                              </td>
                              <td className="px-4 py-2 text-sm text-right text-red-700">
                                {formatCurrency(obra.custo)}
                              </td>
                              <td className={`px-4 py-2 text-sm text-right ${obra.lucro >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                                {formatCurrency(obra.lucro)}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))}

                {custoPorObra.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                    <p>Nenhuma obra encontrada no período</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ABA: POR OS */}
        {abaAtiva === 'obras' && (
          <div className="space-y-4">
            {/* Filtros */}
            <div className="card">
              <div className="flex flex-wrap gap-4">
                <div>
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
                <div>
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
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">Extras</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 bg-red-50">Custo Total</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700 bg-blue-50">Lucro</th>
                      <th className="px-3 py-3 text-right text-xs font-semibold text-gray-700">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {osFiltradas.map((os, idx) => (
                      <tr key={os.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-3 py-2 text-sm text-gray-600">
                          {os.data_agendamento ? new Date(os.data_agendamento).toLocaleDateString('pt-BR') : '-'}
                        </td>
                        <td className="px-3 py-2 text-sm font-medium text-gray-900">
                          {os.numero || os.id.slice(0, 8)}
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
                        <td className="px-3 py-2 text-sm text-right text-red-500">
                          {formatCurrency(os.custo_extras)}
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

              {osFiltradas.length === 0 && (
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
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">R$/Placa</th>
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
                      <td className="px-4 py-3 text-right text-purple-600">
                        {item.placas > 0 ? formatCurrency(item.custo_por_placa) : '-'}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${item.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(item.margem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {custoPorTelhado.length === 0 && (
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
              Análise por Quantidade de Placas (para precificação)
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
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700 bg-yellow-50">Custo/Placa</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lucro Total</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem Média</th>
                  </tr>
                </thead>
                <tbody>
                  {custoPorFaixaPlacas.map((item, idx) => (
                    <tr key={item.faixa} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.faixa}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.total_os}</td>
                      <td className="px-4 py-3 text-center text-gray-600">{item.placas}</td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(item.receita)}</td>
                      <td className="px-4 py-3 text-right text-red-600">{formatCurrency(item.custo)}</td>
                      <td className="px-4 py-3 text-right bg-yellow-50 text-yellow-700 font-bold">
                        {formatCurrency(item.custo_por_placa)}
                      </td>
                      <td className={`px-4 py-3 text-right font-bold ${item.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {formatCurrency(item.lucro)}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${item.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatPercent(item.margem)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {custoPorFaixaPlacas.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Sun className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p>Nenhuma OS com quantidade de placas informada</p>
                <p className="text-sm mt-2">Preencha o campo "Quantidade de Placas" nas OS para ver esta análise</p>
              </div>
            )}

            {/* Dica de precificação */}
            {custoPorFaixaPlacas.length > 0 && (
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <h4 className="font-semibold text-blue-800 mb-2">💡 Dica para Precificação</h4>
                <p className="text-sm text-blue-700">
                  Use o <strong>Custo/Placa</strong> de cada faixa como base para calcular seu preço de venda.
                  Por exemplo, se o custo médio é {formatCurrency(custoPorFaixaPlacas[0]?.custo_por_placa || 0)}/placa,
                  adicione sua margem desejada para definir o preço por placa instalada.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ABA: COLABORADORES */}
        {abaAtiva === 'colaboradores' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              Colaboradores no Período
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">#</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Colaborador</th>
                    <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Dias Trabalhados</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Valor Total</th>
                    <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Média/Dia</th>
                  </tr>
                </thead>
                <tbody>
                  {colaboradoresData?.map((col, idx) => (
                    <tr key={col.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-4 py-3">
                        <span className={`w-6 h-6 inline-flex items-center justify-center rounded-full text-white text-xs font-bold ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : idx === 2 ? 'bg-orange-400' : 'bg-gray-300'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{col.nome}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full font-medium">
                          {col.dias} dias
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(col.valor)}</td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {col.dias > 0 ? formatCurrency(col.valor / col.dias) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {(!colaboradoresData || colaboradoresData.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                Nenhum colaborador trabalhou no período selecionado
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default Relatorios
