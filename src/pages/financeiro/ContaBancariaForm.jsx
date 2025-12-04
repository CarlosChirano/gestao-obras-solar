import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Building2,
  Trash2,
  Palette
} from 'lucide-react'
import toast from 'react-hot-toast'

const ContaBancariaForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdicao = !!id

  const [formData, setFormData] = useState({
    nome: '',
    banco: '',
    agencia: '',
    conta: '',
    tipo: 'corrente',
    saldo_inicial: '',
    cor: '#3B82F6'
  })

  const cores = [
    '#3B82F6', '#22C55E', '#EF4444', '#F59E0B', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]

  // Buscar conta existente
  const { data: conta, isLoading } = useQuery({
    queryKey: ['conta-bancaria', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('contas_bancarias')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdicao
  })

  // Preencher form com dados existentes
  useEffect(() => {
    if (conta) {
      setFormData({
        nome: conta.nome || '',
        banco: conta.banco || '',
        agencia: conta.agencia || '',
        conta: conta.conta || '',
        tipo: conta.tipo || 'corrente',
        saldo_inicial: conta.saldo_inicial || '',
        cor: conta.cor || '#3B82F6'
      })
    }
  }, [conta])

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const payload = {
        ...dados,
        saldo_inicial: parseFloat(dados.saldo_inicial) || 0,
        saldo_atual: isEdicao ? undefined : parseFloat(dados.saldo_inicial) || 0
      }

      // Remover saldo_atual do update (é calculado automaticamente)
      if (isEdicao) {
        delete payload.saldo_atual
      }

      if (isEdicao) {
        const { error } = await supabase
          .from('contas_bancarias')
          .update(payload)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('contas_bancarias')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(isEdicao ? 'Conta atualizada!' : 'Conta criada!')
      queryClient.invalidateQueries(['contas-bancarias'])
      navigate('/financeiro')
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar conta')
    }
  })

  // Mutation para excluir
  const excluirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('contas_bancarias')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Conta excluída!')
      queryClient.invalidateQueries(['contas-bancarias'])
      navigate('/financeiro')
    },
    onError: () => {
      toast.error('Erro ao excluir')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Informe o nome da conta')
      return
    }

    salvarMutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  if (isLoading) {
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEdicao ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
          </h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Dados da Conta</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Conta *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Conta Principal, Caixa, etc."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Banco
              </label>
              <input
                type="text"
                name="banco"
                value={formData.banco}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Banco do Brasil, Itaú, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Conta
              </label>
              <select
                name="tipo"
                value={formData.tipo}
                onChange={handleChange}
                className="input"
              >
                <option value="corrente">Conta Corrente</option>
                <option value="poupanca">Poupança</option>
                <option value="investimento">Investimento</option>
                <option value="caixa">Caixa</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Agência
              </label>
              <input
                type="text"
                name="agencia"
                value={formData.agencia}
                onChange={handleChange}
                className="input"
                placeholder="0000"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número da Conta
              </label>
              <input
                type="text"
                name="conta"
                value={formData.conta}
                onChange={handleChange}
                className="input"
                placeholder="00000-0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Saldo Inicial
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                <input
                  type="number"
                  name="saldo_inicial"
                  value={formData.saldo_inicial}
                  onChange={handleChange}
                  className="input pl-10"
                  placeholder="0,00"
                  step="0.01"
                />
              </div>
              {isEdicao && (
                <p className="text-sm text-gray-500 mt-1">
                  Saldo atual: {formatCurrency(conta?.saldo_atual)}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cor
              </label>
              <div className="flex items-center gap-2">
                {cores.map((cor) => (
                  <button
                    key={cor}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, cor }))}
                    className={`w-8 h-8 rounded-full border-2 transition-transform ${
                      formData.cor === cor ? 'border-gray-900 scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: cor }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Preview */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Preview</h3>
          <div 
            className="p-4 rounded-lg border-l-4"
            style={{ borderLeftColor: formData.cor, backgroundColor: `${formData.cor}10` }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{formData.nome || 'Nome da Conta'}</p>
                <p className="text-sm text-gray-500">{formData.banco || 'Banco'}</p>
                {formData.agencia && (
                  <p className="text-xs text-gray-400 mt-1">
                    Ag: {formData.agencia} {formData.conta && `| Conta: ${formData.conta}`}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: formData.cor }}>
                <Building2 className="w-5 h-5 text-white" />
              </div>
            </div>
            <p className="text-xl font-bold mt-3" style={{ color: formData.cor }}>
              {formatCurrency(formData.saldo_inicial || 0)}
            </p>
          </div>
        </div>

        {/* Botões */}
        <div className="flex items-center justify-between">
          {isEdicao && (
            <button
              type="button"
              onClick={() => {
                if (confirm('Deseja excluir esta conta bancária?')) {
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

export default ContaBancariaForm
