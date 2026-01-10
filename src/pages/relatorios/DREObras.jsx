import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, TrendingUp, TrendingDown, DollarSign, Search,
  Calendar, ChevronDown, ChevronUp, Building2, Sun, Loader2,
  Users, Car, Wrench, Receipt, Eye, MapPin, AlertTriangle,
  CheckCircle, Layers, Filter, Target
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
const DREObras = () => {
  const [search, setSearch] = useState('')
  const [expandedObra, setExpandedObra] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Filtros de data
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes.toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0])

  // Buscar todas as OS com custos detalhados
  const { data: osData, isLoading } = useQuery({
    queryKey: ['dre-obras-detalhado', dataInicio, dataFim],
    queryFn: async () => {
      // Buscar todas as OS
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select(`
          id, numero, data_agendamento, status, valor_total,
          quantidade_placas, tipo_telhado, potencia_kwp,
          custo_previsto, cliente_endereco_id, endereco, cidade, estado,
          cliente:clientes(id, nome),
          equipe:equipes(id, nome),
          empresa:empresas_contratantes(id, nome),
          cliente_endereco:cliente_enderecos(id, nome, endereco, cidade, estado)
        `)
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)
        .or('deletado.is.null,deletado.eq.false')
        .order('data_agendamento', { ascending: false })

      if (error) throw error

      const osIds = ordens?.map(o => o.id) || []

      // Buscar colaboradores
      const { data: colaboradores } = await supabase
        .from('os_colaboradores')
        .select(`
          ordem_servico_id, valor_total, dias_trabalhados, valor_diaria,
          valor_cafe, valor_almoco, valor_transporte, valor_outros,
          colaborador:colaboradores(nome)
        `)
        .in('ordem_servico_id', osIds)

      // Buscar veículos
      const { data: veiculos } = await supabase
        .from('os_veiculos')
        .select(`
          ordem_servico_id, valor_total, valor_aluguel, valor_gasolina, valor_gelo, dias,
          veiculo:veiculos(placa, modelo)
        `)
        .in('ordem_servico_id', osIds)

      // Buscar custos extras
      const { data: custosExtras } = await supabase
        .from('os_custos_extras')
        .select('ordem_servico_id, tipo, descricao, valor')
        .in('ordem_servico_id', osIds)

      // Agrupar por OS
      const colaboradoresPorOS = colaboradores?.reduce((acc, c) => {
        if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = []
        acc[c.ordem_servico_id].push(c)
        return acc
      }, {}) || {}

      const veiculosPorOS = veiculos?.reduce((acc, v) => {
        if (!acc[v.ordem_servico_id]) acc[v.ordem_servico_id] = []
        acc[v.ordem_servico_id].push(v)
        return acc
      }, {}) || {}

      const custosPorOS = custosExtras?.reduce((acc, c) => {
        if (!acc[c.ordem_servico_id]) acc[c.ordem_servico_id] = []
        acc[c.ordem_servico_id].push(c)
        return acc
      }, {}) || {}

      // Calcular rateio por data/equipe
      const osPorDataEquipe = {}
      ordens?.forEach(os => {
        const key = `${os.data_agendamento}_${os.equipe?.id || 'sem-equipe'}`
        if (!osPorDataEquipe[key]) osPorDataEquipe[key] = []
        osPorDataEquipe[key].push(os.id)
      })

      // Processar cada OS
      return ordens?.map(os => {
        const keyEquipe = `${os.data_agendamento}_${os.equipe?.id || 'sem-equipe'}`
        const totalOSEquipeDia = osPorDataEquipe[keyEquipe]?.length || 1

        const colabs = colaboradoresPorOS[os.id] || []
        const veics = veiculosPorOS[os.id] || []
        const extras = custosPorOS[os.id] || []

        // Custos
        const custoMaoObraBruto = colabs.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0)
        const custoMaoObraRateado = custoMaoObraBruto / totalOSEquipeDia

        const custoVeiculoBruto = veics.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0)
        const custoVeiculoRateado = custoVeiculoBruto / totalOSEquipeDia

        const custoExtras = extras.reduce((sum, e) => sum + (parseFloat(e.valor) || 0), 0)

        const custoTotalReal = custoMaoObraRateado + custoVeiculoRateado + custoExtras

        // Chave da obra: Cliente + Endereço
        const enderecoObra = os.cliente_endereco?.endereco || os.endereco || ''
        const cidadeObra = os.cliente_endereco?.cidade || os.cidade || ''
        const chaveObra = `${os.cliente?.id || 'sem-cliente'}_${enderecoObra}_${cidadeObra}`.toLowerCase().trim()

        return {
          ...os,
          cliente_nome: os.cliente?.nome || 'Sem cliente',
          cliente_id: os.cliente?.id,
          equipe_nome: os.equipe?.nome,
          empresa_nome: os.empresa?.nome,
          endereco_obra: enderecoObra,
          cidade_obra: cidadeObra,
          chave_obra: chaveObra,
          receita: parseFloat(os.valor_total) || 0,
          custo_previsto_os: parseFloat(os.custo_previsto) || 0,
          colaboradores: colabs,
          veiculos: veics,
          custos_extras: extras,
          custo_mao_obra_bruto: custoMaoObraBruto,
          custo_mao_obra_rateado: custoMaoObraRateado,
          custo_veiculo_bruto: custoVeiculoBruto,
          custo_veiculo_rateado: custoVeiculoRateado,
          custo_extras: custoExtras,
          custo_total_real: custoTotalReal,
          total_os_equipe_dia: totalOSEquipeDia
        }
      }) || []
    }
  })

  // Agrupar OS por OBRA (Cliente + Endereço)
  const obrasPorChave = useMemo(() => {
    if (!osData) return {}

    return osData.reduce((acc, os) => {
      const chave = os.chave_obra
      if (!acc[chave]) {
        acc[chave] = {
          chave,
          cliente_id: os.cliente_id,
          cliente_nome: os.cliente_nome,
          endereco: os.endereco_obra,
          cidade: os.cidade_obra,
          potencia_kwp: os.potencia_kwp,
          quantidade_placas: os.quantidade_placas,
          tipo_telhado: os.tipo_telhado,
          ordens: [],
          // Receita é UMA SÓ por obra (pega da primeira OS)
          receita: 0,
          custo_previsto: 0,
          // Custos são SOMADOS de todas as OS
          custo_mao_obra: 0,
          custo_veiculo: 0,
          custo_extras: 0,
          custo_total_real: 0
        }
      }

      // Adicionar OS à obra
      acc[chave].ordens.push(os)

      // Receita: pegar o maior valor (todas as OS da mesma obra devem ter o mesmo valor)
      if (os.receita > acc[chave].receita) {
        acc[chave].receita = os.receita
      }

      // Custo previsto: pegar o maior (da tabela de faixas)
      if (os.custo_previsto_os > acc[chave].custo_previsto) {
        acc[chave].custo_previsto = os.custo_previsto_os
      }

      // Potência: pegar o maior
      if (os.potencia_kwp > (acc[chave].potencia_kwp || 0)) {
        acc[chave].potencia_kwp = os.potencia_kwp
      }

      // Placas: pegar o maior
      if (os.quantidade_placas > (acc[chave].quantidade_placas || 0)) {
        acc[chave].quantidade_placas = os.quantidade_placas
      }

      // Somar custos de todas as OS
      acc[chave].custo_mao_obra += os.custo_mao_obra_rateado
      acc[chave].custo_veiculo += os.custo_veiculo_rateado
      acc[chave].custo_extras += os.custo_extras
      acc[chave].custo_total_real += os.custo_total_real

      return acc
    }, {})
  }, [osData])

  // Converter para array e calcular métricas
  const obras = useMemo(() => {
    return Object.values(obrasPorChave).map(obra => ({
      ...obra,
      lucro_real: obra.receita - obra.custo_total_real,
      margem_real: obra.receita > 0 ? ((obra.receita - obra.custo_total_real) / obra.receita) * 100 : 0,
      lucro_previsto: obra.receita - obra.custo_previsto,
      margem_prevista: obra.receita > 0 ? ((obra.receita - obra.custo_previsto) / obra.receita) * 100 : 0,
      diferenca_custo: obra.custo_total_real - obra.custo_previsto,
      total_os: obra.ordens.length
    }))
  }, [obrasPorChave])

  // Filtrar obras
  const obrasFiltradas = useMemo(() => {
    return obras.filter(obra => {
      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase()
        const matchCliente = obra.cliente_nome?.toLowerCase().includes(searchLower)
        const matchEndereco = obra.endereco?.toLowerCase().includes(searchLower)
        const matchCidade = obra.cidade?.toLowerCase().includes(searchLower)
        const matchNumeroOS = obra.ordens.some(os => os.numero?.toLowerCase().includes(searchLower))
        if (!matchCliente && !matchEndereco && !matchCidade && !matchNumeroOS) return false
      }

      // Filtro de status (qualquer OS da obra com esse status)
      if (filtroStatus) {
        const temStatus = obra.ordens.some(os => os.status === filtroStatus)
        if (!temStatus) return false
      }

      return true
    })
  }, [obras, search, filtroStatus])

  // Totais
  const totais = useMemo(() => {
    if (!obrasFiltradas.length) return null

    return {
      totalObras: obrasFiltradas.length,
      totalOS: obrasFiltradas.reduce((sum, o) => sum + o.total_os, 0),
      receita: obrasFiltradas.reduce((sum, o) => sum + o.receita, 0),
      custoPrevisto: obrasFiltradas.reduce((sum, o) => sum + o.custo_previsto, 0),
      custoReal: obrasFiltradas.reduce((sum, o) => sum + o.custo_total_real, 0),
      lucroReal: obrasFiltradas.reduce((sum, o) => sum + o.lucro_real, 0),
      lucroPrevisto: obrasFiltradas.reduce((sum, o) => sum + o.lucro_previsto, 0)
    }
  }, [obrasFiltradas])

  const toggleObra = (chave) => {
    setExpandedObra(expandedObra === chave ? null : chave)
  }

  // Atalhos de período
  const setPeriodo = (tipo) => {
    const hoje = new Date()
    let inicio, fim

    switch (tipo) {
      case 'mes':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
        break
      case 'mesPassado':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
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

  if (isLoading) {
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
          <h1 className="text-2xl font-bold text-gray-900">DRE por Obra</h1>
          <p className="text-gray-600">Análise de resultado agrupado por Cliente + Endereço</p>
        </div>
      </div>

      {/* Cards de Totais */}
      {totais && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center gap-2 text-blue-600 mb-1">
              <Building2 className="w-4 h-4" />
              <span className="text-xs font-medium">Obras</span>
            </div>
            <p className="text-2xl font-bold text-blue-700">{totais.totalObras}</p>
            <p className="text-xs text-blue-600">{totais.totalOS} OS no total</p>
          </div>

          <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <TrendingUp className="w-4 h-4" />
              <span className="text-xs font-medium">Receita Total</span>
            </div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totais.receita)}</p>
          </div>

          <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
            <div className="flex items-center gap-2 text-orange-600 mb-1">
              <Target className="w-4 h-4" />
              <span className="text-xs font-medium">Custo Previsto</span>
            </div>
            <p className="text-2xl font-bold text-orange-700">{formatCurrency(totais.custoPrevisto)}</p>
          </div>

          <div className="card bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <TrendingDown className="w-4 h-4" />
              <span className="text-xs font-medium">Custo Real</span>
            </div>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totais.custoReal)}</p>
            {totais.custoReal > totais.custoPrevisto ? (
              <p className="text-xs text-red-600">⚠️ {formatCurrency(totais.custoReal - totais.custoPrevisto)} acima</p>
            ) : totais.custoPrevisto > 0 ? (
              <p className="text-xs text-green-600">✓ {formatCurrency(totais.custoPrevisto - totais.custoReal)} abaixo</p>
            ) : null}
          </div>

          <div className={`card bg-gradient-to-br ${totais.lucroReal >= 0 ? 'from-blue-50 to-blue-100 border-blue-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <div className={`flex items-center gap-2 ${totais.lucroReal >= 0 ? 'text-blue-600' : 'text-red-600'} mb-1`}>
              <DollarSign className="w-4 h-4" />
              <span className="text-xs font-medium">Lucro Real</span>
            </div>
            <p className={`text-2xl font-bold ${totais.lucroReal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
              {formatCurrency(totais.lucroReal)}
            </p>
          </div>

          <div className={`card bg-gradient-to-br ${totais.lucroReal >= 0 ? 'from-emerald-50 to-emerald-100 border-emerald-200' : 'from-red-50 to-red-100 border-red-200'}`}>
            <div className={`flex items-center gap-2 ${totais.lucroReal >= 0 ? 'text-emerald-600' : 'text-red-600'} mb-1`}>
              <CheckCircle className="w-4 h-4" />
              <span className="text-xs font-medium">Margem Média</span>
            </div>
            <p className={`text-2xl font-bold ${totais.lucroReal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {totais.receita > 0 ? formatPercent((totais.lucroReal / totais.receita) * 100) : '0%'}
            </p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex items-center gap-2 px-4 py-2.5 border border-gray-300 rounded-xl bg-white focus-within:ring-2 focus-within:ring-blue-500">
            <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por cliente, endereço, número da OS..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 outline-none bg-transparent"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-blue-50 border-blue-300' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="label">Data Início</label>
                <input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Status da OS</label>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  <option value="agendada">Agendada</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="em_execucao">Em Execução</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => {
                    setFiltroStatus('')
                    setSearch('')
                  }}
                  className="btn-secondary w-full"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Atalhos de período */}
            <div className="flex flex-wrap gap-2 pt-2 border-t">
              <span className="text-sm text-gray-500 mr-2">Período:</span>
              <button onClick={() => setPeriodo('mes')} className="px-3 py-1 text-xs bg-white border rounded-lg hover:bg-gray-50">
                Este Mês
              </button>
              <button onClick={() => setPeriodo('mesPassado')} className="px-3 py-1 text-xs bg-white border rounded-lg hover:bg-gray-50">
                Mês Passado
              </button>
              <button onClick={() => setPeriodo('trimestre')} className="px-3 py-1 text-xs bg-white border rounded-lg hover:bg-gray-50">
                Trimestre
              </button>
              <button onClick={() => setPeriodo('ano')} className="px-3 py-1 text-xs bg-white border rounded-lg hover:bg-gray-50">
                Este Ano
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Aviso Importante */}
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-200">
        <div className="flex items-start gap-3">
          <Layers className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <p className="font-medium text-blue-800">Agrupamento por Obra</p>
            <p className="text-sm text-blue-600">
              A receita é contada <strong>uma vez por obra</strong> (Cliente + Endereço), mesmo que existam múltiplas OS.
              Os custos são somados de todas as OS da obra.
            </p>
          </div>
        </div>
      </div>

      {/* Lista de Obras */}
      <div className="space-y-4">
        {obrasFiltradas.map((obra) => (
          <div
            key={obra.chave}
            className="card hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => toggleObra(obra.chave)}
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              {/* Info Principal */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                    {obra.total_os} OS
                  </span>
                  {obra.potencia_kwp && (
                    <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded text-xs font-medium flex items-center gap-1">
                      <Sun className="w-3 h-3" />
                      {obra.potencia_kwp} kWp
                    </span>
                  )}
                  {obra.quantidade_placas && (
                    <span className="text-xs text-gray-500">
                      {obra.quantidade_placas} placas
                    </span>
                  )}
                </div>

                <h3 className="font-semibold text-gray-900 text-lg">{obra.cliente_nome}</h3>

                <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                  <MapPin className="w-4 h-4" />
                  {obra.endereco || 'Endereço não informado'}
                  {obra.cidade && ` - ${obra.cidade}`}
                </div>
              </div>

              {/* Valores */}
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Receita</p>
                  <p className="font-bold text-green-600">{formatCurrency(obra.receita)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Custo Real</p>
                  <p className="font-bold text-red-600">{formatCurrency(obra.custo_total_real)}</p>
                  {obra.custo_previsto > 0 && obra.custo_total_real > obra.custo_previsto && (
                    <p className="text-xs text-red-500">
                      ⚠️ +{formatCurrency(obra.diferenca_custo)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Lucro</p>
                  <p className={`font-bold text-lg ${obra.lucro_real >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(obra.lucro_real)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Margem</p>
                  <p className={`font-bold ${obra.margem_real >= 20 ? 'text-green-600' : obra.margem_real >= 0 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {formatPercent(obra.margem_real)}
                  </p>
                </div>
                {expandedObra === obra.chave ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Detalhes Expandidos */}
            {expandedObra === obra.chave && (
              <div className="mt-4 pt-4 border-t border-gray-200" onClick={(e) => e.stopPropagation()}>
                {/* DRE Resumido da Obra */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      DRE da Obra
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Receita (Valor de Venda)</span>
                        <span className="font-medium text-green-600">{formatCurrency(obra.receita)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Mão de Obra</span>
                        <span className="text-red-500">{formatCurrency(obra.custo_mao_obra)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Veículos</span>
                        <span className="text-red-500">{formatCurrency(obra.custo_veiculo)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Outros Custos</span>
                        <span className="text-red-500">{formatCurrency(obra.custo_extras)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t">
                        <span className="font-medium">Total Custos</span>
                        <span className="font-bold text-red-600">{formatCurrency(obra.custo_total_real)}</span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t-2 ${obra.lucro_real >= 0 ? 'border-green-400' : 'border-red-400'}`}>
                        <span className="font-bold">RESULTADO</span>
                        <span className={`text-xl font-bold ${obra.lucro_real >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(obra.lucro_real)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Comparativo Previsto vs Real */}
                  <div className="bg-orange-50 rounded-xl p-4">
                    <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4 text-orange-600" />
                      Previsto vs Real
                    </h4>
                    <div className="space-y-3">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div></div>
                        <div className="text-xs font-medium text-gray-500">Previsto</div>
                        <div className="text-xs font-medium text-gray-500">Real</div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="text-sm text-gray-600 text-left">Custo</div>
                        <div className="font-medium text-orange-600">{formatCurrency(obra.custo_previsto)}</div>
                        <div className={`font-medium ${obra.custo_total_real <= obra.custo_previsto ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(obra.custo_total_real)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="text-sm text-gray-600 text-left">Lucro</div>
                        <div className="font-medium text-blue-600">{formatCurrency(obra.lucro_previsto)}</div>
                        <div className={`font-medium ${obra.lucro_real >= obra.lucro_previsto ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(obra.lucro_real)}
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="text-sm text-gray-600 text-left">Margem</div>
                        <div className="font-medium text-gray-600">{formatPercent(obra.margem_prevista)}</div>
                        <div className={`font-medium ${obra.margem_real >= obra.margem_prevista ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercent(obra.margem_real)}
                        </div>
                      </div>
                      {obra.diferenca_custo !== 0 && (
                        <div className={`p-2 rounded-lg text-center text-sm ${obra.diferenca_custo > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                          {obra.diferenca_custo > 0 ? (
                            <>⚠️ Custo {formatCurrency(Math.abs(obra.diferenca_custo))} ACIMA do previsto</>
                          ) : (
                            <>✅ Custo {formatCurrency(Math.abs(obra.diferenca_custo))} ABAIXO do previsto</>
                          )}
                        </div>
                      )}
                      {!obra.custo_previsto && (
                        <div className="p-2 bg-yellow-100 rounded-lg text-center text-sm text-yellow-700">
                          ⚠️ Sem custo previsto cadastrado
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Lista de OS da Obra */}
                <div className="mt-6">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" />
                    Ordens de Serviço desta Obra ({obra.ordens.length})
                  </h4>
                  <div className="space-y-2">
                    {obra.ordens.map((os) => (
                      <div key={os.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-medium text-gray-700">#{os.numero || os.id.slice(0, 8)}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                            os.status === 'concluida' ? 'bg-green-100 text-green-700' :
                            os.status === 'em_execucao' ? 'bg-yellow-100 text-yellow-700' :
                            os.status === 'confirmada' ? 'bg-cyan-100 text-cyan-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {os.status}
                          </span>
                          <span className="text-sm text-gray-500">
                            {os.data_agendamento ? new Date(os.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                          </span>
                          {os.equipe_nome && (
                            <span className="text-sm text-gray-500">• {os.equipe_nome}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">M.O.:</span>
                            <span className="font-medium text-orange-600 ml-1">{formatCurrency(os.custo_mao_obra_rateado)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">Veíc.:</span>
                            <span className="font-medium text-purple-600 ml-1">{formatCurrency(os.custo_veiculo_rateado)}</span>
                          </div>
                          <div className="font-bold text-red-600">
                            {formatCurrency(os.custo_total_real)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {obrasFiltradas.length === 0 && (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhuma obra encontrada no período</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DREObras
