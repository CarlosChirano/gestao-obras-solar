import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  Clock, 
  Loader2, 
  CheckCircle2,
  Camera,
  ClipboardCheck,
  Users,
  Edit,
  Play,
  Pause,
  AlertTriangle,
  XCircle,
  Plus,
  FileText,
  MessageSquare,
  Send,
  ChevronDown,
  ChevronUp,
  History
} from 'lucide-react'
import toast from 'react-hot-toast'

// Configuração dos tipos de histórico
const TIPOS_HISTORICO = {
  criacao: {
    icon: Plus,
    color: 'bg-green-500',
    bgLight: 'bg-green-50',
    textColor: 'text-green-700'
  },
  status: {
    icon: Play,
    color: 'bg-blue-500',
    bgLight: 'bg-blue-50',
    textColor: 'text-blue-700'
  },
  equipe: {
    icon: Users,
    color: 'bg-purple-500',
    bgLight: 'bg-purple-50',
    textColor: 'text-purple-700'
  },
  foto: {
    icon: Camera,
    color: 'bg-orange-500',
    bgLight: 'bg-orange-50',
    textColor: 'text-orange-700'
  },
  checklist: {
    icon: ClipboardCheck,
    color: 'bg-teal-500',
    bgLight: 'bg-teal-50',
    textColor: 'text-teal-700'
  },
  edicao: {
    icon: Edit,
    color: 'bg-gray-500',
    bgLight: 'bg-gray-50',
    textColor: 'text-gray-700'
  },
  comentario: {
    icon: MessageSquare,
    color: 'bg-indigo-500',
    bgLight: 'bg-indigo-50',
    textColor: 'text-indigo-700'
  }
}

// Ícones especiais para status específicos
const STATUS_ICONS = {
  'Agendada': Clock,
  'Confirmada': CheckCircle2,
  'Em Execução': Play,
  'Pausada': Pause,
  'Concluída': CheckCircle2,
  'Cancelada': XCircle,
  'Com Pendência': AlertTriangle
}

const OSHistorico = ({ ordemServicoId }) => {
  const [showAll, setShowAll] = useState(false)
  const [novoComentario, setNovoComentario] = useState('')
  const [enviandoComentario, setEnviandoComentario] = useState(false)
  
  const queryClient = useQueryClient()

  // Buscar histórico da OS
  const { data: historico, isLoading } = useQuery({
    queryKey: ['os-historico', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_historico')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Adicionar comentário
  const handleAddComentario = async () => {
    if (!novoComentario.trim()) return

    setEnviandoComentario(true)
    try {
      const { error } = await supabase
        .from('os_historico')
        .insert([{
          ordem_servico_id: ordemServicoId,
          tipo: 'comentario',
          titulo: 'Comentário adicionado',
          descricao: novoComentario,
          usuario_nome: 'Usuário' // TODO: pegar usuário logado
        }])
      
      if (error) throw error
      
      setNovoComentario('')
      queryClient.invalidateQueries(['os-historico', ordemServicoId])
      toast.success('Comentário adicionado!')
    } catch (error) {
      toast.error('Erro ao adicionar comentário')
    } finally {
      setEnviandoComentario(false)
    }
  }

  // Formatar data/hora
  const formatDateTime = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `Há ${diffMins} min`
    if (diffHours < 24) return `Há ${diffHours}h`
    if (diffDays < 7) return `Há ${diffDays} dias`
    
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Agrupar por data
  const groupByDate = (items) => {
    const groups = {}
    items?.forEach(item => {
      const date = new Date(item.created_at).toLocaleDateString('pt-BR')
      if (!groups[date]) groups[date] = []
      groups[date].push(item)
    })
    return groups
  }

  // Itens a mostrar
  const displayItems = showAll ? historico : historico?.slice(0, 5)
  const hasMore = historico?.length > 5

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <History className="w-5 h-5 text-gray-500" />
          Histórico
          {historico?.length > 0 && (
            <span className="text-sm font-normal text-gray-500">
              ({historico.length} eventos)
            </span>
          )}
        </h3>
      </div>

      {/* Adicionar Comentário */}
      <div className="flex gap-2">
        <input
          type="text"
          value={novoComentario}
          onChange={(e) => setNovoComentario(e.target.value)}
          placeholder="Adicionar comentário ou anotação..."
          className="input-field flex-1"
          onKeyPress={(e) => e.key === 'Enter' && handleAddComentario()}
        />
        <button
          onClick={handleAddComentario}
          disabled={enviandoComentario || !novoComentario.trim()}
          className="btn-primary"
        >
          {enviandoComentario ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </div>

      {/* Timeline */}
      {!historico || historico.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-xl">
          <Clock className="w-10 h-10 mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500">Nenhum evento registrado</p>
        </div>
      ) : (
        <div className="relative">
          {/* Linha vertical */}
          <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-gray-200" />

          {/* Eventos */}
          <div className="space-y-4">
            {displayItems?.map((evento, index) => {
              const config = TIPOS_HISTORICO[evento.tipo] || TIPOS_HISTORICO.edicao
              const Icon = evento.tipo === 'status' && evento.dados_novos?.status
                ? (STATUS_ICONS[evento.dados_novos.status] || config.icon)
                : config.icon

              return (
                <div key={evento.id} className="relative flex gap-4">
                  {/* Ícone */}
                  <div className={`relative z-10 w-10 h-10 rounded-full ${config.color} flex items-center justify-center shadow-sm`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>

                  {/* Conteúdo */}
                  <div className={`flex-1 ${config.bgLight} rounded-xl p-4 shadow-sm`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className={`font-medium ${config.textColor}`}>
                          {evento.titulo}
                        </p>
                        {evento.descricao && (
                          <p className="text-sm text-gray-600 mt-1">
                            {evento.descricao}
                          </p>
                        )}
                        
                        {/* Preview de foto */}
                        {evento.tipo === 'foto' && evento.dados_novos?.url && (
                          <div className="mt-2">
                            <img 
                              src={evento.dados_novos.url} 
                              alt="Foto" 
                              className="w-20 h-20 object-cover rounded-lg"
                            />
                          </div>
                        )}

                        {/* Badge de status */}
                        {evento.tipo === 'status' && evento.dados_novos?.status && (
                          <div className="mt-2">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(evento.dados_novos.status)}`}>
                              {evento.dados_novos.status}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-gray-500 whitespace-nowrap">
                          {formatDateTime(evento.created_at)}
                        </p>
                        {evento.usuario_nome && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            por {evento.usuario_nome}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botão Ver Mais */}
          {hasMore && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setShowAll(!showAll)}
                className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium text-sm"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-4 h-4" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-4 h-4" />
                    Ver todos ({historico.length - 5} mais)
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Função auxiliar para cor do status
const getStatusColor = (status) => {
  const colors = {
    'Agendada': 'bg-blue-100 text-blue-700',
    'Confirmada': 'bg-indigo-100 text-indigo-700',
    'Em Execução': 'bg-yellow-100 text-yellow-700',
    'Pausada': 'bg-orange-100 text-orange-700',
    'Concluída': 'bg-green-100 text-green-700',
    'Cancelada': 'bg-red-100 text-red-700',
    'Com Pendência': 'bg-amber-100 text-amber-700'
  }
  return colors[status] || 'bg-gray-100 text-gray-700'
}

export default OSHistorico
