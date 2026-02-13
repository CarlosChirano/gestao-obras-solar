import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { Link } from 'react-router-dom'
import { 
  ClipboardList, 
  Clock, 
  CheckCircle, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Calendar,
  AlertTriangle,
  Users,
  ArrowRight,
  MapPin,
  Loader2,
  FileText,
  XCircle,
  Play,
  Wrench,
  BarChart3,
  PieChart as PieChartIcon
} from 'lucide-react'
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
  Line,
  Legend
} from 'recharts'

const Dashboard = () => {
  // Buscar todas as OS
  const { data: ordensServico, isLoading: loadingOS } = useQuery({
    queryKey: ['dashboard-os'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(nome),
          equipe:equipes(nome, cor)
        `)
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('data_agendamento', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // Buscar serviços das OS para ranking
  const { data: servicosOS } = useQuery({
    queryKey: ['dashboard-servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordem_servico_servicos')
        .select(`
          *,
          servico:servicos(nome),
          ordem_servico:ordens_servico(status, ativo)
        `)
      if (error) throw error
      return data?.filter(s => s.ordem_servico?.ativo) || []
    }
  })

  // Buscar colaboradores com certificados/EPIs vencendo
  const { data: alertas, isLoading: loadingAlertas } = useQuery({
    queryKey: ['dashboard-alertas'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0]
      const limite = new Date()
      limite.setDate(limite.getDate() + 30)
      const limiteStr = limite.toISOString().split('T')[0]

      const { data: certVencendo } = await supabase
        .from('certificados')
        .select('*, colaborador:colaboradores(nome)')
        .gte('data_validade', hoje)
        .lte('data_validade', limiteStr)

      const { data: episVencendo } = await supabase
        .from('epis')
        .select('*, colaborador:colaboradores(nome)')
        .gte('data_validade', hoje)
        .lte('data_validade', limiteStr)

      const { data: certVencidos } = await supabase
        .from('certificados')
        .select('*, colaborador:colaboradores(nome)')
        .lt('data_validade', hoje)

      const { data: episVencidos } = await supabase
        .from('epis')
        .select('*, colaborador:colaboradores(nome)')
        .lt('data_validade', hoje)

      return {
        certificadosVencendo: certVencendo || [],
        episVencendo: episVencendo || [],
        certificadosVencidos: certVencidos || [],
        episVencidos: episVencidos || []
      }
    }
  })

  // Cálculos básicos
  const hoje = new Date()
  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)

  const osMesAtual = ordensServico?.filter(os => {
    const dataOS = new Date(os.created_at)
    return dataOS >= inicioMes && dataOS <= fimMes
  }) || []

  const totalOS = ordensServico?.length || 0
  const osEmAndamento = ordensServico?.filter(os => os.status === 'em_execucao').length || 0
  const osConcluidas = ordensServico?.filter(os => os.status === 'concluida').length || 0
  const osAgendadas = ordensServico?.filter(os => os.status === 'agendada' || os.status === 'confirmada').length || 0

  // Faturamento do mês (OS concluídas)
  const faturamentoMes = osMesAtual
    .filter(os => os.status === 'concluida')
    .reduce((sum, os) => sum + (parseFloat(os.valor_total) || 0), 0)

  // Faturamento total
  const faturamentoTotal = ordensServico
    ?.filter(os => os.status === 'concluida')
    .reduce((sum, os) => sum + (parseFloat(os.valor_total) || 0), 0) || 0

  // Faturamento por mês (últimos 6 meses)
  const faturamentoPorMes = () => {
    const meses = []
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fim = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0)
      
      const faturamento = ordensServico
        ?.filter(os => {
          const dataOS = new Date(os.created_at)
          return dataOS >= data && dataOS <= fim && os.status === 'concluida'
        })
        .reduce((sum, os) => sum + (parseFloat(os.valor_total) || 0), 0) || 0

      const qtdOS = ordensServico
        ?.filter(os => {
          const dataOS = new Date(os.created_at)
          return dataOS >= data && dataOS <= fim && os.status === 'concluida'
        }).length || 0

      meses.push({
        mes: data.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        faturamento: faturamento,
        quantidade: qtdOS
      })
    }
    return meses
  }

  // OS por status (para gráfico de pizza)
  const osPorStatus = [
    { name: 'Agendadas', value: ordensServico?.filter(os => os.status === 'agendada').length || 0, color: '#3B82F6' },
    { name: 'Confirmadas', value: ordensServico?.filter(os => os.status === 'confirmada').length || 0, color: '#06B6D4' },
    { name: 'Em Execução', value: ordensServico?.filter(os => os.status === 'em_execucao').length || 0, color: '#EAB308' },
    { name: 'Pausadas', value: ordensServico?.filter(os => os.status === 'pausada').length || 0, color: '#F97316' },
    { name: 'Concluídas', value: ordensServico?.filter(os => os.status === 'concluida').length || 0, color: '#22C55E' },
    { name: 'Canceladas', value: ordensServico?.filter(os => os.status === 'cancelada').length || 0, color: '#EF4444' },
    { name: 'Com Pendência', value: ordensServico?.filter(os => os.status === 'com_pendencia').length || 0, color: '#A855F7' },
  ].filter(item => item.value > 0)

  // Top 5 Serviços mais realizados
  const topServicos = () => {
    const contagem = {}
    servicosOS?.forEach(s => {
      const nome = s.servico?.nome || 'Serviço'
      contagem[nome] = (contagem[nome] || 0) + (s.quantidade || 1)
    })
    
    return Object.entries(contagem)
      .map(([nome, quantidade]) => ({ nome, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 5)
  }

  // Próximas OS
  const proximasOS = ordensServico
    ?.filter(os => {
      const dataOS = new Date(os.data_agendamento)
      return dataOS >= hoje && (os.status === 'agendada' || os.status === 'confirmada')
    })
    .slice(0, 5) || []

  // OS em atraso
  const osAtrasadas = ordensServico?.filter(os => {
    const dataOS = new Date(os.data_agendamento)
    return dataOS < hoje && !['concluida', 'cancelada'].includes(os.status)
  }) || []

  // Comparação com mês anterior
  const mesAnteriorInicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
  const mesAnteriorFim = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
  
  const faturamentoMesAnterior = ordensServico
    ?.filter(os => {
      const dataOS = new Date(os.created_at)
      return dataOS >= mesAnteriorInicio && dataOS <= mesAnteriorFim && os.status === 'concluida'
    })
    .reduce((sum, os) => sum + (parseFloat(os.valor_total) || 0), 0) || 0

  const variacaoFaturamento = faturamentoMesAnterior > 0 
    ? ((faturamentoMes - faturamentoMesAnterior) / faturamentoMesAnterior * 100).toFixed(1)
    : 0

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const formatCurrencyShort = (value) => {
    if (value >= 1000000) {
      return `R$ ${(value / 1000000).toFixed(1)}M`
    }
    if (value >= 1000) {
      return `R$ ${(value / 1000).toFixed(1)}K`
    }
    return formatCurrency(value)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const getStatusConfig = (status) => {
    const configs = {
      agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700' },
      confirmada: { label: 'Confirmada', bg: 'bg-cyan-100', text: 'text-cyan-700' },
      em_execucao: { label: 'Em Execução', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      pausada: { label: 'Pausada', bg: 'bg-orange-100', text: 'text-orange-700' },
      concluida: { label: 'Concluída', bg: 'bg-green-100', text: 'text-green-700' },
      cancelada: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
      com_pendencia: { label: 'Pendência', bg: 'bg-purple-100', text: 'text-purple-700' }
    }
    return configs[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' }
  }

  const totalAlertas = (alertas?.certificadosVencendo?.length || 0) + 
                       (alertas?.episVencendo?.length || 0) +
                       (alertas?.certificadosVencidos?.length || 0) +
                       (alertas?.episVencidos?.length || 0)

  // Custom tooltip para gráficos
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-lg shadow-lg border border-gray-200">
          <p className="font-medium text-gray-900">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.name === 'Faturamento' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  if (loadingOS) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Visão geral do sistema</p>
      </div>

      {/* Cards Principais */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total de OS */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de OS</p>
              <p className="text-3xl font-bold text-gray-900">{totalOS}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <ClipboardList className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-green-600 font-medium">{osConcluidas}</span>
            <span className="text-gray-500">concluídas</span>
            <span className="text-gray-300">|</span>
            <span className="text-yellow-600 font-medium">{osEmAndamento}</span>
            <span className="text-gray-500">em andamento</span>
          </div>
        </div>

        {/* Faturamento do Mês */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Faturamento do Mês</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyShort(faturamentoMes)}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <DollarSign className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            {parseFloat(variacaoFaturamento) > 0 ? (
              <span className="flex items-center gap-1 text-green-600">
                <TrendingUp className="w-4 h-4" />
                +{variacaoFaturamento}%
              </span>
            ) : parseFloat(variacaoFaturamento) < 0 ? (
              <span className="flex items-center gap-1 text-red-600">
                <TrendingDown className="w-4 h-4" />
                {variacaoFaturamento}%
              </span>
            ) : (
              <span className="text-gray-500">-</span>
            )}
            <span className="text-gray-500">vs mês anterior</span>
          </div>
        </div>

        {/* OS Agendadas */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">OS Agendadas</p>
              <p className="text-3xl font-bold text-gray-900">{osAgendadas}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            {osAtrasadas.length > 0 ? (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="w-4 h-4" />
                {osAtrasadas.length} atrasadas
              </span>
            ) : (
              <span className="text-green-600">Tudo em dia!</span>
            )}
          </div>
        </div>

        {/* Faturamento Total */}
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Faturamento Total</p>
              <p className="text-3xl font-bold text-gray-900">{formatCurrencyShort(faturamentoTotal)}</p>
            </div>
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
              <BarChart3 className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-gray-500">Todas as OS concluídas</span>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de Faturamento por Mês */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Faturamento por Mês</h2>
            <BarChart3 className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={faturamentoPorMes()}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis 
                  dataKey="mes" 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#6B7280' }}
                  axisLine={{ stroke: '#E5E7EB' }}
                  tickFormatter={(value) => formatCurrencyShort(value)}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="faturamento" 
                  name="Faturamento"
                  fill="#22C55E" 
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico de OS por Status */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">OS por Status</h2>
            <PieChartIcon className="w-5 h-5 text-gray-400" />
          </div>
          <div className="h-64 flex items-center">
            <ResponsiveContainer width="60%" height="100%">
              <PieChart>
                <Pie
                  data={osPorStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {osPorStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="w-40 space-y-2">
              {osPorStatus.map((item, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-gray-600">{item.name}</span>
                  <span className="font-medium text-gray-900 ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Segunda linha de gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Serviços */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Top Serviços</h2>
            <Wrench className="w-5 h-5 text-gray-400" />
          </div>
          <div className="space-y-3">
            {topServicos().length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum serviço registrado</p>
            ) : (
              topServicos().map((servico, index) => {
                const maxQtd = topServicos()[0]?.quantidade || 1
                const percentage = (servico.quantidade / maxQtd) * 100
                return (
                  <div key={index}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700 truncate" title={servico.nome}>
                        {index + 1}. {servico.nome}
                      </span>
                      <span className="font-medium text-gray-900 ml-2">{servico.quantidade}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Próximas OS */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Próximas OS</h2>
            <Link to="/ordens-servico" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
              Ver todas <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          
          {proximasOS.length === 0 ? (
            <div className="text-center py-8">
              <Calendar className="w-10 h-10 mx-auto text-gray-400 mb-2" />
              <p className="text-gray-500">Nenhuma OS agendada</p>
            </div>
          ) : (
            <div className="space-y-3">
              {proximasOS.map((os) => {
                const statusConfig = getStatusConfig(os.status)
                return (
                  <Link 
                    key={os.id}
                    to={`/ordens-servico/${os.id}`}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center border border-gray-200">
                        <Calendar className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{os.cliente?.nome || 'Cliente'}</p>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span>{formatDate(os.data_agendamento)}</span>
                          {os.cidade && (
                            <>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {os.cidade}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                      {statusConfig.label}
                    </span>
                  </Link>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Alertas */}
      {(totalAlertas > 0 || osAtrasadas.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Alertas de Documentação */}
          {totalAlertas > 0 && (
            <div className="card border-l-4 border-l-orange-500">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <h2 className="text-lg font-semibold text-gray-900">Alertas de Documentação</h2>
              </div>
              <div className="space-y-2">
                {alertas?.certificadosVencidos?.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">Certificados vencidos</span>
                    <span className="badge badge-danger">{alertas.certificadosVencidos.length}</span>
                  </div>
                )}
                {alertas?.episVencidos?.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <span className="text-sm text-red-700">EPIs vencidos</span>
                    <span className="badge badge-danger">{alertas.episVencidos.length}</span>
                  </div>
                )}
                {alertas?.certificadosVencendo?.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-yellow-700">Certificados vencendo em 30 dias</span>
                    <span className="badge badge-warning">{alertas.certificadosVencendo.length}</span>
                  </div>
                )}
                {alertas?.episVencendo?.length > 0 && (
                  <div className="flex items-center justify-between p-2 bg-yellow-50 rounded-lg">
                    <span className="text-sm text-yellow-700">EPIs vencendo em 30 dias</span>
                    <span className="badge badge-warning">{alertas.episVencendo.length}</span>
                  </div>
                )}
              </div>
              <Link to="/colaboradores" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
                Ver colaboradores →
              </Link>
            </div>
          )}

          {/* OS Atrasadas */}
          {osAtrasadas.length > 0 && (
            <div className="card border-l-4 border-l-red-500">
              <div className="flex items-center gap-2 mb-4">
                <XCircle className="w-5 h-5 text-red-500" />
                <h2 className="text-lg font-semibold text-gray-900">OS Atrasadas</h2>
              </div>
              <div className="space-y-2">
                {osAtrasadas.slice(0, 5).map((os) => (
                  <Link 
                    key={os.id}
                    to={`/ordens-servico/${os.id}`}
                    className="flex items-center justify-between p-2 bg-red-50 rounded-lg hover:bg-red-100"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{os.cliente?.nome}</p>
                      <p className="text-xs text-gray-500">Agendada: {formatDate(os.data_agendamento)}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                  </Link>
                ))}
              </div>
              {osAtrasadas.length > 5 && (
                <Link to="/ordens-servico" className="text-sm text-blue-600 hover:underline mt-4 inline-block">
                  Ver todas ({osAtrasadas.length}) →
                </Link>
              )}
            </div>
          )}
        </div>
      )}

      {/* Ações Rápidas */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link 
            to="/ordens-servico/nova"
            className="flex flex-col items-center gap-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <ClipboardList className="w-6 h-6 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Nova OS</span>
          </Link>
          <Link 
            to="/colaboradores/novo"
            className="flex flex-col items-center gap-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <Users className="w-6 h-6 text-green-600" />
            <span className="text-sm font-medium text-green-700">Novo Colaborador</span>
          </Link>
          <Link 
            to="/clientes/novo"
            className="flex flex-col items-center gap-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <FileText className="w-6 h-6 text-purple-600" />
            <span className="text-sm font-medium text-purple-700">Novo Cliente</span>
          </Link>
          <Link 
            to="/calendario"
            className="flex flex-col items-center gap-2 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors"
          >
            <Calendar className="w-6 h-6 text-orange-600" />
            <span className="text-sm font-medium text-orange-700">Calendário</span>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
