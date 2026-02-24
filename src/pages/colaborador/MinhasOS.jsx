import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  MapPin, Clock, Play, Square, Loader2, LogOut, User, Calendar,
  CheckCircle, AlertCircle, Navigation, Sun, ChevronRight, Timer,
  Camera, ClipboardCheck, AlertTriangle, MapPinOff, X
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

const formatarDistancia = (metros) => {
  if (metros < 1000) {
    return `${metros}m`
  }
  return `${(metros / 1000).toFixed(1)}km`
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
  const [osExpandida, setOsExpandida] = useState(null)

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
      console.log('Data de hoje:', hoje)

      // Buscar OS onde o colaborador está escalado
      const { data: osColaborador } = await supabase
        .from('os_colaboradores')
        .select(`
          ordem_servico_id,
          ordem_servico:ordens_servico(
            id, numero_os, data_agendamento, endereco, cidade, estado, latitude, longitude, status,
            cliente:clientes(nome),
            equipe:equipes(nome)
          )
        `)
        .eq('colaborador_id', colaborador.id)

      // Filtrar apenas OS de hoje
      const osHoje = osColaborador?.filter(oc => {
        if (!oc.ordem_servico?.data_agendamento) return false
        const dataOS = oc.ordem_servico.data_agendamento.substring(0, 10)
        return dataOS === hoje
      }) || []

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
    refetchInterval: 30000
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

  // Calcular distância até a OS
  const calcularDistanciaOS = (os) => {
    if (!localizacao) return null
    if (!os.latitude || !os.longitude) return null
    
    return calcularDistancia(
      localizacao.latitude,
      localizacao.longitude,
      parseFloat(os.latitude),
      parseFloat(os.longitude)
    )
  }

  // Verificar se pode fazer check-in
  const podeCheckin = (os) => {
    // Verificar horário mínimo (06:00)
    const agora = new Date()
    const horaAtual = agora.getHours()
    const horaMinima = parseInt(config?.horario_minimo?.split(':')[0] || '6')
    
    if (horaAtual < horaMinima) {
      return { pode: false, motivo: `Check-in permitido a partir das ${horaMinima}:00`, tipo: 'horario' }
    }

    // Verificar se já tem OS em andamento (e não é esta)
    if (osEmAndamento && osEmAndamento.id !== os.id) {
      return { pode: false, motivo: 'Finalize a OS atual antes de iniciar outra', tipo: 'andamento' }
    }

    // Verificar se tem localização
    if (!localizacao) {
      return { pode: false, motivo: 'Clique em "Atualizar" para obter sua localização', tipo: 'localizacao' }
    }

    // Verificar se a OS tem coordenadas
    if (!os.latitude || !os.longitude) {
      // OS SEM coordenadas - NÃO permite check-in
      return { pode: false, motivo: 'Obra sem coordenadas cadastradas. Contate o gestor.', tipo: 'sem_coordenadas' }
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
      return { 
        pode: false, 
        motivo: `Você está a ${formatarDistancia(distancia)} da obra. Aproxime-se para fazer check-in (máx: ${raioMax}m)`, 
        tipo: 'distancia',
        distancia 
      }
    }

    return { pode: true, distancia, tipo: 'ok' }
  }

  // Mutation para Check-in
  const checkinMutation = useMutation({
    mutationFn: async (os) => {
      const status = podeCheckin(os)
      if (!status.pode) {
        throw new Error(status.motivo)
      }

      const { data, error } = await supabase
        .from('os_checkins')
        .insert({
          ordem_servico_id: os.id,
          colaborador_id: colaborador.id,
          checkin_at: new Date().toISOString(),
          checkin_latitude: localizacao.latitude,
          checkin_longitude: localizacao.longitude,
          status: 'em_andamento'
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['minhas-os'])
      toast.success('Check-in realizado com sucesso!')
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao fazer check-in')
    }
  })

  // Mutation para Check-out
  const checkoutMutation = useMutation({
    mutationFn: async (os) => {
      const checkinTime = new Date(os.checkin.checkin_at)
      const checkoutTime = new Date()
      const horasTrabalhadas = (checkoutTime - checkinTime) / (1000 * 60 * 60)
      
      // Determinar se é meia diária ou diária completa (>= 4h = diária)
      const tipoDiaria = horasTrabalhadas >= 4 ? 'inteira' : 'meia'

      const { error } = await supabase
        .from('os_checkins')
        .update({
          checkout_at: checkoutTime.toISOString(),
          checkout_latitude: localizacao?.latitude,
          checkout_longitude: localizacao?.longitude,
          status: 'finalizado',
          horas_trabalhadas: horasTrabalhadas,
          tipo_diaria: tipoDiaria
        })
        .eq('id', os.checkin.id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['minhas-os'])
      toast.success('Obra finalizada com sucesso!')
    },
    onError: (error) => {
      toast.error(error.message || 'Erro ao finalizar')
    }
  })

  const formatHora = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  }

  const handleLogout = () => {
    localStorage.removeItem('colaborador_logado')
    navigate('/colaborador/login')
  }

  if (!colaborador) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 pb-20">
      {/* Header */}
      <div className="bg-blue-600 text-white px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <User className="w-5 h-5" />
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
                    ? `GPS: ±${Math.round(localizacao.accuracy)}m de precisão` 
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
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-green-700">
                <Timer className="w-5 h-5" />
                <span className="font-semibold">Em Andamento</span>
              </div>
              {osEmAndamento.numero_os && (
                <span className="text-xs font-mono bg-green-100 text-green-700 px-2 py-0.5 rounded">{osEmAndamento.numero_os}</span>
              )}
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

            {/* Checklists da OS em andamento */}
            <OSChecklistsMobile osId={osEmAndamento.id} />

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
            const distanciaOS = calcularDistanciaOS(os)
            const raioMax = config?.raio_maximo_metros || 200
            const temCoordenadas = os.latitude && os.longitude

            return (
              <div key={os.id} className="bg-white rounded-xl p-4 shadow-sm">
                {/* Info da OS */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{os.numero_os}</span>
                    </div>
                    <p className="font-semibold text-gray-900 mt-1">{os.cliente?.nome}</p>
                    <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                      <MapPin className="w-4 h-4" />
                      <span>{os.endereco || 'Endereço não informado'}{os.cidade ? `, ${os.cidade}` : ''}</span>
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

                {/* Informação de Distância */}
                {!jaFezCheckin && localizacao && (
                  <div className={`flex items-center gap-2 p-3 rounded-lg mb-3 ${
                    !temCoordenadas ? 'bg-orange-50 text-orange-700' :
                    distanciaOS <= raioMax ? 'bg-green-50 text-green-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {!temCoordenadas ? (
                      <>
                        <MapPinOff className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">Obra sem coordenadas cadastradas</span>
                      </>
                    ) : distanciaOS <= raioMax ? (
                      <>
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          Você está a <strong>{formatarDistancia(distanciaOS)}</strong> da obra ✓
                        </span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span className="text-sm">
                          Você está a <strong>{formatarDistancia(distanciaOS)}</strong> da obra (máx: {raioMax}m)
                        </span>
                      </>
                    )}
                  </div>
                )}

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

                {/* Botão ver detalhes - OS concluída */}
                {jaFezCheckin && (
                  <button
                    onClick={() => setOsExpandida(osExpandida?.id === os.id ? null : os)}
                    className="w-full mt-3 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <ClipboardCheck className="w-4 h-4" />
                    {osExpandida?.id === os.id ? 'Fechar Detalhes' : 'Ver Detalhes / Checklists'}
                  </button>
                )}

                {jaFezCheckin && osExpandida?.id === os.id && (
                  <OSChecklistsMobile osId={os.id} />
                )}

                {/* Botão ver checklists - OS não iniciada */}
                {!jaFezCheckin && (
                  <>
                    <button
                      onClick={() => setOsExpandida(osExpandida?.id === os.id ? null : os)}
                      className="w-full mt-2 py-2 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
                    >
                      <ClipboardCheck className="w-4 h-4" />
                      {osExpandida?.id === os.id ? 'Fechar' : 'Checklists'}
                    </button>

                    {osExpandida?.id === os.id && (
                      <OSChecklistsMobile osId={os.id} />
                    )}
                  </>
                )}

                {/* Botão de Check-in */}
                {!jaFezCheckin && !osEmAndamento && (
                  <div className="mt-3">
                    {!statusCheckin.pode ? (
                      <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
                        statusCheckin.tipo === 'distancia' ? 'bg-red-50 text-red-700' :
                        statusCheckin.tipo === 'sem_coordenadas' ? 'bg-orange-50 text-orange-700' :
                        'bg-yellow-50 text-yellow-700'
                      }`}>
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
                            ({formatarDistancia(statusCheckin.distancia)})
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

// ============================================
// CHECKLISTS MOBILE
// ============================================

const OSChecklistsMobile = ({ osId }) => {
  const queryClient = useQueryClient()

  const { data: checklists, isLoading } = useQuery({
    queryKey: ['os-checklists-mobile', osId],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_checklists')
        .select(`
          id, nome, tipo, concluido,
          itens:os_checklist_itens(
            id, pergunta, descricao, tipo_resposta, obrigatorio,
            resposta_texto, resposta_numero, resposta_checkbox,
            resposta_foto_url, resposta_assinatura_url, resposta_data,
            resposta_hora, resposta_selecao, resposta_selecao_multipla,
            respondido, opcoes, categoria, ordem
          )
        `)
        .eq('ordem_servico_id', osId)
        .order('created_at')
      return data || []
    }
  })

  const [expandedChecklist, setExpandedChecklist] = useState(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(null) // itemId sendo uploaded

  const handleResponder = async (itemId, campo, valor) => {
    setSaving(true)
    try {
      const updateData = { [campo]: valor, respondido: true }
      const { error } = await supabase
        .from('os_checklist_itens')
        .update(updateData)
        .eq('id', itemId)
      if (error) throw error
      queryClient.invalidateQueries(['os-checklists-mobile', osId])
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleFotoUpload = async (itemId, file) => {
    if (!file) return
    setUploading(itemId)
    try {
      const ext = file.name.split('.').pop()
      const fileName = `checklist/${osId}/${itemId}_${Date.now()}.${ext}`
      
      const { error: uploadError } = await supabase.storage
        .from('anexos')
        .upload(fileName, file, { cacheControl: '3600', upsert: true })
      
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('anexos')
        .getPublicUrl(fileName)

      await handleResponder(itemId, 'resposta_foto_url', urlData.publicUrl)
      toast.success('Foto enviada!')
    } catch (err) {
      toast.error('Erro ao enviar foto: ' + err.message)
    } finally {
      setUploading(null)
    }
  }

  if (isLoading) return (
    <div className="flex justify-center py-4">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  )

  if (!checklists?.length) return (
    <div className="mt-3 p-4 bg-gray-50 rounded-xl text-center text-sm text-gray-500">
      Nenhum checklist vinculado a esta OS
    </div>
  )

  return (
    <div className="mt-3 space-y-3">
      <h4 className="font-semibold text-gray-900 flex items-center gap-2">
        <ClipboardCheck className="w-4 h-4 text-blue-600" />
        Checklists
      </h4>
      {checklists.map(cl => {
        const totalItens = cl.itens?.length || 0
        const respondidos = cl.itens?.filter(i => i.respondido).length || 0
        const progresso = totalItens > 0 ? Math.round((respondidos / totalItens) * 100) : 0
        const isExpanded = expandedChecklist === cl.id

        return (
          <div key={cl.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setExpandedChecklist(isExpanded ? null : cl.id)}
              className="w-full p-4 flex items-center justify-between"
            >
              <div className="text-left">
                <p className="font-medium text-gray-900">{cl.nome}</p>
                <p className="text-xs text-gray-500 mt-0.5">{respondidos}/{totalItens} itens • {progresso}%</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full transition-all" style={{width: `${progresso}%`}} />
                </div>
                <ChevronRight className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
              </div>
            </button>

            {isExpanded && (
              <div className="border-t p-4 space-y-4">
                {cl.itens?.sort((a,b) => a.ordem - b.ordem).map(item => (
                  <div key={item.id} className="space-y-1.5">
                    <label className="text-sm font-medium text-gray-700">
                      {item.pergunta}
                      {item.obrigatorio && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    {item.descricao && <p className="text-xs text-gray-500">{item.descricao}</p>}

                    {/* Checkbox */}
                    {item.tipo_resposta === 'checkbox' && (
                      <button
                        onClick={() => handleResponder(item.id, 'resposta_checkbox', !item.resposta_checkbox)}
                        className={`flex items-center gap-2 w-full p-3 rounded-lg border transition-colors ${
                          item.resposta_checkbox
                            ? 'bg-green-50 border-green-300 text-green-700'
                            : 'bg-white border-gray-200 text-gray-600'
                        }`}
                      >
                        {item.resposta_checkbox ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : (
                          <div className="w-5 h-5 rounded-full border-2 border-gray-300" />
                        )}
                        <span className="text-sm">{item.resposta_checkbox ? 'Sim' : 'Marcar como feito'}</span>
                      </button>
                    )}

                    {/* Texto */}
                    {item.tipo_resposta === 'texto' && (
                      <input
                        type="text"
                        defaultValue={item.resposta_texto || ''}
                        onBlur={(e) => handleResponder(item.id, 'resposta_texto', e.target.value)}
                        className="input-field text-sm"
                        placeholder="Digite aqui..."
                      />
                    )}

                    {/* Número */}
                    {item.tipo_resposta === 'numero' && (
                      <input
                        type="number"
                        defaultValue={item.resposta_numero || ''}
                        onBlur={(e) => handleResponder(item.id, 'resposta_numero', parseFloat(e.target.value))}
                        className="input-field text-sm"
                        placeholder="0"
                      />
                    )}

                    {/* Seleção única */}
                    {item.tipo_resposta === 'selecao_unica' && (
                      <div className="space-y-1.5">
                        {(item.opcoes || []).map((opcao, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleResponder(item.id, 'resposta_texto', opcao)}
                            className={`w-full text-left p-3 rounded-lg border text-sm transition-colors ${
                              item.resposta_texto === opcao
                                ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                                : 'bg-white border-gray-200 text-gray-600'
                            }`}
                          >
                            {opcao}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Foto */}
                    {item.tipo_resposta === 'foto' && (
                      <div className="space-y-2">
                        {item.resposta_foto_url ? (
                          <div className="relative">
                            <img 
                              src={item.resposta_foto_url} 
                              alt="Foto" 
                              className="w-full h-48 object-cover rounded-lg border"
                            />
                            <button
                              onClick={() => handleResponder(item.id, 'resposta_foto_url', null)}
                              className="absolute top-2 right-2 bg-red-500 text-white p-1.5 rounded-full shadow-lg"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <label className={`flex flex-col items-center justify-center w-full h-32 rounded-lg border-2 border-dashed cursor-pointer transition-colors ${
                            uploading === item.id ? 'border-blue-300 bg-blue-50' : 'border-gray-300 bg-gray-50 hover:bg-gray-100'
                          }`}>
                            {uploading === item.id ? (
                              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                            ) : (
                              <>
                                <Camera className="w-8 h-8 text-gray-400 mb-2" />
                                <span className="text-sm text-gray-500">Tirar foto ou escolher</span>
                              </>
                            )}
                            <input
                              type="file"
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handleFotoUpload(item.id, e.target.files?.[0])}
                              disabled={uploading === item.id}
                            />
                          </label>
                        )}
                      </div>
                    )}

                    {/* Data */}
                    {item.tipo_resposta === 'data' && (
                      <input
                        type="date"
                        defaultValue={item.resposta_data || ''}
                        onChange={(e) => handleResponder(item.id, 'resposta_data', e.target.value)}
                        className="input-field text-sm"
                      />
                    )}

                    {/* Hora */}
                    {item.tipo_resposta === 'hora' && (
                      <input
                        type="time"
                        defaultValue={item.resposta_hora || ''}
                        onChange={(e) => handleResponder(item.id, 'resposta_hora', e.target.value)}
                        className="input-field text-sm"
                      />
                    )}

                    {/* Seleção Múltipla */}
                    {item.tipo_resposta === 'selecao_multipla' && (
                      <div className="space-y-1.5">
                        {(item.opcoes || []).map((opcao, idx) => {
                          const selecionados = item.resposta_selecao_multipla || []
                          const isSelected = selecionados.includes(opcao)
                          return (
                            <button
                              key={idx}
                              onClick={() => {
                                const novaLista = isSelected
                                  ? selecionados.filter(s => s !== opcao)
                                  : [...selecionados, opcao]
                                handleResponder(item.id, 'resposta_selecao_multipla', novaLista)
                              }}
                              className={`w-full text-left p-3 rounded-lg border text-sm transition-colors flex items-center gap-2 ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300 text-blue-700 font-medium'
                                  : 'bg-white border-gray-200 text-gray-600'
                              }`}
                            >
                              {isSelected ? (
                                <CheckCircle className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              ) : (
                                <div className="w-4 h-4 rounded border-2 border-gray-300 flex-shrink-0" />
                              )}
                              {opcao}
                            </button>
                          )
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default MinhasOS
