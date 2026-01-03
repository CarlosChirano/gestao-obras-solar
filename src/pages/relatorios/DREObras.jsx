import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, TrendingUp, TrendingDown, DollarSign, Search,
  Calendar, ChevronDown, ChevronUp, Building2, Sun, Loader2,
  Users, Car, Wrench, Receipt, Eye
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
  const [expandedOS, setExpandedOS] = useState(null)
  const [filtroStatus, setFiltroStatus] = useState('')

  // Buscar todas as OS com custos detalhados
  const { data: osData, isLoading } = useQuery({
    queryKey: ['dre-obras-detalhado'],
    queryFn: async () => {
      // Buscar todas as OS
      const { data: ordens, error } = await supabase
        .from('ordens_servico')
        .select(`
          id, numero, data_agendamento, status, valor_total,
          quantidade_placas, tipo_telhado, potencia_kwp,
          cliente:clientes(id, nome),
          equipe:equipes(id, nome),
          empresa:empresas_contratantes(id, nome)
        `)
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

        const custoTotal = custoMaoObraRateado + custoVeiculoRateado + custoExtras
        const receita = parseFloat(os.valor_total) || 0
        const lucro = receita - custoTotal
        const margem = receita > 0 ? (lucro / receita) * 100 : 0

        return {
          ...os,
          cliente_nome: os.cliente?.nome || 'Sem cliente',
          equipe_nome: os.equipe?.nome,
          empresa_nome: os.empresa?.nome,
          receita,
          colaboradores: colabs,
          veiculos: veics,
          custos_extras: extras,
          custo_mao_obra_bruto: custoMaoObraBruto,
          custo_mao_obra_rateado: custoMaoObraRateado,
          custo_veiculo_bruto: custoVeiculoBruto,
          custo_veiculo_rateado: custoVeiculoRateado,
          custo_extras: custoExtras,
          custo_total: custoTotal,
          lucro,
          margem,
          total_os_equipe_dia: totalOSEquipeDia
        }
      }) || []
    }
  })

  // Filtrar OS
  const osFiltradas = useMemo(() => {
    if (!osData) return []

    return osData.filter(os => {
      // Filtro de busca
      if (search) {
        const searchLower = search.toLowerCase()
        const matchCliente = os.cliente_nome?.toLowerCase().includes(searchLower)
        const matchNumero = os.numero?.toLowerCase().includes(searchLower)
        const matchEquipe = os.equipe_nome?.toLowerCase().includes(searchLower)
        if (!matchCliente && !matchNumero && !matchEquipe) return false
      }

      // Filtro de status
      if (filtroStatus && os.status !== filtroStatus) return false

      return true
    })
  }, [osData, search, filtroStatus])

  // Totais
  const totais = useMemo(() => {
    if (!osFiltradas) return null

    return {
      receita: osFiltradas.reduce((sum, os) => sum + os.receita, 0),
      custo: osFiltradas.reduce((sum, os) => sum + os.custo_total, 0),
      lucro: osFiltradas.reduce((sum, os) => sum + os.lucro, 0)
    }
  }, [osFiltradas])

  // Toggle expansão
  const toggleExpand = (id) => {
    setExpandedOS(expandedOS === id ? null : id)
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
          <p className="text-gray-600">Demonstrativo de resultado detalhado de cada obra</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por cliente, nº OS ou equipe..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field pl-10"
              />
            </div>
          </div>
          <div>
            <select
              value={filtroStatus}
              onChange={(e) => setFiltroStatus(e.target.value)}
              className="input-field"
            >
              <option value="">Todos os status</option>
              <option value="agendada">Agendada</option>
              <option value="em_execucao">Em Execução</option>
              <option value="concluida">Concluída</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cards de Resumo */}
      {totais && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="card bg-green-50 border-green-200">
            <p className="text-sm text-green-600">Receita Total</p>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(totais.receita)}</p>
          </div>
          <div className="card bg-red-50 border-red-200">
            <p className="text-sm text-red-600">Custos Total</p>
            <p className="text-2xl font-bold text-red-700">{formatCurrency(totais.custo)}</p>
          </div>
          <div className={`card ${totais.lucro >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
            <p className={`text-sm ${totais.lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>Lucro Total</p>
            <p className={`text-2xl font-bold ${totais.lucro >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCurrency(totais.lucro)}
            </p>
          </div>
        </div>
      )}

      {/* Lista de OS com DRE */}
      <div className="space-y-4">
        {osFiltradas.map(os => (
          <div key={os.id} className="card">
            {/* Cabeçalho da OS */}
            <div 
              className="flex items-center justify-between cursor-pointer"
              onClick={() => toggleExpand(os.id)}
            >
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">
                      OS #{os.numero || os.id.slice(0, 8)}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      os.status === 'concluida' ? 'bg-green-100 text-green-700' :
                      os.status === 'em_execucao' ? 'bg-blue-100 text-blue-700' :
                      os.status === 'agendada' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {os.status}
                    </span>
                    {os.total_os_equipe_dia > 1 && (
                      <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                        Rateio ÷{os.total_os_equipe_dia}
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-500">{os.cliente_nome}</span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xs text-gray-500">Receita</p>
                  <p className="font-medium text-green-600">{formatCurrency(os.receita)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Custo</p>
                  <p className="font-medium text-red-600">{formatCurrency(os.custo_total)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Lucro</p>
                  <p className={`font-bold ${os.lucro >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                    {formatCurrency(os.lucro)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Margem</p>
                  <p className={`font-medium ${os.margem >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatPercent(os.margem)}
                  </p>
                </div>
                {expandedOS === os.id ? (
                  <ChevronUp className="w-5 h-5 text-gray-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-gray-400" />
                )}
              </div>
            </div>

            {/* Detalhes Expandidos */}
            {expandedOS === os.id && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Info da OS */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Building2 className="w-4 h-4" /> Informações
                    </h4>
                    <div className="text-sm space-y-1">
                      <p><span className="text-gray-500">Data:</span> {os.data_agendamento ? new Date(os.data_agendamento).toLocaleDateString('pt-BR') : '-'}</p>
                      <p><span className="text-gray-500">Equipe:</span> {os.equipe_nome || '-'}</p>
                      <p><span className="text-gray-500">Empresa:</span> {os.empresa_nome || '-'}</p>
                      {os.quantidade_placas && <p><span className="text-gray-500">Placas:</span> {os.quantidade_placas}</p>}
                      {os.tipo_telhado && <p><span className="text-gray-500">Telhado:</span> {os.tipo_telhado}</p>}
                    </div>
                  </div>

                  {/* Mão de Obra */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Mão de Obra
                      {os.total_os_equipe_dia > 1 && (
                        <span className="text-xs text-orange-600">(rateado)</span>
                      )}
                    </h4>
                    {os.colaboradores.length > 0 ? (
                      <div className="space-y-2">
                        {os.colaboradores.map((col, idx) => (
                          <div key={idx} className="text-sm flex justify-between items-center p-2 bg-gray-50 rounded">
                            <span className="text-gray-700">{col.colaborador?.nome || 'Colaborador'}</span>
                            <span className="font-medium text-gray-900">
                              {formatCurrency((parseFloat(col.valor_total) || 0) / os.total_os_equipe_dia)}
                            </span>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium text-gray-700">Total Mão de Obra:</span>
                          <span className="font-bold text-red-600">{formatCurrency(os.custo_mao_obra_rateado)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum colaborador registrado</p>
                    )}
                  </div>

                  {/* Veículos */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                      <Car className="w-4 h-4" /> Veículos
                      {os.total_os_equipe_dia > 1 && (
                        <span className="text-xs text-orange-600">(rateado)</span>
                      )}
                    </h4>
                    {os.veiculos.length > 0 ? (
                      <div className="space-y-2">
                        {os.veiculos.map((veic, idx) => (
                          <div key={idx} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="flex justify-between">
                              <span className="text-gray-700">{veic.veiculo?.modelo} - {veic.veiculo?.placa}</span>
                              <span className="font-medium text-gray-900">
                                {formatCurrency((parseFloat(veic.valor_total) || 0) / os.total_os_equipe_dia)}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              Aluguel: {formatCurrency(veic.valor_aluguel)} | 
                              Gasolina: {formatCurrency(veic.valor_gasolina)} | 
                              Gelo: {formatCurrency(veic.valor_gelo)}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center pt-2 border-t">
                          <span className="font-medium text-gray-700">Total Veículos:</span>
                          <span className="font-bold text-red-600">{formatCurrency(os.custo_veiculo_rateado)}</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">Nenhum veículo registrado</p>
                    )}
                  </div>
                </div>

                {/* Custos Extras */}
                {os.custos_extras.length > 0 && (
                  <div className="mt-4 pt-4 border-t">
                    <h4 className="font-semibold text-gray-700 flex items-center gap-2 mb-3">
                      <Receipt className="w-4 h-4" /> Custos Extras
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {os.custos_extras.map((extra, idx) => (
                        <div key={idx} className="text-sm p-2 bg-orange-50 rounded">
                          <span className="text-gray-700">{extra.tipo || extra.descricao}</span>
                          <span className="block font-medium text-orange-600">{formatCurrency(extra.valor)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* DRE Resumido */}
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-semibold text-gray-700 mb-3">DRE da Obra</h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span>Receita</span>
                        <span className="font-medium text-green-600">{formatCurrency(os.receita)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Mão de Obra</span>
                        <span className="text-red-500">{formatCurrency(os.custo_mao_obra_rateado)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Veículos</span>
                        <span className="text-red-500">{formatCurrency(os.custo_veiculo_rateado)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">(-) Custos Extras</span>
                        <span className="text-red-500">{formatCurrency(os.custo_extras)}</span>
                      </div>
                      <div className="flex justify-between pt-2 border-t border-gray-300">
                        <span className="font-medium">Total Custos</span>
                        <span className="font-bold text-red-600">{formatCurrency(os.custo_total)}</span>
                      </div>
                      <div className={`flex justify-between pt-2 border-t-2 ${os.lucro >= 0 ? 'border-green-400' : 'border-red-400'}`}>
                        <span className="font-bold">RESULTADO</span>
                        <span className={`text-xl font-bold ${os.lucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(os.lucro)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {osFiltradas.length === 0 && (
          <div className="card text-center py-12">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500">Nenhuma OS encontrada</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default DREObras
