import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, TrendingUp, TrendingDown, DollarSign, Users, 
  BarChart3, MapPin, Target, Building2, 
  Loader2, Layers, AlertCircle, ChevronDown, ChevronUp,
  Search, X, Filter
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
  const hoje = new Date()
  const primeiroDiaAno = new Date(hoje.getFullYear(), 0, 1)

  const [dataInicio, setDataInicio] = useState(primeiroDiaAno.toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0])
  const [abaAtiva, setAbaAtiva] = useState('resumo')
  const [filtroCliente, setFiltroCliente] = useState('')
  const [obraExpandida, setObraExpandida] = useState(null)
  const [busca, setBusca] = useState('')
  const [mostrarFiltros, setMostrarFiltros] = useState(false)

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
  // QUERY: BUSCAR FAIXAS DE PREÇO
  // ============================================
  const { data: faixasPreco } = useQuery({
    queryKey: ['faixas-preco-venda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faixas_preco_venda')
        .select('id, placas_min, placas_max, valor_por_placa, descricao, ativo')
        .eq('ativo', true)
        .not('placas_min', 'is', null)
        .order('placas_min')
      
      if (error) {
        console.error('Erro ao buscar faixas:', error)
        return []
      }
      return data || []
    }
  })

  // ============================================
  // QUERY: BUSCAR CLIENTES PARA FILTRO
  // ============================================
  const { data: clientesLista } = useQuery({
    queryKey: ['clientes-lista'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      return data || []
    }
  })

  // ============================================
  // QUERY: BUSCAR OS DO PERÍODO
  // ============================================
  const { data: osData, isLoading: loadingOS, error: queryError } = useQuery({
    queryKey: ['relatorio-os-v4', dataInicio, dataFim],
    queryFn: async () => {
      console.log('🔍 Buscando OS de', dataInicio, 'até', dataFim)
      
      // Query simples
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, data_agendamento, status, valor_total, valor_cobrado, quantidade_placas, tipo_telhado, potencia_kwp, endereco, cidade, cliente_id, equipe_id, custo_previsto')
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('data_agendamento', { ascending: false })

      if (error) {
        console.error('❌ Erro ao buscar OS:', error)
        throw error
      }

      console.log('✅ OS encontradas:', ordens?.length || 0)

      if (!ordens || ordens.length === 0) {
        return { ordens: [], colaboradores: [], veiculos: [], clientes: {} }
      }

      // Buscar nomes dos clientes
      const clienteIds = [...new Set(ordens.map(o => o.cliente_id).filter(Boolean))]
      let clientesMap = {}
      
      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase
          .from('clientes')
          .select('id, nome')
          .in('id', clienteIds)
        
        clientesMap = (clientes || []).reduce((acc, c) => {
          acc[c.id] = c.nome
          return acc
        }, {})
      }

      // Buscar colaboradores
      const osIds = ordens.map(o => o.id)
      
      const { data: colaboradores } = await supabase
        .from('os_colaboradores')
        .select('ordem_servico_id, colaborador_id, valor_total, dias_trabalhados')
        .in('ordem_servico_id', osIds)

      // Buscar veículos (campos individuais, mesma lógica da listagem)
      const { data: veiculos } = await supabase
        .from('os_veiculos')
        .select('ordem_servico_id, valor_aluguel, valor_gasolina, valor_gelo, valor_cafe, dias, valor_total')
        .in('ordem_servico_id', osIds)

      console.log('📊 Colaboradores:', colaboradores?.length || 0, 'Veículos:', veiculos?.length || 0)

      return { 
        ordens, 
        colaboradores: colaboradores || [], 
        veiculos: veiculos || [],
        clientes: clientesMap
      }
    },
    enabled: !!dataInicio && !!dataFim
  })

  // ============================================
  // PROCESSAR DADOS
  // ============================================
  const dadosProcessados = useMemo(() => {
    if (!osData || !osData.ordens || osData.ordens.length === 0) {
      return { osProcessadas: [], obras: [], metricas: null }
    }

    const { ordens, colaboradores, veiculos, clientes } = osData

    // Agrupar colaboradores por data para rateio
    const colaboradoresPorData = {}
    colaboradores.forEach(c => {
      const os = ordens.find(o => o.id === c.ordem_servico_id)
      if (os && os.data_agendamento && c.colaborador_id) {
        const key = `${c.colaborador_id}_${os.data_agendamento}`
        if (!colaboradoresPorData[key]) colaboradoresPorData[key] = []
        colaboradoresPorData[key].push(c.ordem_servico_id)
      }
    })

    // Agrupar por OS
    const colaboradoresPorOS = colaboradores.reduce((acc, c) => {
      if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = []
      acc[c.ordem_servico_id].push(c)
      return acc
    }, {})

    const veiculosPorOS = veiculos.reduce((acc, v) => {
      if (!acc[v.ordem_servico_id]) acc[v.ordem_servico_id] = []
      acc[v.ordem_servico_id].push(v)
      return acc
    }, {})

    // Processar cada OS
    const osProcessadas = ordens.map(os => {
      // Custo mão de obra SEM RATEIO (mesma lógica da listagem)
      const colabs = colaboradoresPorOS[os.id] || []
      let custoMaoObra = colabs.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0)

      // Custo veículos (soma campos individuais, mesma lógica da listagem)
      const veics = veiculosPorOS[os.id] || []
      const custoVeiculo = veics.reduce((sum, v) => {
        return sum + (parseFloat(v.valor_aluguel) || 0) + (parseFloat(v.valor_gasolina) || 0) + (parseFloat(v.valor_gelo) || 0) + (parseFloat(v.valor_cafe) || 0)
      }, 0)

      const custoTotal = custoMaoObra + custoVeiculo
      const receita = parseFloat(os.valor_total) || 0
      const lucro = receita - custoTotal
      const margem = receita > 0 ? (lucro / receita) * 100 : 0

      return {
        ...os,
        cliente_nome: clientes[os.cliente_id] || 'Sem cliente',
        receita,
        custo_mao_obra: custoMaoObra,
        custo_veiculo: custoVeiculo,
        custo_total: custoTotal,
        lucro,
        margem
      }
    })

    // ============================================
    // AGRUPAR POR OBRA (Cliente + Endereço + Potência)
    // ============================================
    const obrasMap = {}
    osProcessadas.forEach(os => {
      const endereco = (os.endereco || '').toLowerCase().trim()
      const potencia = os.potencia_kwp || 0
      const chave = `${os.cliente_id || 'sem'}_${endereco}_${potencia}`

      if (!obrasMap[chave]) {
        obrasMap[chave] = {
          chave,
          cliente_id: os.cliente_id,
          cliente_nome: os.cliente_nome,
          endereco: os.endereco || 'Sem endereço',
          cidade: os.cidade || '',
          potencia_kwp: potencia,
          tipo_telhado: os.tipo_telhado,
          receita: os.receita,
          custo_previsto: parseFloat(os.custo_previsto) || 0,
          custo_mao_obra: 0,
          custo_veiculo: 0,
          custo_total: 0,
          total_os: 0,
          total_placas: 0,
          ordens: []
        }
      }

      // Receita: pegar a maior
      if (os.receita > obrasMap[chave].receita) {
        obrasMap[chave].receita = os.receita
      }
      // Potência: pegar a maior
      if ((os.potencia_kwp || 0) > obrasMap[chave].potencia_kwp) {
        obrasMap[chave].potencia_kwp = os.potencia_kwp
      }
      // Tipo telhado
      if (os.tipo_telhado && !obrasMap[chave].tipo_telhado) {
        obrasMap[chave].tipo_telhado = os.tipo_telhado
      }

      // Somar custos
      obrasMap[chave].custo_mao_obra += os.custo_mao_obra
      obrasMap[chave].custo_veiculo += os.custo_veiculo
      obrasMap[chave].custo_total += os.custo_total
      obrasMap[chave].total_os++
      obrasMap[chave].total_placas += os.quantidade_placas || 0
      obrasMap[chave].ordens.push(os)
    })

    // Calcular lucro e preço esperado
    const obras = Object.values(obrasMap).map(obra => {
      const lucro = obra.receita - obra.custo_total
      const margem = obra.receita > 0 ? (lucro / obra.receita) * 100 : 0

      // Buscar preço esperado por quantidade de placas
      let precoEsperado = null
      if (obra.total_placas && faixasPreco && faixasPreco.length > 0) {
        const faixa = faixasPreco.find(f => 
          obra.total_placas >= f.placas_min && obra.total_placas <= f.placas_max
        )
        if (faixa) {
          precoEsperado = obra.total_placas * (parseFloat(faixa.valor_por_placa) || 0)
        }
      }

      return { ...obra, lucro, margem, preco_esperado: precoEsperado }
    }).sort((a, b) => b.receita - a.receita)

    // MÉTRICAS
    const metricas = {
      totalObras: obras.length,
      totalOS: osProcessadas.length,
      receitaTotal: obras.reduce((sum, o) => sum + o.receita, 0),
      custoMaoObra: obras.reduce((sum, o) => sum + o.custo_mao_obra, 0),
      custoVeiculo: obras.reduce((sum, o) => sum + o.custo_veiculo, 0),
      custoTotal: obras.reduce((sum, o) => sum + o.custo_total, 0),
      lucroTotal: obras.reduce((sum, o) => sum + o.lucro, 0),
      margemMedia: 0,
      ticketMedio: 0,
      totalPlacas: obras.reduce((sum, o) => sum + o.total_placas, 0)
    }
    metricas.margemMedia = metricas.receitaTotal > 0 ? (metricas.lucroTotal / metricas.receitaTotal) * 100 : 0
    metricas.ticketMedio = metricas.totalObras > 0 ? metricas.receitaTotal / metricas.totalObras : 0

    return { osProcessadas, obras, metricas }
  }, [osData, faixasPreco])

  // ============================================
  // FILTRAR POR BUSCA GLOBAL
  // ============================================
  const aplicarBusca = (lista, campos) => {
    if (!busca.trim()) return lista
    const termo = busca.toLowerCase().trim()
    return lista.filter(item => 
      campos.some(campo => {
        const valor = item[campo]
        if (!valor) return false
        return String(valor).toLowerCase().includes(termo)
      })
    )
  }

  // Filtrar obras
  const obrasFiltradas = useMemo(() => {
    if (!dadosProcessados.obras) return []
    let resultado = dadosProcessados.obras
    
    // Filtro por cliente selecionado
    if (filtroCliente) {
      resultado = resultado.filter(o => o.cliente_id === filtroCliente)
    }
    
    // Busca global
    resultado = aplicarBusca(resultado, ['cliente_nome', 'endereco', 'cidade'])
    
    return resultado
  }, [dadosProcessados.obras, filtroCliente, busca])

  // Filtrar OS
  const osFiltradas = useMemo(() => {
    if (!dadosProcessados.osProcessadas) return []
    let resultado = dadosProcessados.osProcessadas
    
    if (filtroCliente) {
      resultado = resultado.filter(o => o.cliente_id === filtroCliente)
    }
    
    resultado = aplicarBusca(resultado, ['cliente_nome', 'endereco', 'cidade', 'numero_os'])
    
    return resultado
  }, [dadosProcessados.osProcessadas, filtroCliente, busca])

  // Por cliente filtrado
  const porCliente = useMemo(() => {
    if (!obrasFiltradas) return []
    const map = {}
    obrasFiltradas.forEach(obra => {
      const id = obra.cliente_id || 'sem'
      if (!map[id]) {
        map[id] = { cliente_id: id, cliente_nome: obra.cliente_nome, total_obras: 0, total_os: 0, receita: 0, custo: 0, lucro: 0 }
      }
      map[id].total_obras++
      map[id].total_os += obra.total_os
      map[id].receita += obra.receita
      map[id].custo += obra.custo_total
      map[id].lucro += obra.lucro
    })
    return Object.values(map)
      .map(c => ({ ...c, margem: c.receita > 0 ? (c.lucro / c.receita) * 100 : 0 }))
      .sort((a, b) => b.receita - a.receita)
  }, [obrasFiltradas])

  // Métricas filtradas
  const metricasFiltradas = useMemo(() => {
    if (!obrasFiltradas || obrasFiltradas.length === 0) return null
    
    return {
      totalObras: obrasFiltradas.length,
      totalOS: osFiltradas.length,
      receitaTotal: obrasFiltradas.reduce((sum, o) => sum + o.receita, 0),
      custoTotal: obrasFiltradas.reduce((sum, o) => sum + o.custo_total, 0),
      custoMaoObra: obrasFiltradas.reduce((sum, o) => sum + o.custo_mao_obra, 0),
      custoVeiculo: obrasFiltradas.reduce((sum, o) => sum + o.custo_veiculo, 0),
      lucroTotal: obrasFiltradas.reduce((sum, o) => sum + o.lucro, 0),
      margemMedia: obrasFiltradas.reduce((sum, o) => sum + o.receita, 0) > 0 
        ? (obrasFiltradas.reduce((sum, o) => sum + o.lucro, 0) / obrasFiltradas.reduce((sum, o) => sum + o.receita, 0)) * 100 
        : 0,
      totalPlacas: obrasFiltradas.reduce((sum, o) => sum + o.total_placas, 0)
    }
  }, [obrasFiltradas, osFiltradas])

  const temFiltroAtivo = busca.trim() || filtroCliente

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

  const { metricas, obras, osProcessadas } = dadosProcessados
  const metricasExibir = temFiltroAtivo ? metricasFiltradas : metricas

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
        <p className="text-gray-600">Análise financeira por OBRA (Cliente + Endereço + Potência)</p>
      </div>

      {/* Filtros de Período + Busca */}
      <div className="card">
        <div className="flex flex-col gap-4">
          {/* Linha 1: Período */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              {['semana', 'mes', 'trimestre', 'ano'].map(periodo => (
                <button key={periodo} onClick={() => setPeriodo(periodo)} className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 hover:bg-gray-50">
                  {periodo === 'mes' ? 'Mês' : periodo === 'trimestre' ? 'Trimestre' : periodo.charAt(0).toUpperCase() + periodo.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <div>
                <label className="text-xs text-gray-500">Data Início</label>
                <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="text-xs text-gray-500">Data Fim</label>
                <input type="date" value={dataFim} onChange={(e) => setDataFim(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="text-sm text-gray-500 ml-auto">{osProcessadas?.length || 0} OS | {obras?.length || 0} Obras</div>
          </div>

          {/* Linha 2: Busca Global */}
          <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-100">
            <div className="flex-1 min-w-[300px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Pesquisar por cliente, endereço, cidade ou nº OS..."
                  className="input-field pl-10 pr-10 w-full"
                />
                {busca && (
                  <button 
                    onClick={() => setBusca('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border ${mostrarFiltros || filtroCliente ? 'border-blue-500 bg-blue-50 text-blue-600' : 'border-gray-200 hover:bg-gray-50'}`}
            >
              <Filter className="w-4 h-4" />
              Filtros
              {filtroCliente && <span className="w-2 h-2 bg-blue-500 rounded-full"></span>}
            </button>

            {temFiltroAtivo && (
              <button
                onClick={() => { setBusca(''); setFiltroCliente(''); }}
                className="text-sm text-red-600 hover:text-red-800"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Filtros avançados */}
          {mostrarFiltros && (
            <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-100">
              <div className="min-w-[250px]">
                <label className="text-sm text-gray-500">Filtrar por Cliente</label>
                <select
                  value={filtroCliente}
                  onChange={(e) => setFiltroCliente(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos os clientes</option>
                  {clientesLista?.map(c => (<option key={c.id} value={c.id}>{c.nome}</option>))}
                </select>
              </div>
            </div>
          )}

          {/* Indicador de filtro ativo */}
          {temFiltroAtivo && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 px-3 py-2 rounded-lg">
              <Search className="w-4 h-4" />
              <span>
                Mostrando {obrasFiltradas.length} de {obras?.length || 0} obras
                {busca && <span className="font-medium"> • Busca: "{busca}"</span>}
                {filtroCliente && <span className="font-medium"> • Cliente filtrado</span>}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      {metricasExibir && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <p className="text-sm text-green-600">Receita Total</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(metricasExibir.receitaTotal)}</p>
            <p className="text-xs text-green-600">{metricasExibir.totalObras} obras</p>
          </div>
          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <p className="text-sm text-red-600">Custos Totais</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(metricasExibir.custoTotal)}</p>
            <p className="text-xs text-red-600">{metricasExibir.totalOS} OS</p>
          </div>
          <div className={`card bg-gradient-to-br ${metricasExibir.lucroTotal >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-orange-50 to-orange-100 border-orange-200'}`}>
            <p className={`text-sm ${metricasExibir.lucroTotal >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Lucro</p>
            <p className={`text-2xl font-bold ${metricasExibir.lucroTotal >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCurrency(metricasExibir.lucroTotal)}</p>
          </div>
          <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <p className="text-sm text-purple-600">Margem</p>
            <p className={`text-2xl font-bold ${metricasExibir.margemMedia >= 0 ? 'text-purple-700' : 'text-red-600'}`}>{formatPercent(metricasExibir.margemMedia)}</p>
          </div>
        </div>
      )}

      {/* Sem dados */}
      {(!osProcessadas || osProcessadas.length === 0) && !loadingOS && (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
          <p className="text-gray-500">Nenhuma OS encontrada no período</p>
        </div>
      )}

      {/* Abas */}
      {metricas && (
        <>
          <div className="border-b border-gray-200">
            <nav className="flex gap-4 overflow-x-auto">
              {[
                { id: 'resumo', label: 'Resumo DRE', icon: FileText },
                { id: 'obras', label: 'Por Obra', icon: Building2 },
                { id: 'clientes', label: 'Por Cliente', icon: Users },
                { id: 'os', label: 'Todas as OS', icon: Layers },
              ].map((aba) => (
                <button
                  key={aba.id}
                  onClick={() => setAbaAtiva(aba.id)}
                  className={`flex items-center gap-2 px-4 py-3 border-b-2 ${abaAtiva === aba.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  <aba.icon className="w-4 h-4" />
                  {aba.label}
                </button>
              ))}
            </nav>
          </div>

          {/* RESUMO DRE */}
          {abaAtiva === 'resumo' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">DRE {temFiltroAtivo && <span className="text-sm font-normal text-blue-600">(filtrado)</span>}</h3>
                <div className="space-y-3">
                  <div className="flex justify-between py-2 border-b">
                    <span className="font-medium">RECEITA ({metricasExibir?.totalObras || 0} obras)</span>
                    <span className="text-xl font-bold text-green-600">{formatCurrency(metricasExibir?.receitaTotal || 0)}</span>
                  </div>
                  <div className="pl-4 space-y-2 text-sm">
                    <div className="flex justify-between"><span className="text-gray-600">(-) Mão de Obra</span><span className="text-red-600">{formatCurrency(metricasExibir?.custoMaoObra || 0)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-600">(-) Veículos</span><span className="text-red-600">{formatCurrency(metricasExibir?.custoVeiculo || 0)}</span></div>
                  </div>
                  <div className="flex justify-between py-2 border-t">
                    <span className="font-medium">TOTAL CUSTOS</span>
                    <span className="text-lg font-bold text-red-600">{formatCurrency(metricasExibir?.custoTotal || 0)}</span>
                  </div>
                  <div className={`flex justify-between py-3 border-t-2 ${(metricasExibir?.lucroTotal || 0) >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                    <span className="font-bold">LUCRO</span>
                    <span className={`text-xl font-bold ${(metricasExibir?.lucroTotal || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(metricasExibir?.lucroTotal || 0)}</span>
                  </div>
                </div>
              </div>
              <div className="card">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Estatísticas</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500">Obras</p><p className="text-2xl font-bold">{metricasExibir?.totalObras || 0}</p></div>
                  <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500">OS</p><p className="text-2xl font-bold text-blue-600">{metricasExibir?.totalOS || 0}</p></div>
                  <div className="p-4 bg-gray-50 rounded-xl"><p className="text-sm text-gray-500">Ticket Médio</p><p className="text-2xl font-bold text-purple-600">{formatCurrency((metricasExibir?.totalObras || 0) > 0 ? (metricasExibir?.receitaTotal || 0) / metricasExibir.totalObras : 0)}</p></div>
                  <div className="p-4 bg-yellow-50 rounded-xl"><p className="text-sm text-yellow-600">Placas</p><p className="text-2xl font-bold text-yellow-700">{metricasExibir?.totalPlacas || 0}</p></div>
                </div>
              </div>
            </div>
          )}

          {/* POR OBRA */}
          {abaAtiva === 'obras' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
                <p className="font-medium text-blue-800">OBRA = Cliente + Endereço + Potência</p>
                <p className="text-sm text-blue-600">Receita conta <strong>uma vez</strong> por obra. Custos são somados de todas as OS.</p>
              </div>

              <div className="space-y-3">
                {obrasFiltradas.map((obra) => (
                  <div key={obra.chave} className="card hover:shadow-md cursor-pointer" onClick={() => setObraExpandida(obraExpandida === obra.chave ? null : obra.chave)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-gray-900">{obra.cliente_nome}</h3>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">{obra.total_os} OS</span>
                          {obra.potencia_kwp > 0 && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium">{obra.potencia_kwp} kWp</span>}
                        </div>
                        <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                          <MapPin className="w-3 h-3" />{obra.endereco}{obra.cidade ? ` - ${obra.cidade}` : ''}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 md:gap-6 text-right">
                        <div><p className="text-xs text-gray-500">Receita</p><p className="font-bold text-green-600">{formatCurrency(obra.receita)}</p>{obra.preco_esperado && <p className="text-xs text-purple-500">Esp: {formatCurrency(obra.preco_esperado)}</p>}</div>
                        <div><p className="text-xs text-gray-500">Custo</p><p className="font-bold text-red-600">{formatCurrency(obra.custo_total)}</p></div>
                        <div><p className="text-xs text-gray-500">Lucro</p><p className={`font-bold ${obra.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(obra.lucro)}</p></div>
                        <div><p className="text-xs text-gray-500">Margem</p><p className={`font-bold ${obra.margem >= 20 ? 'text-green-600' : obra.margem >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>{formatPercent(obra.margem)}</p></div>
                        {obraExpandida === obra.chave ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>
                    {obraExpandida === obra.chave && (
                      <div className="mt-4 pt-4 border-t border-gray-200" onClick={e => e.stopPropagation()}>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                          <div className="bg-gray-50 rounded-xl p-4">
                            <h4 className="font-semibold text-gray-700 mb-3">DRE da Obra</h4>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between"><span>Receita</span><span className="font-medium text-green-600">{formatCurrency(obra.receita)}</span></div>
                              <div className="flex justify-between text-gray-500"><span>(-) Mão de Obra</span><span>{formatCurrency(obra.custo_mao_obra)}</span></div>
                              <div className="flex justify-between text-gray-500"><span>(-) Veículos</span><span>{formatCurrency(obra.custo_veiculo)}</span></div>
                              <div className="flex justify-between pt-2 border-t font-medium"><span>Total Custos</span><span className="text-red-600">{formatCurrency(obra.custo_total)}</span></div>
                              <div className={`flex justify-between pt-2 border-t-2 font-bold ${obra.lucro >= 0 ? 'border-green-400' : 'border-red-400'}`}><span>LUCRO</span><span className={obra.lucro >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(obra.lucro)}</span></div>
                            </div>
                          </div>
                          {obra.preco_esperado && (
                            <div className="bg-orange-50 rounded-xl p-4">
                              <h4 className="font-semibold text-gray-700 mb-3">Preço Esperado (Tabela)</h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span>Potência</span><span className="font-medium">{obra.potencia_kwp} kWp</span></div>
                                <div className="flex justify-between"><span>Valor Esperado</span><span className="font-medium text-purple-600">{formatCurrency(obra.preco_esperado)}</span></div>
                                <div className="flex justify-between"><span>Valor Real</span><span className={`font-medium ${obra.receita >= obra.preco_esperado ? 'text-green-600' : 'text-orange-600'}`}>{formatCurrency(obra.receita)}</span></div>
                                <div className={`p-2 rounded text-center text-xs ${obra.receita >= obra.preco_esperado ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                                  {obra.receita >= obra.preco_esperado ? `✅ ${formatCurrency(obra.receita - obra.preco_esperado)} acima` : `⚠️ ${formatCurrency(obra.preco_esperado - obra.receita)} abaixo`}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-700 mb-2">OS ({obra.total_os})</h4>
                        <div className="space-y-2">
                          {obra.ordens.map(os => (
                            <div key={os.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-2 bg-gray-50 rounded text-sm gap-2">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-mono font-medium">{os.numero_os || os.id.slice(0, 8)}</span>
                                <span className={`px-2 py-0.5 rounded text-xs ${os.status === 'concluida' ? 'bg-green-100 text-green-700' : os.status === 'em_execucao' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{os.status}</span>
                                <span className="text-gray-500">{os.data_agendamento ? new Date(os.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-500">M.O: <span className="text-orange-600">{formatCurrency(os.custo_mao_obra)}</span></span>
                                <span className="text-gray-500">Veíc: <span className="text-purple-600">{formatCurrency(os.custo_veiculo)}</span></span>
                                <span className="font-medium text-red-600">{formatCurrency(os.custo_total)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
                {obrasFiltradas.length === 0 && <div className="card text-center py-8 text-gray-500">Nenhuma obra encontrada {busca && `para "${busca}"`}</div>}
              </div>
            </div>
          )}

          {/* POR CLIENTE */}
          {abaAtiva === 'clientes' && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Por Cliente {temFiltroAtivo && <span className="text-sm font-normal text-blue-600">(filtrado)</span>}</h3>
              {porCliente.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead><tr className="bg-gray-50"><th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente</th><th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Obras</th><th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">OS</th><th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Receita</th><th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Custo</th><th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Lucro</th><th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Margem</th></tr></thead>
                    <tbody>
                      {porCliente.map((c, idx) => (
                        <tr key={c.cliente_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-4 py-3 font-medium text-gray-900">{c.cliente_nome}</td>
                          <td className="px-4 py-3 text-center">{c.total_obras}</td>
                          <td className="px-4 py-3 text-center">{c.total_os}</td>
                          <td className="px-4 py-3 text-right text-green-600 font-medium">{formatCurrency(c.receita)}</td>
                          <td className="px-4 py-3 text-right text-red-600">{formatCurrency(c.custo)}</td>
                          <td className={`px-4 py-3 text-right font-bold ${c.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(c.lucro)}</td>
                          <td className={`px-4 py-3 text-right font-medium ${c.margem >= 20 ? 'text-green-600' : c.margem >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>{formatPercent(c.margem)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-center py-8 text-gray-500">Nenhum cliente encontrado</p>}
            </div>
          )}

          {/* TODAS AS OS */}
          {abaAtiva === 'os' && (
            <div className="card overflow-hidden">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Todas as OS ({osFiltradas?.length || 0}) {temFiltroAtivo && <span className="text-sm font-normal text-blue-600">(filtrado)</span>}</h3>
              {osFiltradas && osFiltradas.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="bg-gray-50"><th className="px-3 py-2 text-left font-semibold text-gray-700">Data</th><th className="px-3 py-2 text-left font-semibold text-gray-700">OS</th><th className="px-3 py-2 text-left font-semibold text-gray-700">Cliente</th><th className="px-3 py-2 text-center font-semibold text-gray-700">kWp</th><th className="px-3 py-2 text-center font-semibold text-gray-700">Status</th><th className="px-3 py-2 text-right font-semibold text-gray-700">Receita</th><th className="px-3 py-2 text-right font-semibold text-gray-700">M.Obra</th><th className="px-3 py-2 text-right font-semibold text-gray-700">Veículo</th><th className="px-3 py-2 text-right font-semibold text-gray-700 bg-red-50">Custo</th><th className="px-3 py-2 text-right font-semibold text-gray-700 bg-blue-50">Lucro</th><th className="px-3 py-2 text-right font-semibold text-gray-700">Margem</th></tr></thead>
                    <tbody>
                      {osFiltradas.map((os, idx) => (
                        <tr key={os.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                          <td className="px-3 py-2 text-gray-600">{os.data_agendamento ? new Date(os.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{os.numero_os || os.id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-gray-700">{os.cliente_nome}</td>
                          <td className="px-3 py-2 text-center text-gray-600">{os.potencia_kwp || '-'}</td>
                          <td className="px-3 py-2 text-center"><span className={`px-2 py-0.5 rounded text-xs ${os.status === 'concluida' ? 'bg-green-100 text-green-700' : os.status === 'em_execucao' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{os.status}</span></td>
                          <td className="px-3 py-2 text-right text-green-600 font-medium">{formatCurrency(os.receita)}</td>
                          <td className="px-3 py-2 text-right text-orange-500">{formatCurrency(os.custo_mao_obra)}</td>
                          <td className="px-3 py-2 text-right text-purple-500">{formatCurrency(os.custo_veiculo)}</td>
                          <td className="px-3 py-2 text-right bg-red-50 text-red-600 font-medium">{formatCurrency(os.custo_total)}</td>
                          <td className={`px-3 py-2 text-right bg-blue-50 font-bold ${os.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(os.lucro)}</td>
                          <td className={`px-3 py-2 text-right font-medium ${os.margem >= 20 ? 'text-green-600' : os.margem >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>{formatPercent(os.margem)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <p className="text-center py-8 text-gray-500">Nenhuma OS encontrada {busca && `para "${busca}"`}</p>}
            </div>
          )}
        </>
      )}
    </div>
  )
}

export default Relatorios
