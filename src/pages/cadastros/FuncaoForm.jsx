import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  Briefcase,
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

const FuncaoForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEdicao = !!id

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_diaria: '',
    valor_meia_diaria: ''
  })

  // Buscar função existente
  const { data: funcao, isLoading } = useQuery({
    queryKey: ['funcao', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcoes')
        .select('*')
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: isEdicao
  })

  // Preencher form na edição
  useEffect(() => {
    if (funcao) {
      setFormData({
        nome: funcao.nome || '',
        descricao: funcao.descricao || '',
        valor_diaria: funcao.valor_diaria ? maskMoney((funcao.valor_diaria * 100).toString()) : '',
        valor_meia_diaria: funcao.valor_meia_diaria ? maskMoney((funcao.valor_meia_diaria * 100).toString()) : ''
      })
    }
  }, [funcao])

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const payload = {
        nome: dados.nome,
        descricao: dados.descricao || null,
        valor_diaria: parseMoney(dados.valor_diaria) || 0,
        valor_meia_diaria: parseMoney(dados.valor_meia_diaria) || 0
      }

      if (isEdicao) {
        const { error } = await supabase
          .from('funcoes')
          .update(payload)
          .eq('id', id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('funcoes')
          .insert(payload)
        if (error) throw error
      }
    },
    onSuccess: () => {
      toast.success(isEdicao ? 'Função atualizada!' : 'Função criada!')
      queryClient.invalidateQueries(['funcoes'])
      navigate('/funcoes')
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar: ' + error.message)
    }
  })

  // Mutation para excluir
  const excluirMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('funcoes')
        .delete()
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Função excluída!')
      queryClient.invalidateQueries(['funcoes'])
      navigate('/funcoes')
    },
    onError: (error) => {
      toast.error('Erro ao excluir: ' + error.message)
    }
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handler para valores monetários
  const handleMoneyChange = (name) => (e) => {
    const masked = maskMoney(e.target.value)
    setFormData(prev => ({ ...prev, [name]: masked }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    salvarMutation.mutate(formData)
  }

  const handleExcluir = () => {
    if (window.confirm('Tem certeza que deseja excluir esta função?')) {
      excluirMutation.mutate()
    }
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => navigate('/funcoes')} 
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdicao ? 'Editar Função' : 'Nova Função'}
            </h1>
            <p className="text-gray-600">
              {isEdicao ? 'Atualize os dados da função' : 'Cadastre uma nova função'}
            </p>
          </div>
        </div>

        {isEdicao && (
          <button
            onClick={handleExcluir}
            disabled={excluirMutation.isPending}
            className="btn-danger"
          >
            {excluirMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
            Excluir
          </button>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Briefcase className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Dados da Função</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome da Função *</label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: Eletricista, Técnico Solar, Instalador..."
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="label">Descrição</label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                rows={3}
                className="input-field"
                placeholder="Descreva as responsabilidades e atividades desta função..."
              />
            </div>

            <div>
              <label className="label">Valor da Diária</label>
              <input
                type="text"
                name="valor_diaria"
                value={formData.valor_diaria}
                onChange={handleMoneyChange('valor_diaria')}
                className="input-field"
                placeholder="R$ 0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor padrão da diária completa
              </p>
            </div>

            <div>
              <label className="label">Valor da Meia Diária</label>
              <input
                type="text"
                name="valor_meia_diaria"
                value={formData.valor_meia_diaria}
                onChange={handleMoneyChange('valor_meia_diaria')}
                className="input-field"
                placeholder="R$ 0,00"
              />
              <p className="text-xs text-gray-500 mt-1">
                Valor padrão da meia diária
              </p>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <button 
            type="button" 
            onClick={() => navigate('/funcoes')} 
            className="btn-secondary"
          >
            Cancelar
          </button>
          <button 
            type="submit" 
            disabled={salvarMutation.isPending}
            className="btn-primary"
          >
            {salvarMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {salvarMutation.isPending ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default FuncaoForm
