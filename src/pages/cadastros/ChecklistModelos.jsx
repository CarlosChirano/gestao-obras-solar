import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  ClipboardCheck, 
  Edit,
  Trash2,
  X,
  Save,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Type,
  Hash,
  Calendar,
  Clock,
  CheckSquare,
  List,
  Image,
  PenTool,
  DollarSign,
  Copy,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// Tipos de resposta disponíveis
const TIPOS_RESPOSTA = [
  { value: 'checkbox', label: 'Checkbox', icon: CheckSquare, description: 'Sim/Não' },
  { value: 'texto', label: 'Texto', icon: Type, description: 'Resposta livre' },
  { value: 'numero', label: 'Número', icon: Hash, description: 'Valor numérico' },
  { value: 'monetario', label: 'Monetário', icon: DollarSign, description: 'Valor em R$' },
  { value: 'data', label: 'Data', icon: Calendar, description: 'Selecionar data' },
  { value: 'hora', label: 'Hora', icon: Clock, description: 'Selecionar horário' },
  { value: 'selecao_unica', label: 'Seleção Única', icon: List, description: 'Uma opção' },
  { value: 'selecao_multipla', label: 'Múltipla Escolha', icon: List, description: 'Várias opções' },
  { value: 'foto', label: 'Foto', icon: Image, description: 'Capturar imagem' },
  { value: 'assinatura', label: 'Assinatura', icon: PenTool, description: 'Assinatura digital' },
]

const CATEGORIAS = [
  { value: 'seguranca', label: 'Segurança', color: '#FF3B30' },
  { value: 'verificacao', label: 'Verificação', color: '#007AFF' },
  { value: 'instalacao', label: 'Instalação', color: '#34C759' },
  { value: 'testes', label: 'Testes', color: '#FF9500' },
  { value: 'finalizacao', label: 'Finalização', color: '#AF52DE' },
  { value: 'documentacao', label: 'Documentação', color: '#5856D6' },
  { value: 'geral', label: 'Geral', color: '#8E8E93' },
]

const ChecklistModelos = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingModelo, setEditingModelo] = useState(null)
  const [expandedModelo, setExpandedModelo] = useState(null)
  
  const queryClient = useQueryClient()

  const { data: modelos, isLoading } = useQuery({
    queryKey: ['checklist-modelos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_modelos')
        .select(`
          *,
          itens:checklist_modelo_itens(*)
        `)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const filtered = modelos?.filter(m =>
    m.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.tipo?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('checklist_modelos')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklist-modelos'])
      toast.success('Modelo excluído!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const duplicateMutation = useMutation({
    mutationFn: async (modelo) => {
      // Criar cópia do modelo
      const { data: novoModelo, error: modeloError } = await supabase
        .from('checklist_modelos')
        .insert([{
          nome: `${modelo.nome} (Cópia)`,
          descricao: modelo.descricao,
          tipo: modelo.tipo
        }])
        .select()
        .single()
      
      if (modeloError) throw modeloError

      // Copiar itens
      if (modelo.itens?.length > 0) {
        const novosItens = modelo.itens.map(item => ({
          checklist_modelo_id: novoModelo.id,
          pergunta: item.pergunta,
          descricao: item.descricao,
          tipo_resposta: item.tipo_resposta,
          obrigatorio: item.obrigatorio,
          opcoes: item.opcoes,
          config: item.config,
          categoria: item.categoria,
          ordem: item.ordem
        }))

        const { error: itensError } = await supabase
          .from('checklist_modelo_itens')
          .insert(novosItens)
        
        if (itensError) throw itensError
      }

      return novoModelo
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['checklist-modelos'])
      toast.success('Modelo duplicado!')
    },
    onError: () => toast.error('Erro ao duplicar')
  })

  const handleEdit = (modelo) => {
    setEditingModelo(modelo)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingModelo(null)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Deseja excluir este modelo de checklist?')) {
      deleteMutation.mutate(id)
    }
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      geral: 'Geral',
      instalacao: 'Instalação',
      manutencao: 'Manutenção',
      vistoria: 'Vistoria'
    }
    return tipos[tipo] || tipo
  }

  const getTipoRespostaIcon = (tipo) => {
    const found = TIPOS_RESPOSTA.find(t => t.value === tipo)
    return found?.icon || CheckSquare
  }

  const getCategoriaColor = (categoria) => {
    const found = CATEGORIAS.find(c => c.value === categoria)
    return found?.color || '#8E8E93'
  }

  const getCategoriaLabel = (categoria) => {
    const found = CATEGORIAS.find(c => c.value === categoria)
    return found?.label || categoria || 'Geral'
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modelos de Checklist</h1>
          <p className="text-gray-500 mt-1">Crie formulários personalizados para suas ordens de serviço</p>
        </div>
        <button onClick={handleNew} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Modelo
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar modelos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      {/* Lista de Modelos */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="card empty-state">
            <ClipboardCheck className="empty-state-icon" />
            <h3 className="empty-state-title">Nenhum modelo encontrado</h3>
            <p className="empty-state-description">Crie seu primeiro modelo de checklist para começar</p>
            <button onClick={handleNew} className="btn-primary">
              <Plus className="w-5 h-5" /> Criar Modelo
            </button>
          </div>
        ) : (
          filtered?.map((modelo) => {
            const isExpanded = expandedModelo === modelo.id
            const itensOrdenados = modelo.itens?.filter(i => i.ativo !== false).sort((a, b) => a.ordem - b.ordem) || []
            const obrigatorios = itensOrdenados.filter(i => i.obrigatorio).length

            return (
              <div key={modelo.id} className="card animate-slide-up" style={{ animationDelay: '0.05s' }}>
                <div className="flex items-center justify-between">
                  <div 
                    className="flex items-center gap-4 flex-1 cursor-pointer"
                    onClick={() => setExpandedModelo(isExpanded ? null : modelo.id)}
                  >
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center">
                      <ClipboardCheck className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{modelo.nome}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="badge badge-gray">
                          {getTipoLabel(modelo.tipo)}
                        </span>
                        <span className="text-sm text-gray-500">
                          {itensOrdenados.length} perguntas
                        </span>
                        {obrigatorios > 0 && (
                          <span className="text-sm text-gray-500">
                            • {obrigatorios} obrigatórias
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 ml-4">
                    <button
                      onClick={() => duplicateMutation.mutate(modelo)}
                      className="btn-ghost "
                      title="Duplicar"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(modelo)}
                      className="btn-ghost "
                      title="Editar"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(modelo.id)}
                      className="btn-ghost  text-danger"
                      title="Excluir"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Itens expandidos */}
                {isExpanded && (
                  <div className="mt-6 pt-6 border-t border-gray-100">
                    {modelo.descricao && (
                      <p className="text-sm text-gray-600 mb-4">{modelo.descricao}</p>
                    )}
                    
                    <div className="space-y-3">
                      {itensOrdenados.map((item, idx) => {
                        const Icon = getTipoRespostaIcon(item.tipo_resposta)
                        const categoriaColor = getCategoriaColor(item.categoria)
                        
                        return (
                          <div 
                            key={item.id} 
                            className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl"
                          >
                            <span 
                              className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white flex-shrink-0"
                              style={{ backgroundColor: categoriaColor }}
                            >
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">
                                {item.pergunta}
                                {item.obrigatorio && <span className="text-danger ml-1">*</span>}
                              </p>
                              {item.descricao && (
                                <p className="text-xs text-gray-500 mt-0.5">{item.descricao}</p>
                              )}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="badge badge-gray">
                                <Icon className="w-3 h-3" />
                                {TIPOS_RESPOSTA.find(t => t.value === item.tipo_resposta)?.label || item.tipo_resposta}
                              </span>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Modal de Edição */}
      {showModal && (
        <ChecklistModeloModal
          modelo={editingModelo}
          onClose={() => {
            setShowModal(false)
            setEditingModelo(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries(['checklist-modelos'])
            setShowModal(false)
            setEditingModelo(null)
          }}
        />
      )}
    </div>
  )
}

// Modal de Criação/Edição
const ChecklistModeloModal = ({ modelo, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: modelo?.nome || '',
    descricao: modelo?.descricao || '',
    tipo: modelo?.tipo || 'geral'
  })
  const [itens, setItens] = useState(
    modelo?.itens?.filter(i => i.ativo !== false).sort((a, b) => a.ordem - b.ordem).map(item => ({
      ...item,
      opcoes: item.opcoes || [],
      config: item.config || {}
    })) || []
  )
  const [editingItemIndex, setEditingItemIndex] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    if (itens.length === 0) {
      toast.error('Adicione pelo menos uma pergunta')
      return
    }

    setLoading(true)

    try {
      let modeloId = modelo?.id

      if (modelo) {
        // Atualizar modelo existente
        const { error } = await supabase
          .from('checklist_modelos')
          .update({
            nome: formData.nome,
            descricao: formData.descricao,
            tipo: formData.tipo
          })
          .eq('id', modelo.id)
        if (error) throw error

        // Remover itens antigos
        await supabase
          .from('checklist_modelo_itens')
          .delete()
          .eq('checklist_modelo_id', modelo.id)
      } else {
        // Criar novo modelo
        const { data, error } = await supabase
          .from('checklist_modelos')
          .insert([{
            nome: formData.nome,
            descricao: formData.descricao,
            tipo: formData.tipo
          }])
          .select()
          .single()
        if (error) throw error
        modeloId = data.id
      }

      // Inserir itens
      if (itens.length > 0) {
        const itensData = itens.map((item, idx) => ({
          checklist_modelo_id: modeloId,
          pergunta: item.pergunta,
          descricao: item.descricao || null,
          tipo_resposta: item.tipo_resposta || 'checkbox',
          obrigatorio: item.obrigatorio || false,
          opcoes: item.opcoes?.length > 0 ? item.opcoes : null,
          config: Object.keys(item.config || {}).length > 0 ? item.config : null,
          categoria: item.categoria || 'geral',
          ordem: idx + 1
        }))

        const { error } = await supabase
          .from('checklist_modelo_itens')
          .insert(itensData)
        if (error) throw error
      }

      toast.success(modelo ? 'Modelo atualizado!' : 'Modelo criado!')
      onSave()
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const addItem = () => {
    const newItem = {
      id: `new-${Date.now()}`,
      pergunta: '',
      descricao: '',
      tipo_resposta: 'checkbox',
      obrigatorio: false,
      opcoes: [],
      config: {},
      categoria: 'geral'
    }
    setItens([...itens, newItem])
    setEditingItemIndex(itens.length)
  }

  const updateItem = (index, updates) => {
    const updated = [...itens]
    updated[index] = { ...updated[index], ...updates }
    setItens(updated)
  }

  const removeItem = (index) => {
    setItens(itens.filter((_, i) => i !== index))
    setEditingItemIndex(null)
  }

  const moveItem = (index, direction) => {
    const newIndex = index + direction
    if (newIndex < 0 || newIndex >= itens.length) return
    
    const updated = [...itens]
    const temp = updated[index]
    updated[index] = updated[newIndex]
    updated[newIndex] = temp
    setItens(updated)
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-xl">
        <div className="modal-header">
          <h2 className="modal-title">
            {modelo ? 'Editar Modelo' : 'Novo Modelo de Checklist'}
          </h2>
          <button onClick={onClose} className="btn-ghost ">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-6">
          {/* Dados básicos */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome do Modelo *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="input-field"
                placeholder="Ex: Checklist de Instalação"
                required
              />
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                value={formData.tipo}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                className="input-field"
              >
                <option value="geral">Geral</option>
                <option value="instalacao">Instalação</option>
                <option value="manutencao">Manutenção</option>
                <option value="vistoria">Vistoria</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Descrição opcional do modelo..."
            />
          </div>

          {/* Perguntas */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">Perguntas</h3>
                <p className="text-sm text-gray-500">Adicione as perguntas do checklist</p>
              </div>
              <button type="button" onClick={addItem} className="btn-secondary btn-sm">
                <Plus className="w-4 h-4" /> Adicionar Pergunta
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <ClipboardCheck className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500 mb-3">Nenhuma pergunta adicionada</p>
                <button type="button" onClick={addItem} className="btn-primary btn-sm">
                  <Plus className="w-4 h-4" /> Adicionar Primeira Pergunta
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {itens.map((item, index) => (
                  <ItemPergunta
                    key={item.id}
                    item={item}
                    index={index}
                    isEditing={editingItemIndex === index}
                    onEdit={() => setEditingItemIndex(editingItemIndex === index ? null : index)}
                    onUpdate={(updates) => updateItem(index, updates)}
                    onRemove={() => removeItem(index)}
                    onMoveUp={() => moveItem(index, -1)}
                    onMoveDown={() => moveItem(index, 1)}
                    isFirst={index === 0}
                    isLast={index === itens.length - 1}
                  />
                ))}
              </div>
            )}
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// Componente de Pergunta Individual
const ItemPergunta = ({ 
  item, 
  index, 
  isEditing, 
  onEdit, 
  onUpdate, 
  onRemove,
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast
}) => {
  const Icon = TIPOS_RESPOSTA.find(t => t.value === item.tipo_resposta)?.icon || CheckSquare
  const categoriaColor = CATEGORIAS.find(c => c.value === item.categoria)?.color || '#8E8E93'
  const needsOptions = ['selecao_unica', 'selecao_multipla'].includes(item.tipo_resposta)

  const addOpcao = () => {
    const opcoes = [...(item.opcoes || []), '']
    onUpdate({ opcoes })
  }

  const updateOpcao = (idx, value) => {
    const opcoes = [...(item.opcoes || [])]
    opcoes[idx] = value
    onUpdate({ opcoes })
  }

  const removeOpcao = (idx) => {
    const opcoes = (item.opcoes || []).filter((_, i) => i !== idx)
    onUpdate({ opcoes })
  }

  return (
    <div className={`form-item-card ${isEditing ? 'border-blue-300 shadow-md' : ''}`}>
      {/* Header da pergunta */}
      <div className="flex items-start gap-3">
        <div className="flex flex-col gap-1">
          <button 
            type="button"
            onClick={onMoveUp}
            disabled={isFirst}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <span 
            className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
            style={{ backgroundColor: categoriaColor }}
          >
            {index + 1}
          </span>
          <button 
            type="button"
            onClick={onMoveDown}
            disabled={isLast}
            className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          {/* Pergunta */}
          <input
            type="text"
            value={item.pergunta}
            onChange={(e) => onUpdate({ pergunta: e.target.value })}
            className="w-full text-base font-medium text-gray-900 bg-transparent border-none focus:ring-0 p-0 placeholder-gray-400"
            placeholder="Digite a pergunta..."
          />

          {/* Tipo de resposta badge */}
          <div className="flex items-center gap-3 mt-2">
            <span className="form-item-type-badge">
              <Icon className="w-3.5 h-3.5" />
              {TIPOS_RESPOSTA.find(t => t.value === item.tipo_resposta)?.label}
            </span>
            
            {item.obrigatorio && (
              <span className="badge badge-danger">
                <AlertCircle className="w-3 h-3" />
                Obrigatória
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onEdit}
            className={`btn-ghost  ${isEditing ? 'bg-blue-50 text-blue-600' : ''}`}
          >
            <Edit className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onRemove}
            className="btn-ghost  text-danger"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Configurações expandidas */}
      {isEditing && (
        <div className="mt-4 pt-4 border-t border-gray-100 space-y-4 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Tipo de Resposta */}
            <div>
              <label className="label">Tipo de Resposta</label>
              <select
                value={item.tipo_resposta}
                onChange={(e) => onUpdate({ tipo_resposta: e.target.value, opcoes: [] })}
                className="input-field input-sm"
              >
                {TIPOS_RESPOSTA.map(tipo => (
                  <option key={tipo.value} value={tipo.value}>
                    {tipo.label} - {tipo.description}
                  </option>
                ))}
              </select>
            </div>

            {/* Categoria */}
            <div>
              <label className="label">Categoria</label>
              <select
                value={item.categoria}
                onChange={(e) => onUpdate({ categoria: e.target.value })}
                className="input-field input-sm"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>

            {/* Obrigatória */}
            <div>
              <label className="label">Resposta Obrigatória</label>
              <div 
                className={`toggle ${item.obrigatorio ? 'active' : ''}`}
                onClick={() => onUpdate({ obrigatorio: !item.obrigatorio })}
              />
            </div>
          </div>

          {/* Descrição/Ajuda */}
          <div>
            <label className="label">Descrição da pergunta (opcional)</label>
            <input
              type="text"
              value={item.descricao || ''}
              onChange={(e) => onUpdate({ descricao: e.target.value })}
              className="input-field input-sm"
              placeholder="Texto de ajuda para quem está respondendo..."
            />
          </div>

          {/* Opções para seleção */}
          {needsOptions && (
            <div>
              <label className="label">Opções de Resposta</label>
              <div className="space-y-2">
                {(item.opcoes || []).map((opcao, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 w-6">{idx + 1}.</span>
                    <input
                      type="text"
                      value={opcao}
                      onChange={(e) => updateOpcao(idx, e.target.value)}
                      className="input-field input-sm flex-1"
                      placeholder={`Opção ${idx + 1}`}
                    />
                    <button
                      type="button"
                      onClick={() => removeOpcao(idx)}
                      className="btn-ghost  text-danger"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOpcao}
                  className="btn-secondary btn-sm w-full"
                >
                  <Plus className="w-4 h-4" /> Adicionar Opção
                </button>
              </div>
            </div>
          )}

          {/* Placeholder para texto/número */}
          {['texto', 'numero', 'monetario'].includes(item.tipo_resposta) && (
            <div>
              <label className="label">Placeholder (opcional)</label>
              <input
                type="text"
                value={item.config?.placeholder || ''}
                onChange={(e) => onUpdate({ config: { ...item.config, placeholder: e.target.value } })}
                className="input-field input-sm"
                placeholder="Ex: Digite aqui..."
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ChecklistModelos
