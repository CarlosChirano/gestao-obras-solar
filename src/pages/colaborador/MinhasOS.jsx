import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  MapPin, Clock, Play, Square, Loader2, LogOut, User, Calendar,
  CheckCircle, AlertCircle, Navigation, Sun, ChevronRight, Timer,
  Camera, ClipboardCheck
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// FUNÇÕES DE GEOLOCALIZAÇÃO
// ============================================

const calcularDistancia = (lat1, lon1, lat2, lon2) => {
  // Fórmula de Haversine para calcular distância em metros
  const R = 6371000 // Raio da Terra em metros
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
  return Math.round(R * c)
}

const obterLocalizacao = () => {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocalização não suportada'))
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    )
  })
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const MinhasOS = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [colaborador, setColaborador] = useState(null)
  const [localizacao, setLocalizacao] = useState(null)
  const [loadingLocation, setLoadingLocation] = useState(false)
  const [osEmAndamento, setOsEmAndamento] = useState(null)

  // Verificar se está logado
  useEffect(() => {
    const colabData = localStorage.getItem('colaborador_logado')
    if (!colabData) {
      navigate('/colaborador/login')
      return
    }
    setColaborador(JSON.parse(colabData))
  }, [navigate])

  // Buscar OS do dia para este colaborador
  const { data: minhasOS, isLoading } = useQuery({
    queryKey: ['minhas-os', colaborador?.id],
    queryFn: async () => {
      if (!colaborador?.id) return []

      const hoje = new Date().toISOString().split('T')[0]

      // Buscar OS onde o colaborador está escalado
      const { data: osColaborador } = await supabase
        .from('os_colaboradores')
        .select(`
          ordem_servico_id,
          ordem_servico:ordens_servico(
            id, data_agendamento, endereco, cidade, estado, latitude, longitude, status,
            cliente:clientes(nome),
            equipe:equipes(nome)
          )
        `)
        .eq('colaborador_id', colaborador.id)

      // Filtrar apenas OS de hoje
      const osHoje = osColaborador?.filter(oc => 
        oc.ordem_servico?.data_agendamento === hoje
      ) || []

      // Buscar check-ins existentes
      const osIds = osHoje.map(o => o.ordem_servico_id)
      
      const { data: checkins } = await supabase
        .from('os_checkins')
        .select('*')
        .eq('colaborador_id', colaborador.id)
        .in('ordem_servico_id', osIds)

      // Combinar dados
      return osHoje.map(oc => {
        const checkin = checkins?.find(c => c.ordem_servico_id === oc.ordem_servico_id)
        return {
          ...oc.ordem_servico,
          checkin: checkin || null
        }
      })
    },
    enabled: !!colaborador?.id,
    refetchInterval: 30000 // Atualizar a cada 30 segundos
  })

  // Verificar se tem OS em andamento
  useEffect(() => {
    const emAndamento = minhasOS?.find(os => os.checkin?.status === 'em_andamento')
    setOsEmAndamento(emAndamento || null)
  }, [minhasOS])

  // Buscar configurações
  const { data: config } = useQuery({
    queryKey: ['checkin-config'],
    queryFn: async () => {
      const { data } = await supabase.from('checkin_config').select('*').single()
      return data || { raio_maximo_metros: 200, horario_minimo: '06:00:00' }
    }
  })

  // Obter localização atual
  const atualizarLocalizacao = async () => {
    setLoadingLocation(true)
    try {
      const loc = await obterLocalizacao()
      setLocalizacao(loc)
      toast.success('Localização atualizada!')
    } catch (error) {
      toast.error('Erro ao obter localização. Verifique as permissões.')
    } finally {
      setLoadingLocation(false)
    }
  }

  // Verificar se pode fazer check-in
  const podeCheckin = (os) => {
    // Verificar horário mínimo (06:00)
    const agora = new Date()
    const horaAtual = agora.getHours()
    const minutoAtual = agora.getMinutes()
    const horaMinima = parseInt(config?.horario_minimo?.split(':')[0] || '6')
    
    if (horaAtual < horaMinima) {
      return { pode: false, motivo: `Check-in permitido a partir das ${horaMinima}:00` }
    }

    // Verificar se já tem OS em andamento (e não é esta)
    if (osEmAndamento && osEmAndamento.id !== os.id) {
      return { pode: false, motivo: 'Finalize a OS atual antes de iniciar outra' }
    }

    // Verificar se tem localização
    if (!localizacao) {
      return { pode: false, motivo: 'Clique em "Atualizar Localização"' }
    }

    // Verificar se a OS tem coordenadas
    if (!os.latitude || !os.longitude) {
      return { pode: true, motivo: 'Obra sem coordenadas - check-in liberado' }
    }

    // Calcular distância
    const distancia = calcularDistancia(
      localizacao.latitude,
      localizacao.longitude,
      parseFloat(os.latitude),
      parseFloat(os.longitude)
    )

    const raioMax = config?.raio_maximo_metros || 200

    if (distancia > raioMax) {
      return { pode: false, motivo: `Você está a ${distancia}m da obra (máximo: ${raioMax}m)` }
    }

    return { pode: true, distancia }
  }

  // Mutation: Fazer Check-in
  const checkinMutation = useMutation({
    mutationFn: async (os) => {
      const distancia = localizacao && os.latitude && os.longitude
        ? calcularDistancia(localizacao.latitude, localizacao.longitude, parseFloat(os.latitude), parseFloat(os.longitude))
        : null

      const { data, error } = await supabase
        .from('os_checkins')
        .insert([{
          ordem_servico_id: os.id,
          colaborador_id: colaborador.id,
          checkin_at: new Date().toISOString(),
          checkin_latitude: localizacao?.latitude,
          checkin_longitude: localizacao?.longitude,
          checkin_distancia_metros: distancia,
          status: 'em_andamento'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Check-in realizado com sucesso!')
      queryClient.invalidateQueries(['minhas-os'])
    },
    onError: (error) => {
      toast.error('Erro ao fazer check-in: ' + error.message)
    }
  })

  // Mutation: Fazer Check-out
  const checkoutMutation = useMutation({
    mutationFn: async (os) => {
      const distancia = localizacao && os.latitude && os.longitude
        ? calcularDistancia(localizacao.latitude, localizacao.longitude, parseFloat(os.latitude), parseFloat(os.longitude))
        : null

      const { data, error } = await supabase
        .from('os_checkins')
        .update({
          checkout_at: new Date().toISOString(),
          checkout_latitude: localizacao?.latitude,
          checkout_longitude: localizacao?.longitude,
          checkout_distancia_metros: distancia
        })
        .eq('id', os.checkin.id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      const horas = data.horas_trabalhadas || 0
      const tipo = data.tipo_diaria === 'meia' ? 'Meia diária' : 'Diária completa'
      toast.success(`Check-out realizado! ${horas.toFixed(1)}h trabalhadas (${tipo})`)
      queryClient.invalidateQueries(['minhas-os'])
    },
    onError: (error) => {
      toast.error('Erro ao fazer check-out: ' + error.message)
    }
  })

  // Logout
  const handleLogout = () => {
    localStorage.removeItem('colaborador_logado')
    navigate('/colaborador/login')
  }

  // Formatar hora
  const formatHora = (data) => {
    if (!data) return '-'
    return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  if (!colaborador) return null

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-blue-600 text-white p-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              {colaborador.foto_url ? (
                <img src={colaborador.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>
            <div>
              <p className="font-semibold">{colaborador.nome}</p>
              <p className="text-xs text-blue-200">
                <Calendar className="w-3 h-3 inline mr-1" />
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg">
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Localização */}
      <div className="p-4">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                localizacao ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                <Navigation className={`w-5 h-5 ${localizacao ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <p className="font-medium text-gray-900">Sua Localização</p>
                <p className="text-xs text-gray-500">
                  {localizacao 
                    ? `Precisão: ${Math.round(localizacao.accuracy)}m` 
                    : 'Clique para atualizar'}
                </p>
              </div>
            </div>
            <button
              onClick={atualizarLocalizacao}
              disabled={loadingLocation}
              className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
            >
              {loadingLocation ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                'Atualizar'
              )}
            </button>
          </div>
        </div>
      </div>

      {/* OS em Andamento */}
      {osEmAndamento && (
        <div className="px-4 mb-4">
          <div className="bg-green-50 border-2 border-green-500 rounded-xl p-4">
            <div className="flex items-center gap-2 text-green-700 mb-3">
              <Timer className="w-5 h-5" />
              <span className="font-semibold">Em Andamento</span>
            </div>
            
            <p className="font-semibold text-gray-900">{osEmAndamento.cliente?.nome}</p>
            <p className="text-sm text-gray-600">{osEmAndamento.endereco}, {osEmAndamento.cidade}</p>
            
            <div className="flex items-center gap-4 mt-3 text-sm">
              <div>
                <span className="text-gray-500">Entrada:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {formatHora(osEmAndamento.checkin?.checkin_at)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">Tempo:</span>
                <span className="font-medium text-gray-900 ml-1">
                  {osEmAndamento.checkin?.checkin_at && (
                    `${Math.round((Date.now() - new Date(osEmAndamento.checkin.checkin_at).getTime()) / 60000)} min`
                  )}
                </span>
              </div>
            </div>

            <button
              onClick={() => checkoutMutation.mutate(osEmAndamento)}
              disabled={checkoutMutation.isPending}
              className="w-full mt-4 bg-red-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-red-600 transition-colors disabled:opacity-50"
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Square className="w-5 h-5" />
              )}
              Finalizar Obra
            </button>
          </div>
        </div>
      )}

      {/* Título */}
      <div className="px-4 mb-3">
        <h2 className="text-lg font-semibold text-gray-900">Minhas OS de Hoje</h2>
        <p className="text-sm text-gray-500">{minhasOS?.length || 0} obras agendadas</p>
      </div>

      {/* Lista de OS */}
      <div className="px-4 pb-20 space-y-3">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : minhasOS?.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <Sun className="w-12 h-12 mx-auto text-yellow-400 mb-3" />
            <p className="text-gray-500">Nenhuma OS agendada para hoje</p>
          </div>
        ) : (
          minhasOS?.filter(os => os.id !== osEmAndamento?.id).map(os => {
            const statusCheckin = podeCheckin(os)
            const jaFezCheckin = os.checkin?.status === 'finalizado'

            return (
              <div key={os.id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Info da OS */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{os.cliente?.nome}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{os.endereco}, {os.cidade}</span>
                    </div>
                  </div>
                  
                  {jaFezCheckin ? (
                    <div className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">
                      <CheckCircle className="w-4 h-4" />
                      Concluída
                    </div>
                  ) : (
                    <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${
                      os.status === 'em_execucao' ? 'bg-blue-100 text-blue-700' :
                      os.status === 'confirmada' ? 'bg-green-100 text-green-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {os.status}
                    </div>
                  )}
                </div>

                {/* Se já finalizou */}
                {jaFezCheckin && (
                  <div className="bg-gray-50 rounded-lg p-3 space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Entrada:</span>
                      <span className="font-medium">{formatHora(os.checkin.checkin_at)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Saída:</span>
                      <span className="font-medium">{formatHora(os.checkin.checkout_at)}</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 mt-1">
                      <span className="text-gray-500">Total:</span>
                      <span className="font-bold text-blue-600">
                        {os.checkin.horas_trabalhadas?.toFixed(1)}h ({os.checkin.tipo_diaria === 'meia' ? 'Meia' : 'Diária'})
                      </span>
                    </div>
                  </div>
                )}

                {/* Botão de Check-in */}
                {!jaFezCheckin && !osEmAndamento && (
                  <div className="mt-3">
                    {!statusCheckin.pode ? (
                      <div className="flex items-center gap-2 p-3 bg-yellow-50 rounded-lg text-yellow-700 text-sm">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{statusCheckin.motivo}</span>
                      </div>
                    ) : (
                      <button
                        onClick={() => checkinMutation.mutate(os)}
                        disabled={checkinMutation.isPending}
                        className="w-full bg-green-500 text-white py-3 rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-green-600 transition-colors disabled:opacity-50"
                      >
                        {checkinMutation.isPending ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Play className="w-5 h-5" />
                        )}
                        Iniciar Obra
                        {statusCheckin.distancia && (
                          <span className="text-green-200 text-sm">
                            ({statusCheckin.distancia}m)
                          </span>
                        )}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
        <div className="flex justify-around">
          <button className="flex flex-col items-center p-2 text-blue-600">
            <ClipboardCheck className="w-6 h-6" />
            <span className="text-xs mt-1">Minhas OS</span>
          </button>
          <button 
            onClick={() => navigate('/colaborador/historico')}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <Calendar className="w-6 h-6" />
            <span className="text-xs mt-1">Histórico</span>
          </button>
          <button 
            onClick={() => navigate('/colaborador/perfil')}
            className="flex flex-col items-center p-2 text-gray-400"
          >
            <User className="w-6 h-6" />
            <span className="text-xs mt-1">Perfil</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default MinhasOS
