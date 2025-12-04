import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  ClipboardCheck, 
  Plus, 
  Check, 
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
  Trash2,
  Camera,
  PenTool,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  Image as ImageIcon
} from 'lucide-react'
import toast from 'react-hot-toast'
import SignaturePad from './SignaturePad'

const OSChecklist = ({ ordemServicoId }) => {
  const [showAddModal, setShowAddModal] = useState(false)
  const [expandedChecklist, setExpandedChecklist] = useState(null)
  
  const queryClient = useQueryClient()

  // Buscar checklists da OS
  const { data: checklists, isLoading } = useQuery({
    queryKey: ['os-checklists', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_checklists')
        .select(`
          *,
          itens:os_checklist_itens(*),
          preenchido:colaboradores(nome)
        `)
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  // Buscar modelos disponíveis
  const { data: modelos } = useQuery({
    queryKey: ['checklist-modelos-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('checklist_modelos')
        .select('*, itens:checklist_modelo_itens(*)')
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  const deleteChecklistMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('os_checklists')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['os-checklists', ordemServicoId])
      toast.success('Checklist removido!')
    }
  })

  const handleDeleteChecklist = (id) => {
    if (confirm('Deseja remover este checklist?')) {
      deleteChecklistMutation.mutate(id)
    }
  }

  const calcularProgresso = (itens) => {
    if (!itens || itens.length === 0) return 0
    const respondidos = itens.filter(i => i.respondido).length
    return Math.round((respondidos / itens.length) * 100)
  }

  const getCategoriaLabel = (categoria) => {
    const categorias = {
      seguranca: 'Segurança',
      verificacao: 'Verificação',
      instalacao: 'Instalação',
      testes: 'Testes',
      finalizacao: 'Finalização',
      documentacao: 'Documentação',
      geral: 'Geral'
    }
    return categorias[categoria] || categoria || 'Geral'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Checklists</h3>
        <button onClick={() => setShowAddModal(true)} className="btn-secondary btn-sm">
          <Plus className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {checklists?.length === 0 ? (
        <div className="text-center py-10 bg-gray-50 rounded-xl">
          <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhum checklist adicionado</p>
          <button onClick={() => setShowAddModal(true)} className="btn-primary btn-sm">
            <Plus className="w-4 h-4" /> Adicionar Checklist
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {checklists?.map((checklist) => {
            const isExpanded = expandedChecklist === checklist.id
            const progresso = calcularProgresso(checklist.itens)
            const itensOrdenados = checklist.itens?.sort((a, b) => a.ordem - b.ordem) || []
            const obrigatoriosNaoRespondidos = itensOrdenados.filter(i => i.obrigatorio && !i.respondido).length

            return (
              <div key={checklist.id} className="card card-compact">
                {/* Header */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedChecklist(isExpanded ? null : checklist.id)}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      progresso === 100 ? 'bg-green-100' : 'bg-blue-100'
                    }`}>
                      {progresso === 100 ? (
                        <CheckCircle2 className="w-5 h-5 text-green-600" />
                      ) : (
                        <ClipboardCheck className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{checklist.nome || 'Checklist'}</h4>
                      <p className="text-xs text-gray-500">
                        {itensOrdenados.filter(i => i.respondido).length}/{itensOrdenados.length} respondidas
                        {obrigatoriosNaoRespondidos > 0 && (
                          <span className="text-orange-600 ml-2">
                            • {obrigatoriosNaoRespondidos} obrigatórias pendentes
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    {/* Barra de progresso */}
                    <div className="w-20 hidden sm:block">
                      <div className="progress-bar">
                        <div 
                          className={`progress-bar-fill ${progresso === 100 ? 'success' : ''}`}
                          style={{ width: `${progresso}%` }}
                        />
                      </div>
                    </div>
                    <span className={`text-sm font-semibold ${
                      progresso === 100 ? 'text-green-600' : 'text-gray-600'
                    }`}>
                      {progresso}%
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Itens expandidos */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                    {itensOrdenados.map((item) => (
                      <ChecklistItemResposta
                        key={item.id}
                        item={item}
                        onUpdate={() => queryClient.invalidateQueries(['os-checklists', ordemServicoId])}
                      />
                    ))}

                    <div className="flex justify-end pt-3 border-t border-gray-100">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteChecklist(checklist.id)
                        }}
                        className="btn-ghost btn-sm text-danger"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remover Checklist
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal para adicionar checklist */}
      {showAddModal && (
        <AddChecklistModal
          ordemServicoId={ordemServicoId}
          modelos={modelos}
          onClose={() => setShowAddModal(false)}
          onSave={() => {
            queryClient.invalidateQueries(['os-checklists', ordemServicoId])
            setShowAddModal(false)
          }}
        />
      )}
    </div>
  )
}

// Componente para responder cada item
const ChecklistItemResposta = ({ item, onUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [showSignatureModal, setShowSignatureModal] = useState(false)
  const fileInputRef = useRef(null)

  const updateResposta = async (updates) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('os_checklist_itens')
        .update({
          ...updates,
          respondido: true
        })
        .eq('id', item.id)
      
      if (error) throw error
      onUpdate()
    } catch (error) {
      toast.error('Erro ao salvar resposta')
    } finally {
      setLoading(false)
    }
  }

  const handleCheckbox = () => {
    updateResposta({ 
      resposta_checkbox: !item.resposta_checkbox,
      respondido: !item.resposta_checkbox // Só marca como respondido se marcar checkbox
    })
  }

  const handleTexto = (valor) => {
    updateResposta({ resposta_texto: valor })
  }

  const handleNumero = (valor) => {
    updateResposta({ resposta_numero: parseFloat(valor) || null })
  }

  const handleSelecao = (valor) => {
    updateResposta({ resposta_selecao: valor })
  }

  const handleAssinatura = async (blob, dataUrl, nome, cpf) => {
    setLoading(true)
    try {
      const fileName = `checklist-assinatura/${item.id}/${Date.now()}.png`
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, blob, { contentType: 'image/png' })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      // Salvar URL e dados do assinante
      await updateResposta({ 
        resposta_assinatura_url: urlData.publicUrl,
        resposta_texto: `${nome} | CPF: ${cpf}` // Armazena nome e CPF
      })
      setShowSignatureModal(false)
      toast.success('Assinatura salva!')
    } catch (error) {
      toast.error('Erro ao salvar assinatura')
    } finally {
      setLoading(false)
    }
  }

  const handleFoto = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setLoading(true)
    try {
      // Upload para Supabase Storage
      const fileName = `checklist/${item.id}/${Date.now()}-${file.name}`
      const { data, error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // Pegar URL pública
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(fileName)

      await updateResposta({ resposta_foto_url: urlData.publicUrl })
      toast.success('Foto enviada!')
    } catch (error) {
      toast.error('Erro ao enviar foto')
    } finally {
      setLoading(false)
    }
  }

  const renderInput = () => {
    switch (item.tipo_resposta) {
      case 'checkbox':
        return (
          <button
            onClick={handleCheckbox}
            disabled={loading}
            className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
              item.resposta_checkbox
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-blue-500'
            }`}
          >
            {item.resposta_checkbox && <Check className="w-4 h-4 text-white" />}
          </button>
        )

      case 'texto':
        return (
          <input
            type="text"
            value={item.resposta_texto || ''}
            onChange={(e) => handleTexto(e.target.value)}
            onBlur={() => item.resposta_texto && updateResposta({ resposta_texto: item.resposta_texto })}
            className="input-field input-sm"
            placeholder={item.config?.placeholder || 'Digite sua resposta...'}
          />
        )

      case 'numero':
      case 'monetario':
        return (
          <input
            type="number"
            value={item.resposta_numero || ''}
            onChange={(e) => handleNumero(e.target.value)}
            className="input-field input-sm w-32"
            placeholder={item.config?.placeholder || '0'}
            step={item.tipo_resposta === 'monetario' ? '0.01' : '1'}
          />
        )

      case 'data':
        return (
          <input
            type="date"
            value={item.resposta_data || ''}
            onChange={(e) => updateResposta({ resposta_data: e.target.value })}
            className="input-field input-sm w-40"
          />
        )

      case 'hora':
        return (
          <input
            type="time"
            value={item.resposta_hora || ''}
            onChange={(e) => updateResposta({ resposta_hora: e.target.value })}
            className="input-field input-sm w-32"
          />
        )

      case 'selecao_unica':
        return (
          <select
            value={item.resposta_selecao || ''}
            onChange={(e) => handleSelecao(e.target.value)}
            className="input-field input-sm"
          >
            <option value="">Selecione...</option>
            {(item.opcoes || []).map((opcao, idx) => (
              <option key={idx} value={opcao}>{opcao}</option>
            ))}
          </select>
        )

      case 'foto':
        return (
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFoto}
              className="hidden"
            />
            {item.resposta_foto_url ? (
              <div className="flex items-center gap-2">
                <img 
                  src={item.resposta_foto_url} 
                  alt="Foto" 
                  className="w-12 h-12 rounded-lg object-cover"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-secondary btn-sm"
                >
                  Trocar
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="btn-secondary btn-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                Tirar Foto
              </button>
            )}
          </div>
        )

      case 'assinatura':
        // Extrair nome e CPF do resposta_texto se existir
        const assinanteInfo = item.resposta_texto?.split(' | CPF: ')
        const assinanteNome = assinanteInfo?.[0] || ''
        const assinanteCPF = assinanteInfo?.[1] || ''
        
        return (
          <div className="flex flex-col gap-2">
            {item.resposta_assinatura_url ? (
              <div className="space-y-2">
                {/* Info do assinante */}
                {assinanteNome && (
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">{assinanteNome}</span>
                    {assinanteCPF && (
                      <span className="text-gray-500 ml-2">
                        CPF: {assinanteCPF.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '$1.***.***-$4')}
                      </span>
                    )}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <img 
                    src={item.resposta_assinatura_url} 
                    alt="Assinatura" 
                    className="h-12 bg-white border rounded-lg px-2"
                  />
                  <span className="badge badge-success">Assinado</span>
                  <button 
                    onClick={() => setShowSignatureModal(true)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Refazer
                  </button>
                </div>
              </div>
            ) : (
              <button 
                onClick={() => setShowSignatureModal(true)}
                className="btn-secondary btn-sm"
                disabled={loading}
              >
                <PenTool className="w-4 h-4" />
                Assinar
              </button>
            )}
          </div>
        )

      default:
        return null
    }
  }

  return (
    <>
    <div className={`p-3 rounded-xl transition-colors ${
      item.respondido ? 'bg-green-50' : 'bg-gray-50'
    }`}>
      <div className="flex items-start gap-3">
        {/* Checkbox ou indicador */}
        {item.tipo_resposta === 'checkbox' && (
          <div className="pt-0.5">
            {renderInput()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium ${
            item.respondido ? 'text-gray-600' : 'text-gray-900'
          }`}>
            {item.pergunta}
            {item.obrigatorio && !item.respondido && (
              <span className="text-red-500 ml-1">*</span>
            )}
          </p>
          
          {item.descricao && (
            <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
          )}

          {/* Input de resposta (exceto checkbox) */}
          {item.tipo_resposta !== 'checkbox' && (
            <div className="mt-2">
              {renderInput()}
            </div>
          )}
        </div>

        {/* Indicador de respondido */}
        {item.respondido && item.tipo_resposta !== 'checkbox' && (
          <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
        )}

        {loading && (
          <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
        )}
      </div>
    </div>

    {/* Modal de Assinatura */}
    {showSignatureModal && (
      <SignaturePad
        title={item.pergunta || 'Assinatura'}
        subtitle="Assine no campo abaixo"
        onSave={handleAssinatura}
        onClose={() => setShowSignatureModal(false)}
      />
    )}
    </>
  )
}

// Modal para adicionar checklist
const AddChecklistModal = ({ ordemServicoId, modelos, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [selectedModelo, setSelectedModelo] = useState('')
  const [nome, setNome] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!selectedModelo) {
      toast.error('Selecione um modelo')
      return
    }

    setLoading(true)

    try {
      const modelo = modelos?.find(m => m.id === selectedModelo)
      
      // Criar checklist
      const { data: checklist, error } = await supabase
        .from('os_checklists')
        .insert([{
          ordem_servico_id: ordemServicoId,
          checklist_modelo_id: selectedModelo,
          nome: nome || modelo?.nome || 'Checklist',
          tipo: modelo?.tipo || 'execucao'
        }])
        .select()
        .single()

      if (error) throw error

      // Copiar itens do modelo
      const itensModelo = modelo?.itens?.filter(i => i.ativo !== false).sort((a, b) => a.ordem - b.ordem) || []
      
      if (itensModelo.length > 0) {
        const itensData = itensModelo.map((item, idx) => ({
          os_checklist_id: checklist.id,
          pergunta: item.pergunta,
          descricao: item.descricao,
          tipo_resposta: item.tipo_resposta,
          obrigatorio: item.obrigatorio,
          opcoes: item.opcoes,
          categoria: item.categoria,
          ordem: idx + 1,
          respondido: false
        }))

        await supabase.from('os_checklist_itens').insert(itensData)
      }

      toast.success('Checklist adicionado!')
      onSave()
    } catch (error) {
      toast.error('Erro ao adicionar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const modeloSelecionado = modelos?.find(m => m.id === selectedModelo)
  const itensModelo = modeloSelecionado?.itens?.filter(i => i.ativo !== false) || []

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">Adicionar Checklist</h2>
          <button onClick={onClose} className="btn-ghost ">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div>
            <label className="label">Modelo de Checklist *</label>
            <select
              value={selectedModelo}
              onChange={(e) => {
                setSelectedModelo(e.target.value)
                const modelo = modelos?.find(m => m.id === e.target.value)
                if (modelo) setNome(modelo.nome)
              }}
              className="input-field"
              required
            >
              <option value="">Selecione um modelo...</option>
              {modelos?.map(m => (
                <option key={m.id} value={m.id}>
                  {m.nome} ({m.itens?.filter(i => i.ativo !== false).length || 0} perguntas)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label">Nome (opcional)</label>
            <input
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input-field"
              placeholder="Nome personalizado do checklist"
            />
          </div>

          {selectedModelo && (
            <div className="p-4 bg-blue-50 rounded-xl">
              <div className="flex items-center gap-2 text-blue-700 mb-2">
                <ClipboardCheck className="w-5 h-5" />
                <span className="font-medium">{itensModelo.length} perguntas</span>
              </div>
              <p className="text-sm text-blue-600">
                {itensModelo.filter(i => i.obrigatorio).length} obrigatórias
                {itensModelo.filter(i => i.tipo_resposta === 'foto').length > 0 && (
                  <span> • {itensModelo.filter(i => i.tipo_resposta === 'foto').length} fotos</span>
                )}
                {itensModelo.filter(i => i.tipo_resposta === 'assinatura').length > 0 && (
                  <span> • {itensModelo.filter(i => i.tipo_resposta === 'assinatura').length} assinaturas</span>
                )}
              </p>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
            Adicionar
          </button>
        </div>
      </div>
    </div>
  )
}

export default OSChecklist
