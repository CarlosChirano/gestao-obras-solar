import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  DollarSign,
  Calendar,
  FileText,
  Tag,
  Building2,
  User,
  Briefcase,
  CreditCard,
  Repeat,
  CheckCircle2,
  Trash2,
  Plus,
  AlertCircle,
  CheckCircle,
  Search,
  X,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  ClipboardList
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// MÁSCARA DE MOEDA - R$ 0.000.000,00
// ============================================

const maskMoney = (value) => {
  if (!value) return ''
  
  let numbers = value.toString().replace(/\D/g, '')
  
  if (!numbers || numbers === '0') return ''
  
  numbers = numbers.replace(/^0+/, '')
  
  if (!numbers) return ''
  
  numbers = numbers.padStart(3, '0')
  
  const cents = numbers.slice(-2)
  let reais = numbers.slice(0, -2)
  
  reais = reais.replace(/^0+/, '') || '0'
  
  reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `R$ ${reais},${cents}`
}

const parseMoney = (value) => {
  if (!value) return null
  
  const numbers = value
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  
  const parsed = parseFloat(numbers)
  return isNaN(parsed) ? null : parsed
}

const formatMoneyFromDB = (value) => {
  if (!value && value !== 0) return ''
  const cents = Math.round(value * 100).toString()
  return maskMoney(cents)
}

// ============================================
// COMPONENTE DE SELECT COM BUSCA
// ============================================

const SearchableSelect = ({ 
  options, 
  value, 
  onChange, 
  placeholder = "Selecione...",
  searchPlaceholder = "Buscar...",
  labelKey = "nome",
  valueKey = "id",
  renderOption = null
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')

  const selectedOption = options?.find(opt => opt[valueKey] === value)

  const filteredOptions = useMemo(() => {
    if (!options) return []
    if (!search) return options
    
    const searchLower = search.toLowerCase()
    return options.filter(opt => 
      opt[labelKey]?.toLowerCase().includes(searchLower)
    )
  }, [options, search, labelKey])

  const handleSelect = (option) => {
    onChange(option[valueKey])
    setIsOpen(false)
    setSearch('')
  }

  return (
    <div className="relative">
      {/* Campo de exibição */}
      <div
        onClick={() => setIsOpen(true)}
        className={`input-field cursor-pointer flex items-center justify-between ${isOpen ? 'ring-2 ring-blue-500 border-blue-500' : ''}`}
      >
        <span className={selectedOption ? 'text-gray-900 truncate' : 'text-gray-400'}>
          {selectedOption ? (renderOption ? renderOption(selectedOption) : selectedOption[labelKey]) : placeholder}
        </span>
        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {/* Dropdown */}
      {isOpen && (
        <>
          <div 
            className="fixed inset-0 z-40"
            onClick={() => {
              setIsOpen(false)
              setSearch('')
            }}
          />
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-2xl shadow-lg max-h-72 overflow-hidden">
            {/* Campo de busca */}
            <div className="p-2 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full pl-10 pr-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Lista de opções */}
            <div className="overflow-y-auto max-h-52">
              {/* Opção vazia */}
              <div
                onClick={() => {
                  onChange('')
                  setIsOpen(false)
                  setSearch('')
                }}
                className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-gray-400 text-sm"
              >
                {placeholder}
              </div>

              {filteredOptions.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">
                  Nenhum resultado encontrado
                </div>
              ) : (
                filteredOptions.map((option) => (
                  <div
                    key={option[valueKey]}
                    onClick={() => handleSelect(option)}
                    className={`px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm ${
                      option[valueKey] === value ? 'bg-blue-50 text-blue-700' : ''
                    }`}
                  >
                    {renderOption ? renderOption(option) : option[labelKey]}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const LancamentoForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdicao = !!id

  const [formData, setFormData] = useState({
    tipo: 'despesa',
    descricao: '',
    valor: '',
    data_vencimento: new Date().toISOString().split('T')[0],
    data_pagamento: '',
    data_competencia: '',
    status: 'pendente',
    conta_bancaria_id: '',
    plano_conta_id: '',
    forma_pagamento_id: '',
    cliente_id: '',
    colaborador_id: '',
    ordem_servico_id: '',
    recorrente: false,
    frequencia: '',
    total_parcelas: '',
    observacoes: ''
  })

  // Estado para múltiplos clientes vinculados
  const [clientesVinculados, setClientesVinculados] = useState([])
  const [novoClienteId, setNovoClienteId] = useState('')
  const [novoClienteValor, setNovoClienteValor] = useState('')

  // Buscar lançamento existente
  const { data: lancamento, isLoading: loadingLancamento } = useQuery({
    queryKey: ['lancamento', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamentos_financeiros')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdicao
  })

  // Buscar vínculos existentes
  const { data: vinculosExistentes } = useQuery({
    queryKey: ['lancamento-clientes', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('lancamento_clientes')
        .select(`
          id,
          cliente_id,
          valor,
          observacao,
          clientes (id, nome)
        `)
        .eq('lancamento_id', id)
      if (error) throw error
      return data
    },
    enabled: isEdicao
  })

  // Buscar Plano de Contas (ao invés de categorias)
  const { data: planoContas } = useQuery({
    queryKey: ['plano-contas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('plano_contas')
        .select('*')
        .eq('ativo', true)
        .eq('permite_lancamento', true)
        .order('codigo')
      if (error) throw error
      return data
    }
  })

  // Buscar contas bancárias
  const { data: contas } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar formas de pagamento
  const { data: formasPagamento } = useQuery({
    queryKey: ['formas-pagamento'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('formas_pagamento')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, numero_contrato')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar colaboradores
  const { data: colaboradores } = useQuery({
    queryKey: ['colaboradores-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar Ordens de Serviço para vincular
  const { data: ordensServico } = useQuery({
    queryKey: ['ordens-servico-select'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, cliente:clientes(nome), data_agendamento, valor_total')
        .eq('ativo', true)
        .order('data_agendamento', { ascending: false })
        .limit(100)
      if (error) throw error
      return data?.map(os => ({
        ...os,
        nomeExibicao: `${os.numero_os || 'OS'} - ${os.cliente?.nome || 'Sem cliente'}`
      }))
    }
  })

  // Filtrar plano de contas por tipo (só contas analíticas - que recebem lançamento)
  const planoContasFiltrado = useMemo(() => {
    if (!planoContas) return []
    return planoContas.filter(pc => pc.tipo === formData.tipo)
  }, [planoContas, formData.tipo])

  // Buscar todos os planos (incluindo grupos) para mostrar o pai
  const { data: todosPlanoContas } = useQuery({
    queryKey: ['plano-contas-todos'],
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

  // Encontrar o grupo pai baseado no código
  const grupoContaPai = useMemo(() => {
    if (!formData.plano_conta_id || !todosPlanoContas) return null
    
    const contaSelecionada = todosPlanoContas.find(pc => pc.id === formData.plano_conta_id)
    if (!contaSelecionada) return null
    
    // Extrair código do pai (ex: 4.1.1 → 4.1, 5.2.3 → 5.2)
    const partesCodigo = contaSelecionada.codigo.split('.')
    if (partesCodigo.length <= 2) return null // Já é um grupo de nível 2
    
    const codigoPai = partesCodigo.slice(0, 2).join('.')
    return todosPlanoContas.find(pc => pc.codigo === codigoPai)
  }, [formData.plano_conta_id, todosPlanoContas])

  // Preencher form com dados existentes
  useEffect(() => {
    if (lancamento) {
      setFormData({
        tipo: lancamento.tipo || 'despesa',
        descricao: lancamento.descricao || '',
        valor: formatMoneyFromDB(lancamento.valor),
        data_vencimento: lancamento.data_vencimento || '',
        data_pagamento: lancamento.data_pagamento || '',
        data_competencia: lancamento.data_competencia || '',
        status: lancamento.status || 'pendente',
        conta_bancaria_id: lancamento.conta_bancaria_id || '',
        plano_conta_id: lancamento.plano_conta_id || lancamento.categoria_id || '',
        forma_pagamento_id: lancamento.forma_pagamento_id || '',
        cliente_id: lancamento.cliente_id || '',
        colaborador_id: lancamento.colaborador_id || '',
        ordem_servico_id: lancamento.ordem_servico_id || '',
        recorrente: lancamento.recorrente || false,
        frequencia: lancamento.frequencia || '',
        total_parcelas: lancamento.total_parcelas || '',
        observacoes: lancamento.observacoes || ''
      })
    }
  }, [lancamento])

  // Carregar vínculos existentes
  useEffect(() => {
    if (vinculosExistentes) {
      const vinculos = vinculosExistentes.map(v => ({
        id: v.id,
        cliente_id: v.cliente_id,
        cliente_nome: v.clientes?.nome || 'Cliente não encontrado',
        valor: formatMoneyFromDB(v.valor),
        observacao: v.observacao || ''
      }))
      setClientesVinculados(vinculos)
    }
  }, [vinculosExistentes])

  // Ao selecionar conta do plano, preencher descrição
  const handlePlanoContaChange = (planoContaId) => {
    const contaSelecionada = planoContas?.find(pc => pc.id === planoContaId)
    
    setFormData(prev => ({
      ...prev,
      plano_conta_id: planoContaId,
      descricao: prev.descricao || contaSelecionada?.nome || ''
    }))
  }

  // Calcular soma dos vínculos
  const calcularSomaVinculos = () => {
    return clientesVinculados.reduce((soma, cliente) => {
      const valor = parseMoney(cliente.valor) || 0
      return soma + valor
    }, 0)
  }

  // Adicionar cliente vinculado
  const adicionarClienteVinculado = () => {
    if (!novoClienteId) {
      toast.error('Selecione um cliente')
      return
    }
    if (!novoClienteValor) {
      toast.error('Informe o valor')
      return
    }

    if (clientesVinculados.some(c => c.cliente_id === novoClienteId)) {
      toast.error('Este cliente já está vinculado')
      return
    }

    const clienteSelecionado = clientes?.find(c => c.id === novoClienteId)
    
    setClientesVinculados(prev => [...prev, {
      cliente_id: novoClienteId,
      cliente_nome: clienteSelecionado?.nome || 'Cliente',
      valor: novoClienteValor,
      observacao: ''
    }])

    setNovoClienteId('')
    setNovoClienteValor('')
  }

  // Remover cliente vinculado
  const removerClienteVinculado = (index) => {
    setClientesVinculados(prev => prev.filter((_, i) => i !== index))
  }

  // Atualizar valor de um cliente vinculado
  const atualizarValorCliente = (index, valor) => {
    setClientesVinculados(prev => prev.map((c, i) => 
      i === index ? { ...c, valor: maskMoney(valor) } : c
    ))
  }

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const payload = {
        tipo: dados.tipo,
        descricao: dados.descricao,
        valor: parseMoney(dados.valor) || 0,
        data_vencimento: dados.data_vencimento,
        data_pagamento: dados.data_pagamento || null,
        data_competencia: dados.data_competencia || null,
        status: dados.status,
        conta_bancaria_id: dados.conta_bancaria_id || null,
        plano_conta_id: dados.plano_conta_id || null,
        forma_pagamento_id: dados.forma_pagamento_id || null,
        cliente_id: dados.cliente_id || null,
        colaborador_id: dados.colaborador_id || null,
        ordem_servico_id: dados.ordem_servico_id || null,
        recorrente: dados.recorrente,
        total_parcelas: dados.total_parcelas ? parseInt(dados.total_parcelas) : null,
        frequencia: dados.recorrente ? dados.frequencia : null,
        observacoes: dados.observacoes
      }

      let lancamentoId = id

      if (isEdicao) {
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .update(payload)
          .eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('lancamentos_financeiros')
          .insert(payload)
          .select('id')
          .single()
        if (error) throw error
        lancamentoId = data.id
      }

      // Salvar vínculos de clientes
      if (lancamentoId) {
        await supabase
          .from('lancamento_clientes')
          .delete()
          .eq('lancamento_id', lancamentoId)

        if (clientesVinculados.length > 0) {
          const vinculos = clientesVinculados.map(c => ({
            lancamento_id: lancamentoId,
            cliente_id: c.cliente_id,
            valor: parseMoney(c.valor) || 0,
            observacao: c.observacao || null
          }))

          const { error: vinculosError } = await supabase
            .from('lancamento_clientes')
            .insert(vinculos)
          
          if (vinculosError) {
            console.error('Erro ao salvar vínculos:', vinculosError)
          }
        }
      }
    },
    onSuccess: () => {
      toast.success(isEdicao ? 'Lançamento atualizado!' : 'Lançamento criado!')
      queryClient.invalidateQueries(['lancamentos-financeiros'])
      navigate('/financeiro')
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar lançamento')
    }
  })

  // Mutation para excluir
  const excluirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Lançamento excluído!')
      queryClient.invalidateQueries(['lancamentos-financeiros'])
      navigate('/financeiro')
    },
    onError: () => {
      toast.error('Erro ao excluir')
    }
  })

  // Mutation para marcar como pago
  const marcarPagoMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('lancamentos_financeiros')
        .update({ 
          status: 'pago',
          data_pagamento: new Date().toISOString().split('T')[0]
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Lançamento marcado como pago!')
      queryClient.invalidateQueries(['lancamentos-financeiros'])
      navigate('/financeiro')
    },
    onError: () => {
      toast.error('Erro ao atualizar')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.descricao.trim()) {
      toast.error('Informe a descrição')
      return
    }
    if (!formData.valor || parseMoney(formData.valor) <= 0) {
      toast.error('Informe um valor válido')
      return
    }
    if (!formData.data_vencimento) {
      toast.error('Informe a data de vencimento')
      return
    }

    salvarMutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleValorChange = (e) => {
    const masked = maskMoney(e.target.value)
    setFormData(prev => ({ ...prev, valor: masked }))
  }

  // Calcular comparação
  const valorLancamento = parseMoney(formData.valor) || 0
  const somaVinculos = calcularSomaVinculos()
  const diferencaValores = Math.abs(valorLancamento - somaVinculos)
  const valoresConferem = diferencaValores < 0.01

  // Clientes disponíveis
  const clientesDisponiveis = clientes?.filter(c => 
    !clientesVinculados.some(cv => cv.cliente_id === c.id)
  ) || []

  // Formatar clientes para exibição com número do contrato
  const clientesDisponiveisFormatados = useMemo(() => {
    return clientesDisponiveis.map(c => ({
      ...c,
      nomeExibicao: c.numero_contrato 
        ? `${c.numero_contrato} - ${c.nome}`
        : c.nome
    }))
  }, [clientesDisponiveis])

  if (loadingLancamento) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/financeiro')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdicao ? 'Editar Lançamento' : 'Novo Lançamento'}
          </h1>
        </div>
        {isEdicao && formData.status === 'pendente' && (
          <button
            onClick={() => marcarPagoMutation.mutate()}
            disabled={marcarPagoMutation.isPending}
            className="btn-success flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            Marcar como Pago
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tipo */}
        <div className="card">
          <div className="flex gap-4">
            <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.tipo === 'receita' 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="tipo"
                value="receita"
                checked={formData.tipo === 'receita'}
                onChange={handleChange}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                  formData.tipo === 'receita' ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <DollarSign className="w-6 h-6" />
                </div>
                <p className={`mt-2 font-medium ${formData.tipo === 'receita' ? 'text-green-700' : 'text-gray-600'}`}>
                  Receita
                </p>
                <p className="text-sm text-gray-500">Entrada de dinheiro</p>
              </div>
            </label>

            <label className={`flex-1 p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              formData.tipo === 'despesa' 
                ? 'border-red-500 bg-red-50' 
                : 'border-gray-200 hover:border-gray-300'
            }`}>
              <input
                type="radio"
                name="tipo"
                value="despesa"
                checked={formData.tipo === 'despesa'}
                onChange={handleChange}
                className="sr-only"
              />
              <div className="text-center">
                <div className={`w-12 h-12 mx-auto rounded-full flex items-center justify-center ${
                  formData.tipo === 'despesa' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  <CreditCard className="w-6 h-6" />
                </div>
                <p className={`mt-2 font-medium ${formData.tipo === 'despesa' ? 'text-red-700' : 'text-gray-600'}`}>
                  Despesa
                </p>
                <p className="text-sm text-gray-500">Saída de dinheiro</p>
              </div>
            </label>
          </div>
        </div>

        {/* Dados Principais */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados do Lançamento</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Plano de Contas (Subconta) */}
            <div>
              <label className="label">Plano de Contas *</label>
              <SearchableSelect
                options={planoContasFiltrado}
                value={formData.plano_conta_id}
                onChange={handlePlanoContaChange}
                placeholder="Selecione uma conta..."
                searchPlaceholder="Buscar conta..."
                labelKey="nome"
                valueKey="id"
                renderOption={(opt) => (
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-gray-400">{opt.codigo}</span>
                    <span>{opt.nome}</span>
                  </div>
                )}
              />
            </div>

            {/* Grupo/Categoria (preenchido automaticamente) */}
            <div>
              <label className="label">Categoria (Grupo)</label>
              <div className={`input-field flex items-center gap-2 ${grupoContaPai ? 'bg-gray-50' : 'bg-gray-100'}`}>
                {grupoContaPai ? (
                  <>
                    <span className="font-mono text-xs text-gray-400">{grupoContaPai.codigo}</span>
                    <span className="text-gray-700">{grupoContaPai.nome}</span>
                  </>
                ) : (
                  <span className="text-gray-400 text-sm">Selecione um plano de contas</span>
                )}
              </div>
            </div>

            {/* Descrição */}
            <div className="md:col-span-2">
              <label className="label">Descrição *</label>
              <input
                type="text"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: Pagamento de energia elétrica"
                required
              />
            </div>

            <div>
              <label className="label">Valor *</label>
              <input
                type="text"
                name="valor"
                value={formData.valor}
                onChange={handleValorChange}
                className="input-field"
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div>
              <label className="label">Data de Vencimento *</label>
              <input
                type="date"
                name="data_vencimento"
                value={formData.data_vencimento}
                onChange={handleChange}
                className="input-field"
                required
              />
            </div>

            <div>
              <label className="label">Data de Pagamento</label>
              <input
                type="date"
                name="data_pagamento"
                value={formData.data_pagamento}
                onChange={handleChange}
                className="input-field"
              />
            </div>

            <div>
              <label className="label">Conta Bancária</label>
              <select
                name="conta_bancaria_id"
                value={formData.conta_bancaria_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Selecione...</option>
                {contas?.map((conta) => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Forma de Pagamento</label>
              <select
                name="forma_pagamento_id"
                value={formData.forma_pagamento_id}
                onChange={handleChange}
                className="input-field"
              >
                <option value="">Selecione...</option>
                {formasPagamento?.map((fp) => (
                  <option key={fp.id} value={fp.id}>{fp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="label">Status</label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input-field"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vínculos */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vínculos (Opcional)</h3>
          
          {/* Vínculo com OS */}
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <label className="label flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              Vincular à Ordem de Serviço
            </label>
            <SearchableSelect
              options={ordensServico || []}
              value={formData.ordem_servico_id}
              onChange={(val) => setFormData(prev => ({ ...prev, ordem_servico_id: val }))}
              placeholder="Selecione uma OS..."
              searchPlaceholder="Buscar por número ou cliente..."
              labelKey="nomeExibicao"
              valueKey="id"
              renderOption={(opt) => (
                <div className="flex justify-between items-center w-full">
                  <div>
                    <span className="font-medium">{opt.numero_os || 'OS'}</span>
                    <span className="text-gray-500 ml-2 text-sm">{opt.cliente?.nome}</span>
                  </div>
                  {opt.valor_total > 0 && (
                    <span className="text-xs text-green-600 font-medium">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(opt.valor_total)}
                    </span>
                  )}
                </div>
              )}
            />
            <p className="text-xs text-blue-600 mt-2">
              💡 Vincule este lançamento a uma OS para ter o DRE por obra
            </p>
          </div>

          {/* Vínculos com Clientes */}
          <div className="border-t pt-4">
            <h4 className="font-medium text-gray-700 mb-2">Vínculos com Clientes</h4>
            <p className="text-sm text-gray-500 mb-4">
              Vincule um ou mais clientes a este lançamento com seus respectivos valores.
            </p>
          
          {/* Adicionar novo cliente */}
          <div className="bg-gray-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-1">
                <label className="label">Cliente</label>
                <SearchableSelect
                  options={clientesDisponiveisFormatados}
                  value={novoClienteId}
                  onChange={setNovoClienteId}
                  placeholder="Selecione um cliente..."
                  searchPlaceholder="Buscar por nome ou contrato..."
                  labelKey="nomeExibicao"
                  valueKey="id"
                />
              </div>
              <div>
                <label className="label">Valor</label>
                <input
                  type="text"
                  value={novoClienteValor}
                  onChange={(e) => setNovoClienteValor(maskMoney(e.target.value))}
                  className="input-field"
                  placeholder="R$ 0,00"
                />
              </div>
              <div>
                <button
                  type="button"
                  onClick={adicionarClienteVinculado}
                  className="btn-primary w-full h-[42px]"
                >
                  <Plus className="w-4 h-4" />
                  Adicionar
                </button>
              </div>
            </div>
          </div>

          {/* Lista de clientes vinculados */}
          {clientesVinculados.length > 0 && (
            <div className="mt-4">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-gray-200">
                    <th className="text-left px-3 py-2 text-sm font-semibold text-gray-700">Cliente</th>
                    <th className="text-right px-3 py-2 text-sm font-semibold text-gray-700 w-44">Valor</th>
                    <th className="w-12 px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesVinculados.map((cliente, index) => (
                    <tr key={index} className="border-b border-gray-100">
                      <td className="px-3 py-2 text-sm text-gray-900">{cliente.cliente_nome}</td>
                      <td className="px-3 py-2 text-right">
                        <input
                          type="text"
                          value={cliente.valor}
                          onChange={(e) => atualizarValorCliente(index, e.target.value)}
                          className="input-field text-right w-36"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removerClienteVinculado(index)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Somatório */}
              <div className={`mt-4 p-4 rounded-lg border-2 ${
                valoresConferem 
                  ? 'bg-green-50 border-green-300' 
                  : 'bg-red-50 border-red-300'
              }`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Valor do Lançamento:</span>
                  <span className="font-semibold">{formData.valor || 'R$ 0,00'}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Total dos Vínculos:</span>
                  <span className="font-semibold">{formatMoneyFromDB(somaVinculos)}</span>
                </div>
                <div className={`border-t pt-2 flex justify-between items-center ${
                  valoresConferem ? 'border-green-300' : 'border-red-300'
                }`}>
                  {valoresConferem ? (
                    <div className="flex items-center gap-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Valores conferem!</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="w-5 h-5" />
                      <span className="font-semibold">Diferença: {formatMoneyFromDB(diferencaValores)}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {clientesVinculados.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <User className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-gray-500">Nenhum cliente vinculado</p>
              <p className="text-sm text-gray-400">Adicione clientes para rastrear valores individuais</p>
            </div>
          )}
          </div>
        </div>

        {/* Colaborador (para despesas) */}
        {formData.tipo === 'despesa' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vínculo com Colaborador (Opcional)</h3>
            <div>
              <label className="label">Colaborador</label>
              <SearchableSelect
                options={colaboradores || []}
                value={formData.colaborador_id}
                onChange={(val) => setFormData(prev => ({ ...prev, colaborador_id: val }))}
                placeholder="Selecione..."
                searchPlaceholder="Buscar colaborador..."
                labelKey="nome"
                valueKey="id"
              />
            </div>
          </div>
        )}

        {/* Observações */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Observações</h3>
          <textarea
            name="observacoes"
            value={formData.observacoes}
            onChange={handleChange}
            className="input-field"
            rows={3}
            placeholder="Anotações adicionais..."
          />
        </div>

        {/* Recorrência */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              name="recorrente"
              id="recorrente"
              checked={formData.recorrente}
              onChange={handleChange}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="recorrente" className="text-lg font-semibold text-gray-900">
              Lançamento Recorrente
            </label>
          </div>

          {formData.recorrente && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Frequência</label>
                <select
                  name="frequencia"
                  value={formData.frequencia}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="label">Número de Parcelas</label>
                <input
                  type="number"
                  name="total_parcelas"
                  value={formData.total_parcelas}
                  onChange={handleChange}
                  className="input-field"
                  placeholder="Ex: 12"
                  min="1"
                />
              </div>
            </div>
          )}
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between">
          {isEdicao && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja excluir este lançamento?')) {
                  excluirMutation.mutate()
                }
              }}
              className="btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate('/financeiro')}
              className="btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvarMutation.isPending}
              className="btn-primary flex items-center gap-2"
            >
              {salvarMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Salvar
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}

export default LancamentoForm
