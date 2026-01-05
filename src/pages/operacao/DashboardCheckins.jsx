import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  MapPin, Clock, Users, CheckCircle, AlertCircle, Loader2,
  Play, Square, Calendar, Search, Filter, Eye, Edit,
  UserPlus, Key, Timer, TrendingUp, Building2
} from 'lucide-react'
import toast from 'react-hot-toast'

// Formatadores
const formatHora = (data) => {
  if (!data) return '-'
  return new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const DashboardCheckins = () => {
  const queryClient = useQueryClient()
  const [abaAtiva, setAbaAtiva] = useState('tempo-real')
  const [dataFiltro, setDataFiltro] = useState(new Date().toISOString().split('T')[0])
  const [showModalUsuario, setShowModalUsuario] = useState(false)
  const [showModalCheckinManual, setShowModalCheckinManual] = useState(false)
  const [colaboradorSelecionado, setColaboradorSelecionado] = useState(null)
  const [osSelecionada, setOsSelecionada] = useState(null)

  // ============================================
  // QUERIES
  // ============================================

  // Check-ins em andamento (tempo real)
  const { data: checkinsEmAndamento, isLoading: loadingAndamento } = useQuery({
    queryKey: ['checkins-em-andamento'],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_checkins')
        .select(`
          *,
          colaborador:colaboradores(nome, telefone, foto_url),
          ordem_servico:ordens_servico(
            endereco, cidade,
            cliente:clientes(nome)
          )
        `)
        .eq('status', 'em_andamento')
        .order('checkin_at', { ascending: false })
      return data || []
    },
    refetchInterval: 30000 // Atualiza a cada 30 segundos
  })

  // Check-ins do dia
  const { data: checkinsDoDia, isLoading: loadingDia } = useQuery({
    queryKey: ['checkins-do-dia', dataFiltro],
    queryFn: async () => {
      const inicioDia = `${dataFiltro}T00:00:00`
      const fimDia = `${dataFiltro}T23:59:59`

      const { data } = await supabase
        .from('os_checkins')
        .select(`
          *,
          colaborador:colaboradores(nome),
          ordem_servico:ordens_servico(
            endereco, cidade,
            cliente:clientes(nome)
          )
        `)
        .gte('checkin_at', inicioDia)
        .lte('checkin_at', fimDia)
        .order('checkin_at', { ascending: false })
      return data || []
    }
  })

  // Colaboradores sem usuário (para criar acesso)
  const { data: colaboradoresSemUsuario } = useQuery({
    queryKey: ['colaboradores-sem-usuario'],
    queryFn: async () => {
      const { data: usuarios } = await supabase
        .from('colaborador_usuarios')
        .select('colaborador_id')

      const idsComUsuario = usuarios?.map(u => u.colaborador_id) || []

      const { data: colaboradores } = await supabase
        .from('colaboradores')
        .select('id, nome, email, cpf')
        .eq('ativo', true)
        .order('nome')

      return colaboradores?.filter(c => !idsComUsuario.includes(c.id)) || []
    }
  })

  // OS de hoje sem check-in
  const { data: osSemCheckin } = useQuery({
    queryKey: ['os-sem-checkin', dataFiltro],
    queryFn: async () => {
      const { data: os } = await supabase
        .from('ordens_servico')
        .select(`
          id, endereco, cidade, data_agendamento,
          cliente:clientes(nome),
          os_colaboradores(
            colaborador_id,
            colaborador:colaboradores(nome)
          )
        `)
        .eq('data_agendamento', dataFiltro)
        .in('status', ['agendada', 'confirmada', 'em_execucao'])

      // Buscar check-ins existentes
      const osIds = os?.map(o => o.id) || []
      const { data: checkins } = await supabase
        .from('os_checkins')
        .select('ordem_servico_id, colaborador_id')
        .in('ordem_servico_id', osIds)

      // Filtrar colaboradores sem check-in
      return os?.map(o => ({
        ...o,
        colaboradores_sem_checkin: o.os_colaboradores?.filter(oc => 
          !checkins?.some(c => 
            c.ordem_servico_id === o.id && c.colaborador_id === oc.colaborador_id
          )
        ) || []
      })).filter(o => o.colaboradores_sem_checkin.length > 0) || []
    }
  })

  // Métricas
  const metricas = {
    emAndamento: checkinsEmAndamento?.length || 0,
    finalizadosHoje: checkinsDoDia?.filter(c => c.status === 'finalizado').length || 0,
    totalHorasHoje: checkinsDoDia?.reduce((sum, c) => sum + (c.horas_trabalhadas || 0), 0) || 0,
    semCheckin: osSemCheckin?.reduce((sum, os) => sum + os.colaboradores_sem_checkin.length, 0) || 0
  }

  // ============================================
  // MUTATIONS
  // ============================================

  // Criar usuário para colaborador
  const criarUsuarioMutation = useMutation({
    mutationFn: async (colaborador) => {
      const email = colaborador.email || `${colaborador.cpf?.replace(/\D/g, '')}@colaborador.app`
      const senha = colaborador.cpf?.replace(/\D/g, '') || '123456'

      // Criar no Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: senha,
        email_confirm: true
      })

      // Se der erro de admin, usar método normal
      if (authError?.message?.includes('admin')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password: senha
        })
        if (signUpError && !signUpError.message.includes('already registered')) {
          throw signUpError
        }
      }

      // Criar registro na tabela colaborador_usuarios
      const { error } = await supabase
        .from('colaborador_usuarios')
        .insert([{
          colaborador_id: colaborador.id,
          email: email.toLowerCase(),
          primeiro_acesso: true
        }])

      if (error) throw error

      return { email, senha }
    },
    onSuccess: (data) => {
      toast.success(`Usuário criado! Email: ${data.email}, Senha: CPF`)
      queryClient.invalidateQueries(['colaboradores-sem-usuario'])
      setShowModalUsuario(false)
    },
    onError: (error) => {
      toast.error('Erro ao criar usuário: ' + error.message)
    }
  })

  // Check-in manual
  const checkinManualMutation = useMutation({
    mutationFn: async ({ osId, colaboradorId, motivo }) => {
      const { data, error } = await supabase
        .from('os_checkins')
        .insert([{
          ordem_servico_id: osId,
          colaborador_id: colaboradorId,
          checkin_at: new Date().toISOString(),
          checkin_manual: true,
          checkin_manual_motivo: motivo,
          status: 'em_andamento'
        }])
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      toast.success('Check-in manual realizado!')
      queryClient.invalidateQueries(['checkins-em-andamento'])
      queryClient.invalidateQueries(['os-sem-checkin'])
      setShowModalCheckinManual(false)
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message)
    }
  })

  // Check-out manual
  const checkoutManualMutation = useMutation({
    mutationFn: async ({ checkinId, motivo }) => {
      const { data, error } = await supabase
        .from('os_checkins')
        .update({
          checkout_at: new Date().toISOString(),
          checkout_manual: true,
          checkout_manual_motivo: motivo
        })
        .eq('id', checkinId)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      toast.success(`Check-out realizado! ${data.horas_trabalhadas?.toFixed(1)}h trabalhadas`)
      queryClient.invalidateQueries(['checkins-em-andamento'])
      queryClient.invalidateQueries(['checkins-do-dia'])
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message)
    }
  })

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Check-ins</h1>
          <p className="text-gray-600">Controle de presença dos colaboradores</p>
        </div>
        <button
          onClick={() => setShowModalUsuario(true)}
          className="btn-primary"
        >
          <UserPlus className="w-5 h-5" />
          Criar Acesso
        </button>
      </div>

      {/* Cards de Métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-200 rounded-xl flex items-center justify-center">
              <Play className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-green-600">Em Andamento</p>
              <p className="text-2xl font-bold text-green-700">{metricas.emAndamento}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-200 rounded-xl flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-blue-600">Finalizados Hoje</p>
              <p className="text-2xl font-bold text-blue-700">{metricas.finalizadosHoje}</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-purple-200 rounded-xl flex items-center justify-center">
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-purple-600">Horas Trabalhadas</p>
              <p className="text-2xl font-bold text-purple-700">{metricas.totalHorasHoje.toFixed(1)}h</p>
            </div>
          </div>
        </div>

        <div className="card bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-orange-200 rounded-xl flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-orange-600">Sem Check-in</p>
              <p className="text-2xl font-bold text-orange-700">{metricas.semCheckin}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {[
            { id: 'tempo-real', label: 'Tempo Real', icon: Play },
            { id: 'historico', label: 'Histórico do Dia', icon: Calendar },
            { id: 'pendentes', label: 'Pendentes', icon: AlertCircle },
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
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
      {abaAtiva === 'tempo-real' && (
        <div className="space-y-4">
          {loadingAndamento ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
          ) : checkinsEmAndamento?.length === 0 ? (
            <div className="card text-center py-12">
              <Users className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">Nenhum colaborador em obra no momento</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {checkinsEmAndamento?.map(checkin => {
                const horasEmObra = checkin.checkin_at
                  ? ((Date.now() - new Date(checkin.checkin_at).getTime()) / 3600000).toFixed(1)
                  : 0

                return (
                  <div key={checkin.id} className="card border-l-4 border-green-500">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                          {checkin.colaborador?.foto_url ? (
                            <img src={checkin.colaborador.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                          ) : (
                            <Users className="w-5 h-5 text-green-600" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-gray-900">{checkin.colaborador?.nome}</p>
                          <p className="text-xs text-gray-500">
                            Entrada: {formatHora(checkin.checkin_at)}
                          </p>
                        </div>
                      </div>
                      <div className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium">
                        {horasEmObra}h
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <p className="text-sm font-medium text-gray-900">{checkin.ordem_servico?.cliente?.nome}</p>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3" />
                        {checkin.ordem_servico?.endereco}, {checkin.ordem_servico?.cidade}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        const motivo = prompt('Motivo do check-out manual:')
                        if (motivo) {
                          checkoutManualMutation.mutate({ checkinId: checkin.id, motivo })
                        }
                      }}
                      className="w-full py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Finalizar Manualmente
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="card">
            <input
              type="date"
              value={dataFiltro}
              onChange={(e) => setDataFiltro(e.target.value)}
              className="input-field w-auto"
            />
          </div>

          <div className="card overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Colaborador</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Cliente/Obra</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Entrada</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Saída</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Horas</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Tipo</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody>
                {checkinsDoDia?.map(checkin => (
                  <tr key={checkin.id} className="border-t">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {checkin.checkin_manual && (
                          <span title="Check-in manual" className="text-orange-500">⚡</span>
                        )}
                        {checkin.colaborador?.nome}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {checkin.ordem_servico?.cliente?.nome}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {formatHora(checkin.checkin_at)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {formatHora(checkin.checkout_at)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm font-medium">
                      {checkin.horas_trabalhadas?.toFixed(1) || '-'}h
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        checkin.tipo_diaria === 'meia' 
                          ? 'bg-yellow-100 text-yellow-700' 
                          : 'bg-green-100 text-green-700'
                      }`}>
                        {checkin.tipo_diaria === 'meia' ? 'Meia' : 'Inteira'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        checkin.status === 'finalizado' ? 'bg-green-100 text-green-700' :
                        checkin.status === 'em_andamento' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {checkin.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {checkinsDoDia?.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum check-in nesta data
              </div>
            )}
          </div>
        </div>
      )}

      {abaAtiva === 'pendentes' && (
        <div className="space-y-4">
          {osSemCheckin?.length === 0 ? (
            <div className="card text-center py-12">
              <CheckCircle className="w-12 h-12 mx-auto text-green-400 mb-4" />
              <p className="text-gray-500">Todos os colaboradores fizeram check-in!</p>
            </div>
          ) : (
            osSemCheckin?.map(os => (
              <div key={os.id} className="card">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{os.cliente?.nome}</p>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {os.endereco}, {os.cidade}
                    </p>
                  </div>
                  <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-medium">
                    {os.colaboradores_sem_checkin.length} pendentes
                  </span>
                </div>

                <div className="space-y-2">
                  {os.colaboradores_sem_checkin.map(oc => (
                    <div key={oc.colaborador_id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{oc.colaborador?.nome}</span>
                      <button
                        onClick={() => {
                          setOsSelecionada(os)
                          setColaboradorSelecionado(oc)
                          setShowModalCheckinManual(true)
                        }}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Check-in Manual
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Modal: Criar Usuário */}
      {showModalUsuario && (
        <div className="modal-overlay">
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h2 className="modal-title">Criar Acesso para Colaborador</h2>
              <button onClick={() => setShowModalUsuario(false)} className="btn-ghost p-2">
                ✕
              </button>
            </div>
            <div className="modal-body">
              {colaboradoresSemUsuario?.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  Todos os colaboradores já têm acesso
                </p>
              ) : (
                <div className="space-y-2">
                  {colaboradoresSemUsuario?.map(colab => (
                    <div key={colab.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{colab.nome}</p>
                        <p className="text-xs text-gray-500">{colab.email || 'Sem email'}</p>
                      </div>
                      <button
                        onClick={() => criarUsuarioMutation.mutate(colab)}
                        disabled={criarUsuarioMutation.isPending}
                        className="btn-primary text-sm"
                      >
                        {criarUsuarioMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Key className="w-4 h-4" />
                        )}
                        Criar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal: Check-in Manual */}
      {showModalCheckinManual && (
        <div className="modal-overlay">
          <div className="modal-content modal-md">
            <div className="modal-header">
              <h2 className="modal-title">Check-in Manual</h2>
              <button onClick={() => setShowModalCheckinManual(false)} className="btn-ghost p-2">
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p className="mb-4">
                Fazer check-in de <strong>{colaboradorSelecionado?.colaborador?.nome}</strong> na obra{' '}
                <strong>{osSelecionada?.cliente?.nome}</strong>?
              </p>
              <div>
                <label className="label">Motivo do check-in manual</label>
                <textarea
                  id="motivo-checkin"
                  className="input-field"
                  rows={3}
                  placeholder="Ex: Colaborador sem celular, problema no app..."
                />
              </div>
            </div>
            <div className="modal-footer">
              <button onClick={() => setShowModalCheckinManual(false)} className="btn-secondary">
                Cancelar
              </button>
              <button
                onClick={() => {
                  const motivo = document.getElementById('motivo-checkin').value
                  if (!motivo) {
                    toast.error('Informe o motivo')
                    return
                  }
                  checkinManualMutation.mutate({
                    osId: osSelecionada.id,
                    colaboradorId: colaboradorSelecionado.colaborador_id,
                    motivo
                  })
                }}
                disabled={checkinManualMutation.isPending}
                className="btn-primary"
              >
                {checkinManualMutation.isPending ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Confirmar Check-in'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardCheckins
