import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, ChevronRight, Plus, Loader2, MapPin, X, Users, DollarSign, Clock, Eye } from 'lucide-react'

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const Calendario = () => {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [diaExpandido, setDiaExpandido] = useState(null) // { date, dateStr }

  const { data: ordensServico, isLoading } = useQuery({
    queryKey: ['calendario-os', `${currentDate.getFullYear()}-${currentDate.getMonth()}`],
    keepPreviousData: true,
    queryFn: async () => {
      const inicioMes = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
      const fimMes = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0)

      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(nome),
          equipe:equipes(nome, cor)
        `)
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')
        .gte('data_agendamento', inicioMes.toISOString().split('T')[0])
        .lte('data_agendamento', fimMes.toISOString().split('T')[0])
        .order('data_agendamento')

      if (error) throw error

      // Buscar colaboradores e veículos para todas as OS do mês
      if (data && data.length > 0) {
        const osIds = data.map(os => os.id)

        const { data: colabs } = await supabase
          .from('os_colaboradores')
          .select('ordem_servico_id, colaborador_id, valor_total, colaborador:colaboradores(nome)')
          .in('ordem_servico_id', osIds)

        const { data: veiculos } = await supabase
          .from('os_veiculos')
          .select('ordem_servico_id, valor_aluguel, valor_gasolina, valor_gelo, valor_cafe, valor_total')
          .in('ordem_servico_id', osIds)

        // Agrupar por OS
        data.forEach(os => {
          os._colaboradores = colabs?.filter(c => c.ordem_servico_id === os.id) || []
          os._veiculos = veiculos?.filter(v => v.ordem_servico_id === os.id) || []
          os._custoMaoObra = os._colaboradores.reduce((s, c) => s + (parseFloat(c.valor_total) || 0), 0)
          os._custoVeiculo = os._veiculos.reduce((s, v) => s + (parseFloat(v.valor_total) || 0), 0)
          os._custoTotal = os._custoMaoObra + os._custoVeiculo
        })
      }

      return data
    }
  })

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  const goToToday = () => setCurrentDate(new Date())

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay()
    const days = []
    for (let i = 0; i < startingDay; i++) days.push({ day: null, date: null })
    for (let i = 1; i <= daysInMonth; i++) days.push({ day: i, date: new Date(year, month, i) })
    return days
  }

  const getOSByDate = (date) => {
    if (!date || !ordensServico) return []
    const dateStr = date.toISOString().split('T')[0]
    return ordensServico.filter(os => os.data_agendamento === dateStr)
  }

  const getStatusColor = (status) => {
    const colors = {
      agendada: 'bg-blue-500',
      confirmada: 'bg-cyan-500',
      em_execucao: 'bg-yellow-500',
      pausada: 'bg-orange-500',
      concluida: 'bg-green-500',
      cancelada: 'bg-red-500',
      com_pendencia: 'bg-purple-500'
    }
    return colors[status] || 'bg-gray-500'
  }

  const getStatusLabel = (status) => {
    const labels = {
      agendada: 'Agendada',
      confirmada: 'Confirmada',
      em_execucao: 'Em Execução',
      pausada: 'Pausada',
      concluida: 'Concluída',
      cancelada: 'Cancelada',
      com_pendencia: 'Pendência'
    }
    return labels[status] || status
  }

  const getStatusBadge = (status) => {
    const styles = {
      agendada: 'bg-blue-100 text-blue-700',
      confirmada: 'bg-cyan-100 text-cyan-700',
      em_execucao: 'bg-yellow-100 text-yellow-700',
      pausada: 'bg-orange-100 text-orange-700',
      concluida: 'bg-green-100 text-green-700',
      cancelada: 'bg-red-100 text-red-700',
      com_pendencia: 'bg-purple-100 text-purple-700'
    }
    return styles[status] || 'bg-gray-100 text-gray-700'
  }

  const isToday = (date) => {
    if (!date) return false
    const today = new Date()
    return date.toDateString() === today.toDateString()
  }

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ]
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
  const calendarDays = generateCalendarDays()

  // OS do dia expandido
  const osDiaExpandido = diaExpandido ? getOSByDate(diaExpandido.date) : []

  const handleDiaClick = (date) => {
    if (!date) return
    const osDay = getOSByDate(date)
    if (osDay.length > 0) {
      setDiaExpandido({
        date,
        dateStr: date.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-600">Visualize as ordens de serviço agendadas</p>
        </div>
        <Link to="/ordens-servico/nova" className="btn-primary">
          <Plus className="w-5 h-5" /> Nova OS
        </Link>
      </div>

      {/* Navegação do Calendário */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-semibold text-gray-900 ml-2">
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
          </div>
          <button onClick={goToToday} className="btn-secondary text-sm">Hoje</button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : (
          <>
            {/* Cabeçalho dos dias da semana */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">{day}</div>
              ))}
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, index) => {
                const osDay = getOSByDate(item.date)
                const today = isToday(item.date)
                const hasOS = osDay.length > 0

                return (
                  <div
                    key={index}
                    onClick={() => handleDiaClick(item.date)}
                    className={`min-h-[100px] p-1 border rounded-lg transition-colors ${
                      item.day
                        ? today
                          ? 'bg-blue-50 border-blue-300'
                          : hasOS
                            ? 'bg-white border-gray-200 hover:bg-blue-50 hover:border-blue-200 cursor-pointer'
                            : 'bg-white border-gray-200'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {item.day && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`text-sm font-medium mb-1 ${today ? 'text-blue-600' : 'text-gray-700'}`}>
                            {item.day}
                          </span>
                          {hasOS && (
                            <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 rounded-full font-medium">
                              {osDay.length}
                            </span>
                          )}
                        </div>
                        <div className="space-y-1">
                          {osDay.slice(0, 3).map((os) => (
                            <div
                              key={os.id}
                              className={`text-xs p-1 rounded truncate text-white ${
                                os.equipe?.cor ? '' : getStatusColor(os.status)
                              }`}
                              style={os.equipe?.cor ? { backgroundColor: os.equipe.cor } : {}}
                              title={os.cliente?.nome}
                            >
                              {os.cliente?.nome || 'OS'}
                            </div>
                          ))}
                          {osDay.length > 3 && (
                            <div className="text-xs text-blue-600 text-center font-medium cursor-pointer">
                              +{osDay.length - 3} mais
                            </div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ============================================ */}
      {/* MODAL: DIA EXPANDIDO */}
      {/* ============================================ */}
      {diaExpandido && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDiaExpandido(null)}>
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[85vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header do Modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-white">
              <div>
                <h3 className="text-lg font-bold text-gray-900 capitalize">{diaExpandido.dateStr}</h3>
                <p className="text-sm text-gray-500">{osDiaExpandido.length} ordem{osDiaExpandido.length !== 1 ? 'ns' : ''} de serviço</p>
              </div>
              <button onClick={() => setDiaExpandido(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Resumo do dia */}
            <div className="px-6 py-3 bg-gray-50 border-b grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-xs text-gray-500">Receita do dia</p>
                <p className="text-sm font-bold text-green-600">
                  {formatCurrency(osDiaExpandido.reduce((s, os) => s + (parseFloat(os.valor_cobrado || os.valor_total) || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Custo do dia</p>
                <p className="text-sm font-bold text-red-600">
                  {formatCurrency(osDiaExpandido.reduce((s, os) => s + (os._custoTotal || 0), 0))}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Colaboradores</p>
                <p className="text-sm font-bold text-blue-600">
                  {[...new Set(osDiaExpandido.flatMap(os => (os._colaboradores || []).map(c => c.colaborador_id)))].length}
                </p>
              </div>
            </div>

            {/* Lista de OS */}
            <div className="overflow-y-auto max-h-[55vh] divide-y">
              {osDiaExpandido.map((os) => {
                const valorExibir = parseFloat(os.valor_cobrado || os.valor_total) || 0
                const margem = valorExibir - (os._custoTotal || 0)

                return (
                  <div key={os.id} className="px-6 py-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between gap-4">
                      {/* Info da OS */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(os.status)}`}>
                            {getStatusLabel(os.status)}
                          </span>
                          {os.equipe && (
                            <span className="flex items-center gap-1 text-xs text-gray-500">
                              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: os.equipe.cor }} />
                              {os.equipe.nome}
                            </span>
                          )}
                          {os.numero_os && (
                            <span className="text-xs text-gray-400">#{os.numero_os}</span>
                          )}
                        </div>
                        <h4 className="font-semibold text-gray-900 truncate">{os.cliente?.nome || 'Sem cliente'}</h4>
                        {os.endereco && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" /> {os.endereco}{os.cidade ? ` - ${os.cidade}` : ''}
                          </p>
                        )}

                        {/* Colaboradores */}
                        {os._colaboradores?.length > 0 && (
                          <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
                            <Users className="w-3 h-3" />
                            <span>{os._colaboradores.length} colaborador{os._colaboradores.length > 1 ? 'es' : ''}</span>
                            <span className="text-gray-400">—</span>
                            <span className="truncate">
                              {os._colaboradores.map(c => c.colaborador?.nome || '').filter(Boolean).join(', ')}
                            </span>
                          </div>
                        )}

                        {/* Custos detalhados */}
                        <div className="flex items-center gap-4 mt-2 text-xs">
                          {os._custoMaoObra > 0 && (
                            <span className="text-orange-600">
                              Mão de Obra: {formatCurrency(os._custoMaoObra)}
                            </span>
                          )}
                          {os._custoVeiculo > 0 && (
                            <span className="text-purple-600">
                              Veículo: {formatCurrency(os._custoVeiculo)}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Valores */}
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-gray-500">Valor</p>
                        <p className="font-bold text-green-600">{formatCurrency(valorExibir)}</p>
                        {os._custoTotal > 0 && (
                          <>
                            <p className="text-xs text-gray-500 mt-1">Custo: {formatCurrency(os._custoTotal)}</p>
                            <p className={`text-xs font-semibold ${margem >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                              Margem: {formatCurrency(margem)}
                            </p>
                          </>
                        )}
                        <Link
                          to={`/ordens-servico/${os.id}`}
                          className="inline-flex items-center gap-1 mt-2 text-xs text-blue-600 hover:text-blue-800"
                        >
                          <Eye className="w-3 h-3" /> Ver OS
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Legenda */}
      <div className="card">
        <h3 className="text-sm font-medium text-gray-700 mb-3">Legenda de Status</h3>
        <div className="flex flex-wrap gap-4">
          {[
            { status: 'agendada', label: 'Agendada', color: 'bg-blue-500' },
            { status: 'confirmada', label: 'Confirmada', color: 'bg-cyan-500' },
            { status: 'em_execucao', label: 'Em Execução', color: 'bg-yellow-500' },
            { status: 'pausada', label: 'Pausada', color: 'bg-orange-500' },
            { status: 'concluida', label: 'Concluída', color: 'bg-green-500' },
            { status: 'com_pendencia', label: 'Pendência', color: 'bg-purple-500' },
          ].map((item) => (
            <div key={item.status} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded ${item.color}`} />
              <span className="text-sm text-gray-600">{item.label}</span>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">* OS com equipe designada usam a cor da equipe • Clique no dia para expandir</p>
      </div>
    </div>
  )
}

export default Calendario
