import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  FileText, 
  Download, 
  Calendar, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Loader2,
  Filter,
  PieChart,
  BarChart3,
  Users,
  Wrench
} from 'lucide-react'

const Relatorios = () => {
  const [periodo, setPeriodo] = useState('mes')
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d.toISOString().split('T')[0]
  })
  const [dataFim, setDataFim] = useState(() => {
    const d = new Date()
    return d.toISOString().split('T')[0]
  })

  // Buscar OS do período
  const { data: ordensServico, isLoading } = useQuery({
    queryKey: ['relatorio-os', dataInicio, dataFim],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(nome),
          equipe:equipes(nome)
        `)
        .eq('ativo', true)
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)

      if (error) throw error
      return data
    }
  })

  // Buscar custos extras
  const { data: custosExtras } = useQuery({
    queryKey: ['relatorio-custos', dataInicio, dataFim],
    queryFn: async () => {
      const osIds = ordensServico?.map(os => os.id) || []
      if (osIds.length === 0) return []

      const { data } = await supabase
        .from('os_custos_extras')
        .select('*')
        .in('ordem_servico_id', osIds)

      return data || []
    },
    enabled: !!ordensServico?.length
  })

  // Buscar colaboradores das OS
  const { data: osColaboradores } = useQuery({
    queryKey: ['relatorio-colaboradores', dataInicio, dataFim],
    queryFn: async () => {
      const osIds = ordensServico?.map(os => os.id) || []
      if (osIds.length === 0) return []

      const { data } = await supabase
        .from('os_colaboradores')
        .select('*, colaborador:colaboradores(nome)')
        .in('ordem_servico_id', osIds)

      return data || []
    },
    enabled: !!ordensServico?.length
  })

  // Aplicar período predefinido
  const aplicarPeriodo = (tipo) => {
    const hoje = new Date()
    let inicio, fim

    switch (tipo) {
      case 'semana':
        inicio = new Date(hoje)
        inicio.setDate(hoje.getDate() - hoje.getDay())
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

    setPeriodo(tipo)
    setDataInicio(inicio.toISOString().split('T')[0])
    setDataFim(fim.toISOString().split('T')[0])
  }

  // Cálculos do DRE
  const osConcluidas = ordensServico?.filter(os => os.status === 'concluida') || []
  
  const receitaBruta = osConcluidas.reduce((sum, os) => sum + (parseFloat(os.valor_total) || 0), 0)
  
  const custoMaoObra = osColaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0) || 0
  
  const custoMateriais = osConcluidas.reduce((sum, os) => sum + (parseFloat(os.valor_materiais) || 0), 0)
  
  const custoDeslocamento = osConcluidas.reduce((sum, os) => sum + (parseFloat(os.valor_deslocamento) || 0), 0)
  
  const custoExtrasTotal = custosExtras?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0

  // Agrupar custos extras por tipo
  const custosExtrasPorTipo = custosExtras?.reduce((acc, c) => {
    acc[c.tipo] = (acc[c.tipo] || 0) + (parseFloat(c.valor) || 0)
    return acc
  }, {}) || {}

  const custoTotal = custoMaoObra + custoMateriais + custoDeslocamento + custoExtrasTotal
  const lucroOperacional = receitaBruta - custoTotal
  const margemLucro = receitaBruta > 0 ? (lucroOperacional / receitaBruta) * 100 : 0

  // Estatísticas gerais
  const totalOS = ordensServico?.length || 0
  const totalConcluidas = osConcluidas.length
  const taxaConclusao = totalOS > 0 ? (totalConcluidas / totalOS) * 100 : 0
  const ticketMedio = totalConcluidas > 0 ? receitaBruta / totalConcluidas : 0

  // Top clientes
  const clientesFaturamento = osConcluidas.reduce((acc, os) => {
    const nome = os.cliente?.nome || 'Não informado'
    acc[nome] = (acc[nome] || 0) + (parseFloat(os.valor_total) || 0)
    return acc
  }, {})

  const topClientes = Object.entries(clientesFaturamento)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  // Top colaboradores
  const colaboradoresPorDias = osColaboradores?.reduce((acc, c) => {
    const nome = c.colaborador?.nome || 'Não informado'
    acc[nome] = (acc[nome] || 0) + (parseFloat(c.dias_trabalhados) || 0)
    return acc
  }, {}) || {}

  const topColaboradores = Object.entries(colaboradoresPorDias)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      material: 'Material',
      alimentacao: 'Alimentação',
      hospedagem: 'Hospedagem',
      combustivel: 'Combustível',
      pedagio: 'Pedágio',
      outros: 'Outros'
    }
    return tipos[tipo] || tipo
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Relatórios</h1>
          <p className="text-gray-600">Análise financeira e operacional</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="flex gap-2">
            {['semana', 'mes', 'trimestre', 'ano'].map((p) => (
              <button
                key={p}
                onClick={() => aplicarPeriodo(p)}
                className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                  periodo === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {p === 'semana' ? 'Semana' : 
                 p === 'mes' ? 'Mês' : 
                 p === 'trimestre' ? 'Trimestre' : 'Ano'}
              </button>
            ))}
          </div>
          <div className="flex gap-3 flex-1">
            <div className="flex-1">
              <label className="label">Data Início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={(e) => {
                  setDataInicio(e.target.value)
                  setPeriodo('')
                }}
                className="input-field"
              />
            </div>
            <div className="flex-1">
              <label className="label">Data Fim</label>
              <input
                type="date"
                value={dataFim}
                onChange={(e) => {
                  setDataFim(e.target.value)
                  setPeriodo('')
                }}
                className="input-field"
              />
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <>
          {/* Cards de Resumo */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Receita Bruta</p>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(receitaBruta)}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Custos Totais</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(custoTotal)}</p>
                </div>
                <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
                  <TrendingDown className="w-6 h-6 text-red-600" />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Lucro Operacional</p>
                  <p className={`text-2xl font-bold ${lucroOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(lucroOperacional)}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${lucroOperacional >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
                  <DollarSign className={`w-6 h-6 ${lucroOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`} />
                </div>
              </div>
            </div>

            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Margem de Lucro</p>
                  <p className={`text-2xl font-bold ${margemLucro >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {margemLucro.toFixed(1)}%
                  </p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                  <PieChart className="w-6 h-6 text-blue-600" />
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* DRE */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                DRE - Demonstrativo de Resultado
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-200">
                  <span className="font-medium text-gray-900">RECEITA BRUTA</span>
                  <span className="font-bold text-gray-900">{formatCurrency(receitaBruta)}</span>
                </div>

                <div className="pl-4 space-y-2">
                  <p className="text-sm text-gray-500 font-medium">(-) Custos Operacionais</p>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Mão de Obra</span>
                    <span className="text-red-600">- {formatCurrency(custoMaoObra)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Materiais</span>
                    <span className="text-red-600">- {formatCurrency(custoMateriais)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Deslocamento</span>
                    <span className="text-red-600">- {formatCurrency(custoDeslocamento)}</span>
                  </div>

                  {Object.entries(custosExtrasPorTipo).map(([tipo, valor]) => (
                    <div key={tipo} className="flex justify-between text-sm">
                      <span className="text-gray-600">{getTipoLabel(tipo)}</span>
                      <span className="text-red-600">- {formatCurrency(valor)}</span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between py-2 border-t border-gray-200">
                  <span className="text-gray-700">Total Custos</span>
                  <span className="font-medium text-red-600">- {formatCurrency(custoTotal)}</span>
                </div>

                <div className={`flex justify-between py-3 border-t-2 ${lucroOperacional >= 0 ? 'border-green-500' : 'border-red-500'}`}>
                  <span className="font-bold text-gray-900">LUCRO OPERACIONAL</span>
                  <span className={`font-bold text-xl ${lucroOperacional >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(lucroOperacional)}
                  </span>
                </div>
              </div>
            </div>

            {/* Estatísticas */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Estatísticas do Período
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Total de OS</p>
                  <p className="text-2xl font-bold text-gray-900">{totalOS}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Concluídas</p>
                  <p className="text-2xl font-bold text-green-600">{totalConcluidas}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Taxa de Conclusão</p>
                  <p className="text-2xl font-bold text-blue-600">{taxaConclusao.toFixed(0)}%</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-500">Ticket Médio</p>
                  <p className="text-xl font-bold text-gray-900">{formatCurrency(ticketMedio)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Top 5 Clientes (por Faturamento)
              </h2>
              {topClientes.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {topClientes.map(([nome, valor], index) => (
                    <div key={nome} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{nome}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(valor / (topClientes[0]?.[1] || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(valor)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Colaboradores */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Top 5 Colaboradores (por Dias Trabalhados)
              </h2>
              {topColaboradores.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Nenhum dado disponível</p>
              ) : (
                <div className="space-y-3">
                  {topColaboradores.map(([nome, dias], index) => (
                    <div key={nome} className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index === 0 ? 'bg-yellow-100 text-yellow-700' :
                        index === 1 ? 'bg-gray-100 text-gray-700' :
                        index === 2 ? 'bg-orange-100 text-orange-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{nome}</p>
                        <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
                          <div 
                            className="bg-green-500 h-2 rounded-full"
                            style={{ width: `${(dias / (topColaboradores[0]?.[1] || 1)) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-900">{dias} dias</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* OS por Status */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              {[
                { status: 'agendada', label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700' },
                { status: 'confirmada', label: 'Confirmada', bg: 'bg-cyan-100', text: 'text-cyan-700' },
                { status: 'em_execucao', label: 'Em Execução', bg: 'bg-yellow-100', text: 'text-yellow-700' },
                { status: 'pausada', label: 'Pausada', bg: 'bg-orange-100', text: 'text-orange-700' },
                { status: 'concluida', label: 'Concluída', bg: 'bg-green-100', text: 'text-green-700' },
                { status: 'cancelada', label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
                { status: 'com_pendencia', label: 'Pendência', bg: 'bg-purple-100', text: 'text-purple-700' },
              ].map((item) => {
                const count = ordensServico?.filter(os => os.status === item.status).length || 0
                return (
                  <div key={item.status} className={`p-3 rounded-lg ${item.bg}`}>
                    <p className={`text-2xl font-bold ${item.text}`}>{count}</p>
                    <p className={`text-xs ${item.text}`}>{item.label}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Relatorios
