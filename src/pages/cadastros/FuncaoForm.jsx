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
        valor_diaria: funcao.valor_diaria || '',
        valor_meia_diaria: funcao.valor_meia_diaria || ''
      })
    }
  }, [funcao])

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const payload = {
        nome: dados.nome,
        descricao: dados.descricao || null,
        valor_diaria: dados.valor_diaria ? parseFloat(dados.valor_diaria) : 0,
        valor_meia_diaria: dados.valor_meia_diaria ? parseFloat(dados.valor_meia_diaria) : 0
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
      console.error('Erro ao excluir:', error)
      toast.error('Erro ao excluir. Verifique se não há colaboradores vinculados.')
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.nome.trim()) {
      toast.error('Nome da função é obrigatório')
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

  const handleValorChange = (e, campo) => {
    let valor = e.target.value.replace(/[^\d,]/g, '')
    valor = valor.replace(',', '.')
    setFormData(prev => ({
      ...prev,
      [campo]: valor
    }))
  }

  const formatarMoeda = (valor) => {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
  }

  // Calcular meia diária automaticamente
  const calcularMeiaDiaria = () => {
    if (formData.valor_diaria) {
      const diaria = parseFloat(formData.valor_diaria)
      if (!isNaN(diaria)) {
        setFormData(prev => ({
          ...prev,
          valor_meia_diaria: (diaria / 2).toFixed(2)
        }))
      }
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
          <button onClick={() => navigate('/funcoes')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEdicao ? 'Editar Função' : 'Nova Função'}
            </h1>
            <p className="text-gray-600">Preencha os dados da função</p>
          </div>
        </div>
        {isEdicao && (
          <button
            onClick={() => {
              if (confirm('Deseja excluir esta função?')) {
                excluirMutation.mutate()
              }
            }}
            disabled={excluirMutation.isPending}
            className="btn btn-secondary text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados da Função */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Briefcase className="w-5 h-5" />
            Dados da Função
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome da Função *
              </label>
              <input
                type="text"
                name="nome"
                value={formData.nome}
                onChange={handleChange}
                className="input"
                placeholder="Ex: Eletricista, Instalador, Motorista..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="descricao"
                value={formData.descricao}
                onChange={handleChange}
                className="input"
                rows={3}
                placeholder="Descreva as responsabilidades e atividades desta função..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Diária (R$)
                </label>
                <input
                  type="text"
                  value={formData.valor_diaria ? `R$ ${formData.valor_diaria}` : ''}
                  onChange={(e) => handleValorChange(e, 'valor_diaria')}
                  onBlur={calcularMeiaDiaria}
                  className="input"
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Valor padrão da diária para esta função
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valor da Meia Diária (R$)
                </label>
                <input
                  type="text"
                  value={formData.valor_meia_diaria ? `R$ ${formData.valor_meia_diaria}` : ''}
                  onChange={(e) => handleValorChange(e, 'valor_meia_diaria')}
                  className="input"
                  placeholder="R$ 0,00"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Calculado automaticamente como metade da diária
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/funcoes')}
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
      </form>
    </div>
  )
}

export default FuncaoForm
