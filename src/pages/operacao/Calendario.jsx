import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ChevronLeft, ChevronRight, Plus, Loader2, MapPin } from 'lucide-react'

const Calendario = () => {
  const [currentDate, setCurrentDate] = useState(new Date())

  const { data: ordensServico, isLoading } = useQuery({
    queryKey: ['calendario-os', currentDate.getMonth(), currentDate.getFullYear()],
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
        .gte('data_agendamento', inicioMes.toISOString().split('T')[0])
        .lte('data_agendamento', fimMes.toISOString().split('T')[0])
        .order('data_agendamento')

      if (error) throw error
      return data
    }
  })

  // Navegação do calendário
  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const goToToday = () => {
    setCurrentDate(new Date())
  }

  // Gerar dias do calendário
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()

    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const daysInMonth = lastDay.getDate()
    const startingDay = firstDay.getDay() // 0 = Domingo

    const days = []

    // Dias do mês anterior (vazios)
    for (let i = 0; i < startingDay; i++) {
      days.push({ day: null, date: null })
    }

    // Dias do mês atual
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i)
      days.push({ day: i, date })
    }

    return days
  }

  // Agrupar OS por dia
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
          <button onClick={goToToday} className="btn-secondary text-sm">
            Hoje
          </button>
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
                <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Grid do Calendário */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item, index) => {
                const osDay = getOSByDate(item.date)
                const today = isToday(item.date)

                return (
                  <div
                    key={index}
                    className={`min-h-[100px] p-1 border rounded-lg ${
                      item.day 
                        ? today 
                          ? 'bg-blue-50 border-blue-300' 
                          : 'bg-white border-gray-200 hover:bg-gray-50'
                        : 'bg-gray-50 border-gray-100'
                    }`}
                  >
                    {item.day && (
                      <>
                        <div className={`text-sm font-medium mb-1 ${today ? 'text-blue-600' : 'text-gray-700'}`}>
                          {item.day}
                        </div>
                        <div className="space-y-1">
                          {osDay.slice(0, 3).map((os) => (
                            <Link
                              key={os.id}
                              to={`/ordens-servico/${os.id}`}
                              className={`block text-xs p-1 rounded truncate text-white ${
                                os.equipe?.cor ? '' : getStatusColor(os.status)
                              }`}
                              style={os.equipe?.cor ? { backgroundColor: os.equipe.cor } : {}}
                              title={os.cliente?.nome}
                            >
                              {os.cliente?.nome || 'OS'}
                            </Link>
                          ))}
                          {osDay.length > 3 && (
                            <div className="text-xs text-gray-500 text-center">
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
        <p className="text-xs text-gray-500 mt-3">
          * OS com equipe designada usam a cor da equipe
        </p>
      </div>

      {/* Lista do Mês */}
      <div className="card">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          OS de {monthNames[currentDate.getMonth()]}
        </h3>
        {ordensServico?.length === 0 ? (
          <p className="text-gray-500 text-center py-8">Nenhuma OS agendada para este mês</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Data</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Cliente</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Local</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Equipe</th>
                  <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ordensServico?.map((os) => (
                  <tr key={os.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {new Date(os.data_agendamento).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link to={`/ordens-servico/${os.id}`} className="font-medium text-blue-600 hover:underline">
                        {os.cliente?.nome}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {os.cidade ? (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {os.cidade}/{os.estado}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3">
                      {os.equipe ? (
                        <span className="flex items-center gap-2">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: os.equipe.cor }}
                          />
                          <span className="text-sm text-gray-600">{os.equipe.nome}</span>
                        </span>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        os.status === 'agendada' ? 'bg-blue-100 text-blue-700' :
                        os.status === 'confirmada' ? 'bg-cyan-100 text-cyan-700' :
                        os.status === 'em_execucao' ? 'bg-yellow-100 text-yellow-700' :
                        os.status === 'concluida' ? 'bg-green-100 text-green-700' :
                        os.status === 'cancelada' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {os.status === 'agendada' ? 'Agendada' :
                         os.status === 'confirmada' ? 'Confirmada' :
                         os.status === 'em_execucao' ? 'Em Execução' :
                         os.status === 'concluida' ? 'Concluída' :
                         os.status === 'cancelada' ? 'Cancelada' :
                         os.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Calendario
