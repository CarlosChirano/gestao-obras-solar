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
  Trash2
} from 'lucide-react'
import toast from 'react-hot-toast'

// Máscara de Moeda - R$ 0.000,00
const maskMoney = (value) => {
  if (!value) return ''
  let numbers = value.toString().replace(/\D/g, '')
  if (!numbers) return ''
  const amount = parseInt(numbers) / 100
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const parseMoney = (value) => {
  if (!value) return null
  const numbers = value.replace(/[R$\s.]/g, '').replace(',', '.')
  const parsed = parseFloat(numbers)
  return isNaN(parsed) ? null : parsed
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
        valor: lancamento.valor ? maskMoney((lancamento.valor * 100).toString()) : '',
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

      if (isEdicao) {
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .update(payload)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('lancamentos_financeiros')
          .insert(payload)
        if (error) throw error
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

        {/* Vínculos */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Vínculos (Opcional)</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {formData.tipo === 'receita' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cliente
                </label>
                <select
                  name="cliente_id"
                  value={formData.cliente_id}
                  onChange={handleChange}
                  className="input"
                >
                  <option value="">Selecione...</option>
                  {clientes?.map((cliente) => (
                    <option key={cliente.id} value={cliente.id}>{cliente.nome}</option>
                  ))}
                </select>
              </div>
            )}

            {formData.tipo === 'despesa' && (
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
            )}

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observações
              </label>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Anotações adicionais..."
              />
            </div>
          </div>
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
