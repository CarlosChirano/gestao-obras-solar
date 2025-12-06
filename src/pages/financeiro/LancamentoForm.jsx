import { useState, useEffect } from 'react'
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
  CheckCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// MÁSCARA DE MOEDA - R$ 0.000.000,00
// ============================================

const maskMoney = (value) => {
  if (!value) return ''
  
  // Remove tudo que não é número
  let numbers = value.toString().replace(/\D/g, '')
  
  // Se vazio ou só zeros, retorna vazio
  if (!numbers || numbers === '0') return ''
  
  // Remove zeros à esquerda
  numbers = numbers.replace(/^0+/, '')
  
  // Se ficou vazio após remover zeros, retorna vazio
  if (!numbers) return ''
  
  // Garante pelo menos 3 dígitos (para os centavos)
  numbers = numbers.padStart(3, '0')
  
  // Separa reais e centavos
  const cents = numbers.slice(-2)
  let reais = numbers.slice(0, -2)
  
  // Remove zeros à esquerda dos reais
  reais = reais.replace(/^0+/, '') || '0'
  
  // Adiciona pontos a cada 3 dígitos nos reais
  reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  
  return `R$ ${reais},${cents}`
}

const parseMoney = (value) => {
  if (!value) return null
  
  // Remove R$, espaços e pontos, substitui vírgula por ponto
  const numbers = value
    .replace('R$', '')
    .replace(/\s/g, '')
    .replace(/\./g, '')
    .replace(',', '.')
  
  const parsed = parseFloat(numbers)
  return isNaN(parsed) ? null : parsed
}

// Formata número do banco para exibição
const formatMoneyFromDB = (value) => {
  if (!value && value !== 0) return ''
  const cents = Math.round(value * 100).toString()
  return maskMoney(cents)
}

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
    categoria_id: '',
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

  // Buscar categorias
  const { data: categorias } = useQuery({
    queryKey: ['categorias-financeiras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categorias_financeiras')
        .select('*')
        .eq('ativo', true)
        .order('nome')
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
        .select('id, nome')
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
        categoria_id: lancamento.categoria_id || '',
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

    // Verificar se já existe
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
        ...dados,
        valor: parseMoney(dados.valor) || 0,
        conta_bancaria_id: dados.conta_bancaria_id || null,
        categoria_id: dados.categoria_id || null,
        forma_pagamento_id: dados.forma_pagamento_id || null,
        cliente_id: dados.cliente_id || null,
        colaborador_id: dados.colaborador_id || null,
        ordem_servico_id: dados.ordem_servico_id || null,
        data_pagamento: dados.data_pagamento || null,
        data_competencia: dados.data_competencia || null,
        total_parcelas: dados.total_parcelas ? parseInt(dados.total_parcelas) : null,
        frequencia: dados.recorrente ? dados.frequencia : null
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
        // Primeiro, remover vínculos antigos
        await supabase
          .from('lancamento_clientes')
          .delete()
          .eq('lancamento_id', lancamentoId)

        // Depois, inserir os novos
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
    if (!formData.valor || parseFloat(formData.valor) <= 0) {
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

  const categoriasFiltradas = categorias?.filter(c => c.tipo === formData.tipo) || []

  // Calcular comparação
  const valorLancamento = parseMoney(formData.valor) || 0
  const somaVinculos = calcularSomaVinculos()
  const diferencaValores = Math.abs(valorLancamento - somaVinculos)
  const valoresConferem = diferencaValores < 0.01 // Tolerância de 1 centavo

  // Clientes disponíveis (que ainda não foram vinculados)
  const clientesDisponiveis = clientes?.filter(c => 
    !clientesVinculados.some(cv => cv.cliente_id === c.id)
  ) || []

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
            className="btn btn-success flex items-center gap-2"
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição *
              </label>
              <input
                type="text"
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Pagamento de energia elétrica"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Valor *
              </label>
              <input
                type="text"
                name="valor"
                value={formData.valor}
                onChange={handleValorChange}
                className="input"
                placeholder="R$ 0,00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categoria
              </label>
              <select
                name="categoria_id"
                value={formData.categoria_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecione...</option>
                {categoriasFiltradas.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Vencimento *
              </label>
              <input
                type="date"
                name="data_vencimento"
                value={formData.data_vencimento}
                onChange={handleChange}
                className="input"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Data de Pagamento
              </label>
              <input
                type="date"
                name="data_pagamento"
                value={formData.data_pagamento}
                onChange={handleChange}
                className="input"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Conta Bancária
              </label>
              <select
                name="conta_bancaria_id"
                value={formData.conta_bancaria_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecione...</option>
                {contas?.map((conta) => (
                  <option key={conta.id} value={conta.id}>{conta.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Forma de Pagamento
              </label>
              <select
                name="forma_pagamento_id"
                value={formData.forma_pagamento_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecione...</option>
                {formasPagamento?.map((fp) => (
                  <option key={fp.id} value={fp.id}>{fp.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                name="status"
                value={formData.status}
                onChange={handleChange}
                className="input"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vínculos com Clientes */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Vínculos com Clientes
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            Vincule um ou mais clientes a este lançamento com seus respectivos valores.
          </p>
          
          {/* Adicionar novo cliente */}
          <div style={{ 
            backgroundColor: '#f9fafb', 
            padding: '16px', 
            borderRadius: '8px',
            marginBottom: '16px'
          }}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: '1fr 150px auto', 
              gap: '12px',
              alignItems: 'flex-end'
            }}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  value={novoClienteId}
                  onChange={(e) => setNovoClienteId(e.target.value)}
                  className="input"
                >
                  <option value="">Selecione um cliente...</option>
                  {clientesDisponiveis.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor
                </label>
                <input
                  type="text"
                  value={novoClienteValor}
                  onChange={(e) => setNovoClienteValor(maskMoney(e.target.value))}
                  className="input"
                  placeholder="R$ 0,00"
                />
              </div>
              <button
                type="button"
                onClick={adicionarClienteVinculado}
                className="btn btn-primary flex items-center gap-2"
                style={{ height: '42px' }}
              >
                <Plus className="w-4 h-4" />
                Adicionar
              </button>
            </div>
          </div>

          {/* Lista de clientes vinculados */}
          {clientesVinculados.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ textAlign: 'left', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151' }}>
                      Cliente
                    </th>
                    <th style={{ textAlign: 'right', padding: '12px 8px', fontSize: '14px', fontWeight: '600', color: '#374151', width: '180px' }}>
                      Valor
                    </th>
                    <th style={{ width: '60px', padding: '12px 8px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {clientesVinculados.map((cliente, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid #e5e7eb' }}>
                      <td style={{ padding: '12px 8px', fontSize: '14px', color: '#1f2937' }}>
                        {cliente.cliente_nome}
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                        <input
                          type="text"
                          value={cliente.valor}
                          onChange={(e) => atualizarValorCliente(index, e.target.value)}
                          className="input"
                          style={{ textAlign: 'right', width: '150px' }}
                        />
                      </td>
                      <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                        <button
                          type="button"
                          onClick={() => removerClienteVinculado(index)}
                          className="p-2 hover:bg-red-50 rounded-lg text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Somatório e comparação */}
              <div style={{ 
                marginTop: '16px', 
                padding: '16px', 
                borderRadius: '8px',
                backgroundColor: valoresConferem ? '#ecfdf5' : '#fef2f2',
                border: `2px solid ${valoresConferem ? '#10b981' : '#ef4444'}`
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Valor do Lançamento:</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {formData.valor || 'R$ 0,00'}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', color: '#6b7280' }}>Total dos Vínculos:</span>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#1f2937' }}>
                    {formatMoneyFromDB(somaVinculos)}
                  </span>
                </div>
                <div style={{ 
                  borderTop: `1px solid ${valoresConferem ? '#10b981' : '#ef4444'}`,
                  paddingTop: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  {valoresConferem ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
                      <CheckCircle className="w-5 h-5" />
                      <span style={{ fontWeight: '600' }}>Valores conferem!</span>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#dc2626' }}>
                      <AlertCircle className="w-5 h-5" />
                      <span style={{ fontWeight: '600' }}>
                        Diferença de {formatMoneyFromDB(diferencaValores)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {clientesVinculados.length === 0 && (
            <div style={{ 
              textAlign: 'center', 
              padding: '32px', 
              color: '#9ca3af',
              backgroundColor: '#f9fafb',
              borderRadius: '8px'
            }}>
              <User className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhum cliente vinculado</p>
              <p className="text-sm">Adicione clientes para rastrear valores individuais</p>
            </div>
          )}
        </div>

        {/* Colaborador (para despesas) */}
        {formData.tipo === 'despesa' && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vínculo com Colaborador (Opcional)</h3>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Colaborador
              </label>
              <select
                name="colaborador_id"
                value={formData.colaborador_id}
                onChange={handleChange}
                className="input"
              >
                <option value="">Selecione...</option>
                {colaboradores?.map((col) => (
                  <option key={col.id} value={col.id}>{col.nome}</option>
                ))}
              </select>
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
            className="input"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Frequência
                </label>
                <select
                  name="frequencia"
                  value={formData.frequencia}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Selecione...</option>
                  <option value="semanal">Semanal</option>
                  <option value="quinzenal">Quinzenal</option>
                  <option value="mensal">Mensal</option>
                  <option value="anual">Anual</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Número de Parcelas
                </label>
                <input
                  type="number"
                  name="total_parcelas"
                  value={formData.total_parcelas}
                  onChange={handleChange}
                  className="input"
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
              className="btn btn-danger flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              Excluir
            </button>
          )}
          
          <div className="flex gap-3 ml-auto">
            <button
              type="button"
              onClick={() => navigate('/financeiro')}
              className="btn btn-secondary"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={salvarMutation.isPending}
              className="btn btn-primary flex items-center gap-2"
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
