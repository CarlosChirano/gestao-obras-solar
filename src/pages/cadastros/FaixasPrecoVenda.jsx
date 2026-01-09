import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  DollarSign,
  Edit,
  Trash2,
  X,
  TrendingUp,
  Zap
} from 'lucide-react'
import toast from 'react-hot-toast'

const FaixasPrecoVenda = () => {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFaixa, setEditingFaixa] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, faixa: null })
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    kwp_min: '',
    kwp_max: '',
    valor: '',
    valorFormatado: '',
    descricao: ''
  })

  // Função para formatar valor em moeda brasileira
  const formatarMoeda = (valor) => {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  // Função para converter string formatada em número
  const parseMoeda = (valorFormatado) => {
    if (!valorFormatado) return ''
    // Remove pontos de milhar e troca vírgula por ponto
    const numero = valorFormatado.replace(/\./g, '').replace(',', '.')
    return numero
  }

  // Handler para campo de moeda
  const handleMoedaChange = (e) => {
    let valor = e.target.value
    // Remove tudo exceto números e vírgula
    valor = valor.replace(/[^\d,]/g, '')
    // Garante apenas uma vírgula
    const partes = valor.split(',')
    if (partes.length > 2) {
      valor = partes[0] + ',' + partes.slice(1).join('')
    }
    // Limita casas decimais a 2
    if (partes.length === 2 && partes[1].length > 2) {
      valor = partes[0] + ',' + partes[1].substring(0, 2)
    }
    setFormData({ ...formData, valorFormatado: valor, valor: parseMoeda(valor) })
  }

  // Buscar faixas
  const { data: faixas, isLoading } = useQuery({
    queryKey: ['faixas-preco-venda'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faixas_preco_venda')
        .select('*')
        .eq('ativo', true)
        .order('kwp_min', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingFaixa) {
        const { error } = await supabase
          .from('faixas_preco_venda')
          .update(data)
          .eq('id', editingFaixa.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('faixas_preco_venda')
          .insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faixas-preco-venda'])
      toast.success(editingFaixa ? 'Faixa atualizada!' : 'Faixa criada!')
      closeModal()
    },
    onError: (error) => {
      toast.error('Erro ao salvar: ' + error.message)
    }
  })

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('faixas_preco_venda')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faixas-preco-venda'])
      toast.success('Faixa removida!')
      setDeleteModal({ open: false, faixa: null })
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message)
    }
  })

  const openModal = (faixa = null) => {
    if (faixa) {
      setEditingFaixa(faixa)
      setFormData({
        kwp_min: faixa.kwp_min?.toString() || '',
        kwp_max: faixa.kwp_max?.toString() || '',
        valor: faixa.valor?.toString() || '',
        valorFormatado: formatarMoeda(faixa.valor) || '',
        descricao: faixa.descricao || ''
      })
    } else {
      setEditingFaixa(null)
      setFormData({
        kwp_min: '',
        kwp_max: '',
        valor: '',
        valorFormatado: '',
        descricao: ''
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingFaixa(null)
    setFormData({
      kwp_min: '',
      kwp_max: '',
      valor: '',
      valorFormatado: '',
      descricao: ''
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.kwp_min || !formData.kwp_max || !formData.valor) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    saveMutation.mutate({
      kwp_min: parseFloat(formData.kwp_min),
      kwp_max: parseFloat(formData.kwp_max),
      valor: parseFloat(formData.valor),
      descricao: formData.descricao || null
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const filtered = faixas?.filter(f =>
    f.descricao?.toLowerCase().includes(search.toLowerCase()) ||
    f.kwp_min?.toString().includes(search) ||
    f.kwp_max?.toString().includes(search)
  )

  // Calcular totais
  const totalFaixas = faixas?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Faixas de Preço - Venda</h1>
          <p className="text-gray-600">Valores cobrados do cliente por potência (kWp)</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Faixa
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalFaixas}</p>
              <p className="text-sm text-gray-500">Faixas Cadastradas</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {faixas?.[0]?.kwp_min || 0} - {faixas?.[faixas.length - 1]?.kwp_max || 0}
              </p>
              <p className="text-sm text-gray-500">Range kWp</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(faixas?.[faixas?.length - 1]?.valor)}
              </p>
              <p className="text-sm text-gray-500">Maior Valor</p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar faixa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Tabela */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma faixa cadastrada</p>
            <button onClick={() => openModal()} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Adicionar Faixa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Faixa (kWp)</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor Venda</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">R$/kWp</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((faixa) => (
                  <tr key={faixa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                          <Zap className="w-4 h-4 text-green-600" />
                        </div>
                        <span className="font-medium text-gray-900">
                          {faixa.kwp_min} - {faixa.kwp_max} kWp
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {faixa.descricao || '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-bold text-green-600">
                        {formatCurrency(faixa.valor)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500">
                      {formatCurrency(faixa.valor / faixa.kwp_max)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openModal(faixa)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteModal({ open: true, faixa })}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                          title="Remover"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Cadastro/Edição */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-green-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingFaixa ? 'Editar Faixa' : 'Nova Faixa de Venda'}
                </h2>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">kWp Mínimo *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.kwp_min}
                    onChange={(e) => setFormData({ ...formData, kwp_min: e.target.value })}
                    className="input-field"
                    placeholder="0.00"
                    required
                  />
                </div>
                <div>
                  <label className="label">kWp Máximo *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.kwp_max}
                    onChange={(e) => setFormData({ ...formData, kwp_max: e.target.value })}
                    className="input-field"
                    placeholder="10.00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Valor de Venda *</label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-500 font-medium">R$</span>
                  <input
                    type="text"
                    value={formData.valorFormatado}
                    onChange={handleMoedaChange}
                    className="input-field flex-1"
                    placeholder="1.500,00"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="label">Descrição</label>
                <input
                  type="text"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Até 16 placas (9,36 kWp)"
                />
              </div>

              {formData.kwp_max && formData.valor && (
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    <strong>Valor por kWp:</strong> {formatCurrency(parseFloat(formData.valor) / parseFloat(formData.kwp_max))}
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="btn-primary flex-1"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : editingFaixa ? 'Salvar' : 'Criar Faixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Remover Faixa</h2>
              </div>
              <button onClick={() => setDeleteModal({ open: false, faixa: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600">
                Tem certeza que deseja remover a faixa <strong>{deleteModal.faixa?.kwp_min} - {deleteModal.faixa?.kwp_max} kWp</strong>?
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDeleteModal({ open: false, faixa: null })}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModal.faixa?.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FaixasPrecoVenda
