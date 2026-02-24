import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ClipboardCheck, Search, Filter, FileText, Download, Eye, 
  ChevronDown, ChevronRight, Calendar, Building2, Loader2,
  CheckCircle2, AlertCircle, User
} from 'lucide-react'
import toast from 'react-hot-toast'
import { gerarRelatorioChecklist } from '../../utils/gerarRelatorioHTML'

const RelatoriosChecklist = () => {
  const [filtroCliente, setFiltroCliente] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroPeriodo, setFiltroPeriodo] = useState({ inicio: '', fim: '' })
  const [expandedOS, setExpandedOS] = useState(null)
  const [gerandoPDF, setGerandoPDF] = useState(null)

  // Buscar todos os checklists com dados relacionados
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['relatorios-checklists'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_checklists')
        .select(`
          id, nome, tipo, concluido, observacoes, data_preenchimento,
          created_at, updated_at,
          preenchido:colaboradores(id, nome),
          ordem_servico:ordens_servico(
            id, numero_os, data_agendamento, endereco, cidade, status,
            cliente:clientes(id, nome)
          ),
          itens:os_checklist_itens(
            id, pergunta, descricao, tipo_resposta, obrigatorio,
            resposta_texto, resposta_numero, resposta_checkbox,
            resposta_foto_url, resposta_assinatura_url, resposta_data,
            resposta_hora, resposta_selecao, resposta_selecao_multipla,
            respondido, opcoes, categoria, ordem
          )
        `)
        .order('created_at', { ascending: false })

      if (error) throw error
      return data || []
    }
  })

  // Buscar lista de clientes para o filtro
  const { data: clientes } = useQuery({
    queryKey: ['clientes-filtro'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      return data || []
    }
  })

  // Filtrar checklists
  const checklistsFiltrados = useMemo(() => {
    if (!checklists) return []
    
    return checklists.filter(cl => {
      // Filtro por cliente
      if (filtroCliente) {
        const clienteNome = cl.ordem_servico?.cliente?.nome || ''
        if (!clienteNome.toLowerCase().includes(filtroCliente.toLowerCase())) return false
      }
      
      // Filtro por tipo
      if (filtroTipo && cl.tipo !== filtroTipo) return false
      
      // Filtro por período
      if (filtroPeriodo.inicio) {
        const dataOS = cl.ordem_servico?.data_agendamento || cl.created_at?.substring(0, 10)
        if (dataOS < filtroPeriodo.inicio) return false
      }
      if (filtroPeriodo.fim) {
        const dataOS = cl.ordem_servico?.data_agendamento || cl.created_at?.substring(0, 10)
        if (dataOS > filtroPeriodo.fim) return false
      }
      
      return true
    })
  }, [checklists, filtroCliente, filtroTipo, filtroPeriodo])

  // Agrupar por OS
  const osPorChecklist = useMemo(() => {
    const grupos = {}
    checklistsFiltrados.forEach(cl => {
      const osId = cl.ordem_servico?.id || 'sem-os'
      if (!grupos[osId]) {
        grupos[osId] = {
          os: cl.ordem_servico,
          checklists: []
        }
      }
      grupos[osId].checklists.push(cl)
    })
    return Object.values(grupos)
  }, [checklistsFiltrados])

  // Tipos únicos para filtro
  const tiposUnicos = useMemo(() => {
    if (!checklists) return []
    return [...new Set(checklists.map(cl => cl.tipo).filter(Boolean))]
  }, [checklists])

  const handleGerarPDF = async (checklist) => {
    setGerandoPDF(checklist.id)
    try {
      await gerarRelatorioChecklist({
        checklist,
        ordemServico: checklist.ordem_servico,
        cliente: checklist.ordem_servico?.cliente,
        colaborador: checklist.preenchido?.nome
      })
      toast.success('Relatório aberto em nova aba!')
    } catch (err) {
      toast.error('Erro ao gerar relatório: ' + err.message)
    } finally {
      setGerandoPDF(null)
    }
  }

  const getProgresso = (cl) => {
    const total = cl.itens?.length || 0
    const respondidos = cl.itens?.filter(i => i.respondido).length || 0
    return total > 0 ? Math.round((respondidos / total) * 100) : 0
  }

  const getTipoLabel = (tipo) => {
    const labels = {
      'verificacao': 'Verificação',
      'execucao': 'Execução',
      'diario_inicio': 'Diário Início',
      'diario_fim': 'Diário Fim',
      'avulso': 'Avulso'
    }
    return labels[tipo] || tipo || '-'
  }

  const getTipoCor = (tipo) => {
    const cores = {
      'verificacao': 'bg-purple-100 text-purple-700',
      'execucao': 'bg-blue-100 text-blue-700',
      'diario_inicio': 'bg-green-100 text-green-700',
      'diario_fim': 'bg-orange-100 text-orange-700',
      'avulso': 'bg-gray-100 text-gray-700'
    }
    return cores[tipo] || 'bg-gray-100 text-gray-700'
  }

  // Stats
  const totalChecklists = checklistsFiltrados.length
  const concluidos = checklistsFiltrados.filter(cl => getProgresso(cl) === 100).length
  const emAndamento = totalChecklists - concluidos

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardCheck className="w-7 h-7 text-green-600" />
            Relatórios de Checklists
          </h1>
          <p className="text-gray-500 mt-1">Visualize e exporte relatórios de checklists preenchidos</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Total de Checklists</p>
          <p className="text-2xl font-bold text-gray-900">{totalChecklists}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Concluídos (100%)</p>
          <p className="text-2xl font-bold text-green-600">{concluidos}</p>
        </div>
        <div className="bg-white rounded-xl p-4 shadow-sm border">
          <p className="text-sm text-gray-500">Em Andamento</p>
          <p className="text-2xl font-bold text-yellow-600">{emAndamento}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl p-4 shadow-sm border">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por cliente..."
              value={filtroCliente}
              onChange={(e) => setFiltroCliente(e.target.value)}
              className="input-field pl-9 text-sm"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="input-field text-sm"
          >
            <option value="">Todos os tipos</option>
            {tiposUnicos.map(tipo => (
              <option key={tipo} value={tipo}>{getTipoLabel(tipo)}</option>
            ))}
          </select>
          <input
            type="date"
            value={filtroPeriodo.inicio}
            onChange={(e) => setFiltroPeriodo(p => ({ ...p, inicio: e.target.value }))}
            className="input-field text-sm"
            placeholder="Data início"
          />
          <input
            type="date"
            value={filtroPeriodo.fim}
            onChange={(e) => setFiltroPeriodo(p => ({ ...p, fim: e.target.value }))}
            className="input-field text-sm"
            placeholder="Data fim"
          />
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : osPorChecklist.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center shadow-sm border">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum checklist encontrado</p>
        </div>
      ) : (
        <div className="space-y-3">
          {osPorChecklist.map(({ os, checklists: cls }) => {
            const isExpanded = expandedOS === os?.id
            
            return (
              <div key={os?.id || 'sem'} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {/* Header da OS */}
                <button
                  onClick={() => setExpandedOS(isExpanded ? null : os?.id)}
                  className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-sm bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
                          {os?.numero_os || '-'}
                        </span>
                        <span className="font-semibold text-gray-900">
                          {os?.cliente?.nome || 'Sem cliente'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {os?.endereco}{os?.cidade ? `, ${os.cidade}` : ''} 
                        {os?.data_agendamento && ` • ${new Date(os.data_agendamento + 'T12:00:00').toLocaleDateString('pt-BR')}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-500">{cls.length} checklist{cls.length > 1 ? 's' : ''}</span>
                    <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                  </div>
                </button>

                {/* Checklists da OS */}
                {isExpanded && (
                  <div className="border-t divide-y">
                    {cls.map(cl => {
                      const progresso = getProgresso(cl)
                      const totalItens = cl.itens?.length || 0
                      const respondidos = cl.itens?.filter(i => i.respondido).length || 0
                      const fotos = cl.itens?.filter(i => i.tipo_resposta === 'foto' && i.resposta_foto_url).length || 0

                      return (
                        <div key={cl.id} className="px-5 py-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className={`w-2 h-2 rounded-full ${progresso === 100 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-gray-900">{cl.nome}</p>
                                  <span className={`text-xs px-2 py-0.5 rounded-full ${getTipoCor(cl.tipo)}`}>
                                    {getTipoLabel(cl.tipo)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                                  <span>{respondidos}/{totalItens} itens</span>
                                  {fotos > 0 && <span>📷 {fotos} fotos</span>}
                                  {cl.preenchido?.nome && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3" />
                                      {cl.preenchido.nome}
                                    </span>
                                  )}
                                  {cl.data_preenchimento && (
                                    <span>
                                      {new Date(cl.data_preenchimento).toLocaleDateString('pt-BR')}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              {/* Barra de progresso */}
                              <div className="flex items-center gap-2">
                                <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className={`h-full rounded-full transition-all ${progresso === 100 ? 'bg-green-500' : 'bg-blue-500'}`} 
                                    style={{ width: `${progresso}%` }}
                                  />
                                </div>
                                <span className={`text-sm font-medium ${progresso === 100 ? 'text-green-600' : 'text-blue-600'}`}>
                                  {progresso}%
                                </span>
                              </div>

                              {/* Botão PDF */}
                              <button
                                onClick={() => handleGerarPDF(cl)}
                                disabled={gerandoPDF === cl.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                {gerandoPDF === cl.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                                Ver Relatório
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
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

export default RelatoriosChecklist
