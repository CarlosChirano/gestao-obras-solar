import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ChevronRight,
  ChevronDown,
  Search,
  X,
  TrendingUp,
  TrendingDown,
  Check
} from 'lucide-react'

// ============================================
// COMPONENTE DE SELEÇÃO DE CONTA
// ============================================
// Uso:
// <SelectConta
//   value={formData.plano_conta_id}
//   onChange={(id) => setFormData({ ...formData, plano_conta_id: id })}
//   tipo="despesa" // ou "receita" ou null para todos
// />

const SelectConta = ({ value, onChange, tipo = null, label = "Plano de Contas", required = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [expandedNodes, setExpandedNodes] = useState(new Set())

  // Buscar plano de contas
  const { data: contas } = useQuery({
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

  // Conta selecionada
  const contaSelecionada = useMemo(() => {
    return contas?.find(c => c.id === value)
  }, [contas, value])

  // Construir árvore hierárquica
  const tree = useMemo(() => {
    if (!contas) return []
    
    let filtered = contas
    if (tipo) {
      filtered = contas.filter(c => c.tipo === tipo)
    }
    
    const map = new Map()
    const roots = []
    
    filtered.forEach(conta => {
      map.set(conta.id, { ...conta, children: [] })
    })
    
    filtered.forEach(conta => {
      const node = map.get(conta.id)
      if (conta.conta_pai_id && map.has(conta.conta_pai_id)) {
        const parent = map.get(conta.conta_pai_id)
        parent.children.push(node)
      } else if (!conta.conta_pai_id) {
        roots.push(node)
      }
    })
    
    const sortChildren = (nodes) => {
      nodes.sort((a, b) => a.ordem - b.ordem)
      nodes.forEach(node => sortChildren(node.children))
    }
    sortChildren(roots)
    
    return roots
  }, [contas, tipo])

  // Filtrar por busca
  const filteredTree = useMemo(() => {
    if (!search) return tree
    
    const searchLower = search.toLowerCase()
    
    const filterNode = (node) => {
      const matches = 
        node.nome.toLowerCase().includes(searchLower) ||
        node.codigo.toLowerCase().includes(searchLower)
      
      const filteredChildren = node.children
        .map(filterNode)
        .filter(Boolean)
      
      if (matches || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren }
      }
      
      return null
    }
    
    return tree.map(filterNode).filter(Boolean)
  }, [tree, search])

  // Expandir nós ao buscar
  useMemo(() => {
    if (search) {
      const allCodes = contas?.map(c => c.codigo) || []
      setExpandedNodes(new Set(allCodes))
    }
  }, [search, contas])

  const toggleExpand = (codigo, e) => {
    e.stopPropagation()
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(codigo)) {
      newExpanded.delete(codigo)
    } else {
      newExpanded.add(codigo)
    }
    setExpandedNodes(newExpanded)
  }

  const handleSelect = (conta) => {
    if (conta.permite_lancamento) {
      onChange(conta.id)
      setIsOpen(false)
      setSearch('')
    }
  }

  const handleClear = (e) => {
    e.stopPropagation()
    onChange(null)
  }

  // Componente de nó
  const TreeNode = ({ node, level = 0 }) => {
    const hasChildren = node.children && node.children.length > 0
    const isExpanded = expandedNodes.has(node.codigo)
    const isSelected = node.id === value
    
    return (
      <div>
        <div 
          onClick={() => handleSelect(node)}
          className={`
            flex items-center gap-2 py-2 px-3 rounded-lg cursor-pointer
            ${isSelected ? 'bg-blue-100 border border-blue-300' : 'hover:bg-gray-50'}
            ${!node.permite_lancamento ? 'opacity-70 cursor-default' : ''}
          `}
          style={{ paddingLeft: 12 + level * 20 }}
        >
          {/* Botão expandir */}
          {hasChildren ? (
            <button
              onClick={(e) => toggleExpand(node.codigo, e)}
              className="p-0.5 rounded hover:bg-gray-200"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}
          
          {/* Ícone */}
          <div 
            className="w-6 h-6 rounded flex items-center justify-center"
            style={{ backgroundColor: `${node.cor}20` }}
          >
            {node.tipo === 'receita' ? (
              <TrendingUp className="w-3 h-3" style={{ color: node.cor }} />
            ) : (
              <TrendingDown className="w-3 h-3" style={{ color: node.cor }} />
            )}
          </div>
          
          {/* Código e nome */}
          <span className="font-mono text-xs text-gray-400">{node.codigo}</span>
          <span className={`text-sm ${node.permite_lancamento ? 'text-gray-700' : 'text-gray-500 font-medium'}`}>
            {node.nome}
          </span>
          
          {/* Check se selecionado */}
          {isSelected && (
            <Check className="w-4 h-4 text-blue-600 ml-auto" />
          )}
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

  return (
    <div className="relative">
      <label className="label">
        {label} {required && '*'}
      </label>
      
      {/* Campo de seleção */}
      <div
        onClick={() => setIsOpen(true)}
        className={`
          input-field cursor-pointer flex items-center gap-2
          ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}
        `}
      >
        {contaSelecionada ? (
          <>
            <div 
              className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: `${contaSelecionada.cor}20` }}
            >
              {contaSelecionada.tipo === 'receita' ? (
                <TrendingUp className="w-3 h-3" style={{ color: contaSelecionada.cor }} />
              ) : (
                <TrendingDown className="w-3 h-3" style={{ color: contaSelecionada.cor }} />
              )}
            </div>
            <span className="font-mono text-xs text-gray-400">{contaSelecionada.codigo}</span>
            <span className="text-sm text-gray-700 truncate">{contaSelecionada.nome}</span>
            <button
              onClick={handleClear}
              className="ml-auto p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </>
        ) : (
          <span className="text-gray-400">Selecione uma conta...</span>
        )}
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Overlay para fechar */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
          />
          
          {/* Lista */}
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg max-h-80 overflow-hidden">
            {/* Busca */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar conta..."
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
              </div>
            </div>
            
            {/* Lista de contas */}
            <div className="overflow-y-auto max-h-60">
              {filteredTree.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Nenhuma conta encontrada
                </div>
              ) : (
                <div className="py-1">
                  {filteredTree.map(node => (
                    <TreeNode key={node.id} node={node} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default SelectConta


// ============================================
// EXEMPLO DE USO NO FORMULÁRIO DE LANÇAMENTOS
// ============================================

/*
import SelectConta from '../../components/SelectConta'

// No formulário:
<SelectConta
  value={formData.plano_conta_id}
  onChange={(id) => setFormData({ ...formData, plano_conta_id: id })}
  tipo={formData.tipo} // 'receita' ou 'despesa'
  label="Categoria"
  required
/>
*/
