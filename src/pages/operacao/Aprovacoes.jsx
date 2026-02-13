import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { 
  ShieldCheck, Clock, CheckCircle, XCircle, Loader2, 
  Trash2, Edit, Eye, AlertTriangle, ChevronDown,
  ChevronUp, User, FileText
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

const Aprovacoes = () => {
  const { user, userProfile, isSuperAdmin } = useAuth()
  const queryClient = useQueryClient()
  const [filtroStatus, setFiltroStatus] = useState('pendente')
  const [expandedId, setExpandedId] = useState(null)
  const [motivoRejeicao, setMotivoRejeicao] = useState('')
  const [rejectingId, setRejectingId] = useState(null)

  const usuarioNome = userProfile?.nome || user?.email || 'Usuário'
  const usuarioId = user?.id || null

  // Buscar aprovações
  const { data: aprovacoes, isLoading } = useQuery({
    queryKey: ['aprovacoes', filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('os_aprovacoes')
        .select('*')
        .order('created_at', { ascending: false })

      if (filtroStatus !== 'todas') {
        query = query.eq('status', filtroStatus)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  // Contadores
  const { data: contadores } = useQuery({
    queryKey: ['aprovacoes-contadores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_aprovacoes')
        .select('status')
      if (error) throw error
      return {
        pendente: data.filter(a => a.status === 'pendente').length,
        aprovada: data.filter(a => a.status === 'aprovada').length,
        rejeitada: data.filter(a => a.status === 'rejeitada').length,
        total: data.length
      }
    }
  })

  // Aprovar solicitação
  const aprovarMutation = useMutation({
    mutationFn: async (aprovacao) => {
      // 1. Atualizar status da aprovação
      const { error: errAprov } = await supabase
        .from('os_aprovacoes')
        .update({
          status: 'aprovada',
          aprovador_id: usuarioId,
          aprovador_nome: usuarioNome,
          aprovado_em: new Date().toISOString()
        })
        .eq('id', aprovacao.id)
      if (errAprov) throw errAprov

      // 2. Executar a ação
      if (aprovacao.tipo === 'exclusao') {
        const { error } = await supabase
          .from('ordens_servico')
          .update({ 
            deletado: true,
            atualizado_por: usuarioId,
            atualizado_por_nome: `Excluída por aprovação (${usuarioNome})`,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', aprovacao.ordem_servico_id)
        if (error) throw error

        // Registrar no histórico
        await supabase.from('os_historico').insert({
          ordem_servico_id: aprovacao.ordem_servico_id,
          tipo: 'status',
          titulo: `OS excluída - Aprovado por ${usuarioNome}`,
          descricao: `Solicitado por: ${aprovacao.solicitante_nome}\nMotivo: ${aprovacao.motivo || 'Não informado'}`,
          usuario_nome: usuarioNome,
          usuario_id: usuarioId
        }).catch(() => {})

      } else if (aprovacao.tipo === 'edicao') {
        if (aprovacao.dados_alteracao) {
          const { error } = await supabase
            .from('ordens_servico')
            .update({
              ...aprovacao.dados_alteracao,
              atualizado_por: usuarioId,
              atualizado_por_nome: `Editado por aprovação (${usuarioNome})`,
              atualizado_em: new Date().toISOString()
            })
            .eq('id', aprovacao.ordem_servico_id)
          if (error) throw error

          await supabase.from('os_historico').insert({
            ordem_servico_id: aprovacao.ordem_servico_id,
            tipo: 'edicao',
            titulo: `Edição aprovada por ${usuarioNome}`,
            descricao: `Solicitado por: ${aprovacao.solicitante_nome}\nCampos: ${Object.keys(aprovacao.dados_alteracao).join(', ')}`,
            usuario_nome: usuarioNome,
            usuario_id: usuarioId
          }).catch(() => {})
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aprovacoes'])
      queryClient.invalidateQueries(['aprovacoes-contadores'])
      queryClient.invalidateQueries(['ordens-servico'])
      toast.success('Solicitação aprovada e executada!')
    },
    onError: (err) => toast.error('Erro ao aprovar: ' + err.message)
  })

  // Rejeitar solicitação
  const rejeitarMutation = useMutation({
    mutationFn: async ({ id, motivo }) => {
      const { error } = await supabase
        .from('os_aprovacoes')
        .update({
          status: 'rejeitada',
          aprovador_id: usuarioId,
          aprovador_nome: usuarioNome,
          aprovado_em: new Date().toISOString(),
          motivo_rejeicao: motivo || 'Sem justificativa'
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['aprovacoes'])
      queryClient.invalidateQueries(['aprovacoes-contadores'])
      toast.success('Solicitação rejeitada')
      setRejectingId(null)
      setMotivoRejeicao('')
    },
    onError: (err) => toast.error('Erro ao rejeitar: ' + err.message)
  })

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
  }

  const tipoConfig = {
    exclusao: { label: 'Exclusão', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
    edicao: { label: 'Edição', icon: Edit, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' }
  }

  const statusConfig = {
    pendente: { label: 'Pendente', icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    aprovada: { label: 'Aprovada', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    rejeitada: { label: 'Rejeitada', icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldCheck className="w-7 h-7 text-blue-600" />
          Aprovações
        </h1>
        <p className="text-gray-600 mt-1">
          {isSuperAdmin 
            ? 'Gerencie solicitações de edição e exclusão de OS' 
            : 'Acompanhe suas solicitações de edição e exclusão'}
        </p>
      </div>

      {/* Cards de contadores */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { key: 'pendente', icon: Clock, iconColor: 'text-amber-500', borderActive: 'border-amber-400', bgActive: 'bg-amber-50' },
          { key: 'aprovada', icon: CheckCircle, iconColor: 'text-green-500', borderActive: 'border-green-400', bgActive: 'bg-green-50' },
          { key: 'rejeitada', icon: XCircle, iconColor: 'text-red-500', borderActive: 'border-red-400', bgActive: 'bg-red-50' },
          { key: 'todas', icon: FileText, iconColor: 'text-blue-500', borderActive: 'border-blue-400', bgActive: 'bg-blue-50', countKey: 'total' },
        ].map(({ key, icon: Icon, iconColor, borderActive, bgActive, countKey }) => (
          <button
            key={key}
            onClick={() => setFiltroStatus(key)}
            className={`p-4 rounded-xl border-2 transition-all ${
              filtroStatus === key ? `${borderActive} ${bgActive}` : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <Icon className={`w-5 h-5 ${iconColor}`} />
              <span className="text-2xl font-bold text-gray-900">{contadores?.[countKey || key] || 0}</span>
            </div>
            <p className="text-sm text-gray-600 mt-1 capitalize">{key === 'todas' ? 'Todas' : key + 's'}</p>
          </button>
        ))}
      </div>

      {/* Lista */}
      {!aprovacoes || aprovacoes.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border">
          <ShieldCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 text-lg">Nenhuma solicitação {filtroStatus !== 'todas' ? filtroStatus : ''}</p>
          <p className="text-gray-400 text-sm mt-1">As solicitações de edição e exclusão aparecerão aqui</p>
        </div>
      ) : (
        <div className="space-y-3">
          {aprovacoes.map((aprov) => {
            const tipo = tipoConfig[aprov.tipo] || tipoConfig.edicao
            const status = statusConfig[aprov.status] || statusConfig.pendente
            const TipoIcon = tipo.icon
            const StatusIcon = status.icon
            const isExpanded = expandedId === aprov.id

            return (
              <div key={aprov.id} className={`bg-white rounded-xl border-2 ${aprov.status === 'pendente' ? tipo.border : 'border-gray-200'} overflow-hidden`}>
                {/* Header */}
                <div 
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : aprov.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${tipo.bg}`}>
                        <TipoIcon className={`w-5 h-5 ${tipo.color}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-gray-900">
                            {tipo.label} - {aprov.numero_os || 'OS'}
                          </span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.bg} ${status.color}`}>
                            <StatusIcon className="w-3 h-3" />
                            {status.label}
                          </span>
                        </div>
                        <p className="text-sm text-gray-500">{aprov.cliente_nome || 'Cliente não informado'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Solicitado por</p>
                        <p className="text-sm font-medium text-gray-700">{aprov.solicitante_nome}</p>
                        <p className="text-xs text-gray-400">{formatDate(aprov.created_at)}</p>
                      </div>
                      {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                    </div>
                  </div>
                </div>

                {/* Expandido */}
                {isExpanded && (
                  <div className="border-t px-4 pb-4 pt-3 space-y-4">
                    <div className="sm:hidden flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      <span>{aprov.solicitante_nome} • {formatDate(aprov.created_at)}</span>
                    </div>

                    {aprov.motivo && (
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-gray-500 mb-1">Motivo da solicitação</p>
                        <p className="text-sm text-gray-700">{aprov.motivo}</p>
                      </div>
                    )}

                    {aprov.tipo === 'edicao' && aprov.dados_alteracao && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <p className="text-xs font-medium text-blue-600 mb-2">Alterações solicitadas</p>
                        <div className="space-y-1">
                          {Object.entries(aprov.dados_alteracao).map(([campo, valor]) => (
                            <div key={campo} className="flex items-center gap-2 text-sm">
                              <span className="font-medium text-gray-600">{campo}:</span>
                              <span className="text-gray-900">{String(valor)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {aprov.status !== 'pendente' && (
                      <div className={`rounded-lg p-3 ${aprov.status === 'aprovada' ? 'bg-green-50' : 'bg-red-50'}`}>
                        <p className={`text-xs font-medium mb-1 ${aprov.status === 'aprovada' ? 'text-green-600' : 'text-red-600'}`}>
                          {aprov.status === 'aprovada' ? 'Aprovado' : 'Rejeitado'} por {aprov.aprovador_nome}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(aprov.aprovado_em)}</p>
                        {aprov.motivo_rejeicao && (
                          <p className="text-sm text-gray-700 mt-1">Motivo: {aprov.motivo_rejeicao}</p>
                        )}
                      </div>
                    )}

                    <Link 
                      to={`/ordens-servico/${aprov.ordem_servico_id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" /> Ver OS completa
                    </Link>

                    {/* Ações superadmin */}
                    {isSuperAdmin && aprov.status === 'pendente' && (
                      <div className="border-t pt-3 space-y-3">
                        {rejectingId === aprov.id ? (
                          <div className="space-y-2">
                            <input
                              type="text"
                              value={motivoRejeicao}
                              onChange={(e) => setMotivoRejeicao(e.target.value)}
                              placeholder="Motivo da rejeição (opcional)..."
                              className="input-field w-full"
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => rejeitarMutation.mutate({ id: aprov.id, motivo: motivoRejeicao })}
                                disabled={rejeitarMutation.isPending}
                                className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
                              >
                                {rejeitarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                                Confirmar Rejeição
                              </button>
                              <button
                                onClick={() => { setRejectingId(null); setMotivoRejeicao('') }}
                                className="px-4 py-2 rounded-lg border hover:bg-gray-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <button
                              onClick={() => aprovarMutation.mutate(aprov)}
                              disabled={aprovarMutation.isPending}
                              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                            >
                              {aprovarMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              Aprovar
                            </button>
                            <button
                              onClick={() => setRejectingId(aprov.id)}
                              className="flex-1 bg-white text-red-600 border-2 border-red-200 px-4 py-2 rounded-lg hover:bg-red-50 flex items-center justify-center gap-2 font-medium"
                            >
                              <XCircle className="w-4 h-4" />
                              Rejeitar
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {!isSuperAdmin && aprov.status === 'pendente' && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0" />
                        <p className="text-sm text-amber-700">Aguardando aprovação de um superadministrador</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default Aprovacoes
