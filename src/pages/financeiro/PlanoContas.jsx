import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  ChevronRight,
  ChevronDown,
  Edit,
  Trash2,
  X,
  Save,
  FolderTree,
  TrendingUp,
  TrendingDown,
  MoreHorizontal,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PlanoContas = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingConta, setEditingConta] = useState(null)
  const [parentConta, setParentConta] = useState(null)
  const [expandedNodes, setExpandedNodes] = useState(new Set(['4', '5']))
  const [filterTipo, setFilterTipo] = useState('todos')
  
  const queryClient = useQueryClient()

  // Buscar plano de contas
  const { data: contas, isLoading } = useQuery({
    queryKey: ['plano-contas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('ativo', true)
        .order('codigo')
      if (error) throw error
      return data
    }
  })

  // Construir árvore hierárquica
  const tree = useMemo(() => {
    if (!contas) return []
    
    const map = new Map()
    const roots = []
    
    // Primeiro, criar mapa de todas as contas
    contas.forEach(conta => {
      map.set(conta.id, { ...conta, children: [] })
    })
    
    // Depois, construir hierarquia
    contas.forEach(conta => {
      const node = map.get(conta.id)
      if (conta.conta_pai_id) {
        const parent = map.get(conta.conta_pai_id)
        if (parent) {
          parent.children.push(node)
        }
      } else {
        roots.push(node)
      }
    })
    
    // Ordenar filhos por ordem
    const sortChildren = (nodes) => {
      nodes.sort((a, b) => a.ordem - b.ordem)
      nodes.forEach(node => sortChildren(node.children))
    }
    sortChildren(roots)
    
    return roots
  }, [contas])

  // Filtrar contas
  const filteredTree = useMemo(() => {
    if (!search && filterTipo === 'todos') return tree
    
    const filterNode = (node) => {
      const matchesSearch = !search || 
        node.nome.toLowerCase().includes(search.toLowerCase()) ||
        node.codigo.toLowerCase().includes(search.toLowerCase())
      
      const matchesTipo = filterTipo === 'todos' || node.tipo === filterTipo
      
      const filteredChildren = node.children
        .map(filterNode)
        .filter(Boolean)
      
      if (matchesSearch && matchesTipo) {
        return { ...node, children: filteredChildren }
      }
      
      if (filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }
      
      return null
    }
    
    return tree.map(filterNode).filter(Boolean)
  }, [tree, search, filterTipo])

  // Deletar conta
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Verificar se tem filhos
      const { data: filhos } = await supabase
        .from('plano_contas')
        .select('id')
        .eq('conta_pai_id', id)
        .eq('ativo', true)
      
      if (filhos && filhos.length > 0) {
        throw new Error('Não é possível excluir uma conta que possui subcontas')
      }
      
      // Verificar se tem lançamentos
      const { data: lancamentos } = await supabase
        .from('lancamentos')
        .select('id')
        .eq('plano_conta_id', id)
        .limit(1)
      
      if (lancamentos && lancamentos.length > 0) {
        throw new Error('Não é possível excluir uma conta que possui lançamentos')
      }
      
      const { error } = await supabase
        .from('plano_contas')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['plano-contas'])
      toast.success('Conta excluída!')
    },
    onError: (error) => toast.error(error.message)
  })

  const toggleExpand = (codigo) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo)
    } else {
      newExpanded.add(codigo)
    }
    setExpandedNodes(newExpanded)
  }

  const expandAll = () => {
    const allCodes = contas?.map(c => c.codigo) || []
    setExpandedNodes(new Set(allCodes))
  }

  const collapseAll = () => {
    setExpandedNodes(new Set(['4', '5']))
  }

  const handleEdit = (conta) => {
    setEditingConta(conta)
    setParentConta(null)
    setShowModal(true)
  }

  const handleAddChild = (parentConta) => {
    setEditingConta(null)
    setParentConta(parentConta)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingConta(null)
    setParentConta(null)
    setShowModal(true)
  }

  const handleDelete = (conta) => {
    if (confirm(`Deseja excluir a conta "${conta.codigo} - ${conta.nome}"?`)) {
      deleteMutation.mutate(conta.id)
    }
  }

  // Componente de nó da árvore
  const TreeNode = ({ node, level = 0 }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.codigo)
    
    return (
      <div>
        <div 
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-gray-50 group
            ${level === 0 ? 'bg-gray-50' : ''}
          `}
          style={{ marginLeft: level * 24 }}
        >
          {/* Botão expandir */}
          <button
            onClick={() => toggleExpand(node.codigo)}
            className={`p-1 rounded hover:bg-gray-200 ${!hasChildren ? 'invisible' : ''}`}
          >
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {/* Ícone de tipo */}
          <div 
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${node.cor}20` }}
          >
            {node.tipo === 'receita' ? (
              <TrendingUp className="w-4 h-4" style={{ color: node.cor }} />
            ) : (
              <TrendingDown className="w-4 h-4" style={{ color: node.cor }} />
            )}
          </div>
          
          {/* Código e nome */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-500">{node.codigo}</span>
              <span className={`font-medium ${!node.permite_lancamento ? 'text-gray-900' : 'text-gray-700'}`}>
                {node.nome}
              </span>
              {!node.permite_lancamento && (
                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                  Grupo
                </span>
              )}
            </div>
            {node.natureza && (
              <span className="text-xs text-gray-400 capitalize">{node.natureza.replace('_', ' ')}</span>
            )}
          </div>
          
          {/* Ações */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!node.permite_lancamento && (
              <button
                onClick={() => handleAddChild(node)}
                className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                title="Adicionar subconta"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => handleEdit(node)}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
              title="Editar"
            >
              <Edit className="w-4 h-4" />
            </button>
            {node.nivel > 1 && (
              <button
                onClick={() => handleDelete(node)}
                className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                title="Excluir"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        {/* Filhos */}
        {hasChildren && isExpanded && (
          <div>
            {node.children.map(child => (
              <TreeNode key={child.id} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Estatísticas
  const stats = useMemo(() => {
    if (!contas) return { receitas: 0, despesas: 0, grupos: 0, contas: 0 }
    return {
      receitas: contas.filter(c => c.tipo === 'receita').length,
      despesas: contas.filter(c => c.tipo === 'despesa').length,
      grupos: contas.filter(c => !c.permite_lancamento).length,
      contas: contas.filter(c => c.permite_lancamento).length
    }
  }, [contas])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plano de Contas</h1>
          <p className="text-gray-600">Estrutura hierárquica de receitas e despesas</p>
        </div>
        <button onClick={handleNew} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Conta
        </button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.receitas}</p>
              <p className="text-sm text-gray-500">Receitas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.despesas}</p>
              <p className="text-sm text-gray-500">Despesas</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <FolderTree className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.grupos}</p>
              <p className="text-sm text-gray-500">Grupos</p>
            </div>
          </div>
        </div>
        <div className="card p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
              <MoreHorizontal className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.contas}</p>
              <p className="text-sm text-gray-500">Contas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por código ou nome..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={filterTipo}
              onChange={(e) => setFilterTipo(e.target.value)}
              className="input-field w-40"
            >
              <option value="todos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
            <button onClick={expandAll} className="btn-secondary text-sm">
              Expandir
            </button>
            <button onClick={collapseAll} className="btn-secondary text-sm">
              Recolher
            </button>
          </div>
        </div>
      </div>

      {/* Árvore */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="text-center py-12">
            <FolderTree className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma conta encontrada</p>
            <button onClick={handleNew} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Criar Primeira Conta
            </button>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredTree.map(node => (
              <TreeNode key={node.id} node={node} />
            ))}
          </div>
        )}
      </div>

      {/* Legenda */}
      <div className="card p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Legenda</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded text-xs">Grupo</span>
            <span className="text-gray-600">= Conta sintética (não recebe lançamentos)</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-gray-600">= Receita</span>
          </div>
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-red-600" />
            <span className="text-gray-600">= Despesa</span>
          </div>
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <ContaModal
          conta={editingConta}
          parentConta={parentConta}
          contas={contas}
          onClose={() => {
            setShowModal(false)
            setEditingConta(null)
            setParentConta(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries(['plano-contas'])
            setShowModal(false)
            setEditingConta(null)
            setParentConta(null)
          }}
        />
      )}
    </div>
  )
}


// ============================================
// MODAL DE CRIAÇÃO/EDIÇÃO
// ============================================

const ContaModal = ({ conta, parentConta, contas, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    codigo: conta?.codigo || '',
    nome: conta?.nome || '',
    tipo: conta?.tipo || parentConta?.tipo || 'despesa',
    nivel: conta?.nivel || (parentConta ? parentConta.nivel + 1 : 1),
    conta_pai_id: conta?.conta_pai_id || parentConta?.id || '',
    natureza: conta?.natureza || parentConta?.natureza || 'operacional',
    cor: conta?.cor || parentConta?.cor || '#6B7280',
    permite_lancamento: conta?.permite_lancamento ?? true,
    ordem: conta?.ordem || 0
  })

  // Sugerir próximo código
  const suggestCode = () => {
    if (!parentConta || !contas) return
    
    const siblings = contas.filter(c => c.conta_pai_id === parentConta.id)
    const lastSibling = siblings.sort((a, b) => b.codigo.localeCompare(a.codigo))[0]
    
    if (lastSibling) {
      const parts = lastSibling.codigo.split('.')
      const lastPart = parseInt(parts[parts.length - 1]) + 1
      parts[parts.length - 1] = lastPart.toString()
      return parts.join('.')
    } else {
      return parentConta.codigo + '.1'
    }
  }

  // Preencher código sugerido ao abrir
  useState(() => {
    if (!conta && parentConta) {
      const suggested = suggestCode()
      if (suggested) {
        setFormData(prev => ({ ...prev, codigo: suggested }))
      }
    }
  }, [])

  // Grupos possíveis (contas que não permitem lançamento)
  const gruposPossiveis = contas?.filter(c => !c.permite_lancamento && c.tipo === formData.tipo) || []

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.codigo.trim()) {
      toast.error('Código é obrigatório')
      return
    }

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        codigo: formData.codigo.trim(),
        nome: formData.nome.trim(),
        tipo: formData.tipo,
        nivel: formData.nivel,
        conta_pai_id: formData.conta_pai_id || null,
        natureza: formData.natureza,
        cor: formData.cor,
        permite_lancamento: formData.permite_lancamento,
        ordem: formData.ordem
      }

      if (conta) {
        const { error } = await supabase
          .from('plano_contas')
          .update(dataToSave)
          .eq('id', conta.id)
        if (error) throw error
        toast.success('Conta atualizada!')
      } else {
        const { error } = await supabase
          .from('plano_contas')
          .insert([dataToSave])
        if (error) throw error
        toast.success('Conta criada!')
      }
      onSave()
    } catch (error) {
      if (error.message.includes('unique')) {
        toast.error('Já existe uma conta com este código')
      } else {
        toast.error('Erro ao salvar: ' + error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  const cores = [
    { value: '#10B981', nome: 'Verde' },
    { value: '#3B82F6', nome: 'Azul' },
    { value: '#8B5CF6', nome: 'Roxo' },
    { value: '#EC4899', nome: 'Rosa' },
    { value: '#F59E0B', nome: 'Amarelo' },
    { value: '#F97316', nome: 'Laranja' },
    { value: '#EF4444', nome: 'Vermelho' },
    { value: '#6B7280', nome: 'Cinza' },
    { value: '#14B8A6', nome: 'Turquesa' }
  ]

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-md">
        <div className="modal-header">
          <h2 className="modal-title">
            {conta ? 'Editar Conta' : parentConta ? `Nova Subconta de ${parentConta.nome}` : 'Nova Conta'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          {/* Tipo */}
          <div>
            <label className="label">Tipo *</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'receita' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  formData.tipo === 'receita'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-green-300'
                }`}
                disabled={!!parentConta}
              >
                <TrendingUp className="w-5 h-5" />
                Receita
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, tipo: 'despesa' })}
                className={`flex-1 py-3 px-4 rounded-xl border-2 flex items-center justify-center gap-2 transition-all ${
                  formData.tipo === 'despesa'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-red-300'
                }`}
                disabled={!!parentConta}
              >
                <TrendingDown className="w-5 h-5" />
                Despesa
              </button>
            </div>
          </div>

          {/* Grupo pai */}
          {!parentConta && (
            <div>
              <label className="label">Grupo (Conta Pai)</label>
              <select
                value={formData.conta_pai_id}
                onChange={(e) => {
                  const pai = contas?.find(c => c.id === e.target.value)
                  setFormData({ 
                    ...formData, 
                    conta_pai_id: e.target.value,
                    nivel: pai ? pai.nivel + 1 : 1,
                    natureza: pai?.natureza || formData.natureza,
                    cor: pai?.cor || formData.cor
                  })
                }}
                className="input-field"
              >
                <option value="">Nenhum (conta raiz)</option>
                {gruposPossiveis.map(g => (
                  <option key={g.id} value={g.id}>
                    {g.codigo} - {g.nome}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Código e Nome */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="label">Código *</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="input-field font-mono"
                placeholder="5.1.1"
                required
              />
            </div>
            <div className="col-span-2">
              <label className="label">Nome *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="input-field"
                placeholder="Ex: Diárias - Instaladores"
                required
              />
            </div>
          </div>

          {/* Natureza */}
          <div>
            <label className="label">Natureza</label>
            <select
              value={formData.natureza}
              onChange={(e) => setFormData({ ...formData, natureza: e.target.value })}
              className="input-field"
            >
              <option value="operacional">Operacional</option>
              <option value="nao_operacional">Não Operacional</option>
              <option value="investimento">Investimento</option>
              <option value="imposto">Imposto</option>
            </select>
          </div>

          {/* Cor e Permite Lançamento */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {cores.map(cor => (
                  <button
                    key={cor.value}
                    type="button"
                    onClick={() => setFormData({ ...formData, cor: cor.value })}
                    className={`w-8 h-8 rounded-lg border-2 transition-all ${
                      formData.cor === cor.value ? 'border-gray-800 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor.value }}
                    title={cor.nome}
                  />
                ))}
              </div>
            </div>
            <div>
              <label className="label">Tipo de Conta</label>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, permite_lancamento: true })}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm transition-all ${
                    formData.permite_lancamento
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300'
                  }`}
                >
                  Analítica
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, permite_lancamento: false })}
                  className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm transition-all ${
                    !formData.permite_lancamento
                      ? 'border-purple-500 bg-purple-50 text-purple-700'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  Sintética (Grupo)
                </button>
              </div>
            </div>
          </div>

          {/* Info sobre tipo de conta */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">Diferença entre tipos:</p>
                <ul className="mt-1 space-y-1 text-blue-700">
                  <li>• <strong>Analítica:</strong> Recebe lançamentos (ex: "Combustível")</li>
                  <li>• <strong>Sintética:</strong> Agrupa outras contas (ex: "VEÍCULOS")</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Ordem */}
          <div>
            <label className="label">Ordem de Exibição</label>
            <input
              type="number"
              value={formData.ordem}
              onChange={(e) => setFormData({ ...formData, ordem: parseInt(e.target.value) || 0 })}
              className="input-field w-24"
              min="0"
            />
            <p className="text-xs text-gray-500 mt-1">Menor número aparece primeiro</p>
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default PlanoContas
