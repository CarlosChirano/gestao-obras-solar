import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  Wrench,
  Edit,
  Trash2,
  X,
  DollarSign,
  TrendingUp,
  Package
} from 'lucide-react'
import toast from 'react-hot-toast'

const ServicosExtras = () => {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingServico, setEditingServico] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, servico: null })
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    valor_venda: '',
    valor_venda_formatado: '',
    valor_custo: '',
    valor_custo_formatado: '',
    unidade: 'unidade'
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

  // Handler para campo de moeda - Venda
  const handleMoedaVendaChange = (e) => {
    let valor = e.target.value
    valor = valor.replace(/[^\d,]/g, '')
    const partes = valor.split(',')
    if (partes.length > 2) {
      valor = partes[0] + ',' + partes.slice(1).join('')
    }
    if (partes.length === 2 && partes[1].length > 2) {
      valor = partes[0] + ',' + partes[1].substring(0, 2)
    }
    setFormData({ ...formData, valor_venda_formatado: valor, valor_venda: parseMoeda(valor) })
  }

  // Handler para campo de moeda - Custo
  const handleMoedaCustoChange = (e) => {
    let valor = e.target.value
    valor = valor.replace(/[^\d,]/g, '')
    const partes = valor.split(',')
    if (partes.length > 2) {
      valor = partes[0] + ',' + partes.slice(1).join('')
    }
    if (partes.length === 2 && partes[1].length > 2) {
      valor = partes[0] + ',' + partes[1].substring(0, 2)
    }
    setFormData({ ...formData, valor_custo_formatado: valor, valor_custo: parseMoeda(valor) })
  }

  // Buscar serviços
  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos-extras'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos_extras')
        .select('*')
        .eq('ativo', true)
        .order('nome', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingServico) {
        const { error } = await supabase
          .from('servicos_extras')
          .update(data)
          .eq('id', editingServico.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('servicos_extras')
          .insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos-extras'])
      toast.success(editingServico ? 'Serviço atualizado!' : 'Serviço criado!')
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
        .from('servicos_extras')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos-extras'])
      toast.success('Serviço removido!')
      setDeleteModal({ open: false, servico: null })
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message)
    }
  })

  const openModal = (servico = null) => {
    if (servico) {
      setEditingServico(servico)
      setFormData({
        nome: servico.nome || '',
        descricao: servico.descricao || '',
        valor_venda: servico.valor_venda?.toString() || '',
        valor_venda_formatado: formatarMoeda(servico.valor_venda) || '',
        valor_custo: servico.valor_custo?.toString() || '',
        valor_custo_formatado: formatarMoeda(servico.valor_custo) || '',
        unidade: servico.unidade || 'unidade'
      })
    } else {
      setEditingServico(null)
      setFormData({
        nome: '',
        descricao: '',
        valor_venda: '',
        valor_venda_formatado: '',
        valor_custo: '',
        valor_custo_formatado: '',
        unidade: 'unidade'
      })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingServico(null)
    setFormData({
      nome: '',
      descricao: '',
      valor_venda: '',
      valor_venda_formatado: '',
      valor_custo: '',
      valor_custo_formatado: '',
      unidade: 'unidade'
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.nome || !formData.valor_venda || !formData.valor_custo) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    saveMutation.mutate({
      nome: formData.nome,
      descricao: formData.descricao || null,
      valor_venda: parseFloat(formData.valor_venda),
      valor_custo: parseFloat(formData.valor_custo),
      unidade: formData.unidade
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  const calcularMargem = (venda, custo) => {
    if (!venda || venda === 0) return 0
    return ((venda - custo) / venda * 100).toFixed(1)
  }

  const filtered = servicos?.filter(s =>
    s.nome?.toLowerCase().includes(search.toLowerCase()) ||
    s.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  // Calcular totais
  const totalServicos = servicos?.length || 0

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços Extras</h1>
          <p className="text-gray-600">Serviços avulsos com preço de venda e custo</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Serviço
        </button>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
              <Wrench className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalServicos}</p>
              <p className="text-sm text-gray-500">Serviços Cadastrados</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(servicos?.reduce((sum, s) => sum + (s.valor_venda || 0), 0) / (totalServicos || 1))}
              </p>
              <p className="text-sm text-gray-500">Ticket Médio Venda</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-blue-600">
                ~30%
              </p>
              <p className="text-sm text-gray-500">Margem Média</p>
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
            placeholder="Buscar serviço..."
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
            <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum serviço cadastrado</p>
            <button onClick={() => openModal()} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Adicionar Serviço
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Serviço</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Unidade</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor Venda</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Custo</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Margem</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((servico) => {
                  const margem = calcularMargem(servico.valor_venda, servico.valor_custo)
                  return (
                    <tr key={servico.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                            <Wrench className="w-5 h-5 text-purple-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{servico.nome}</p>
                            {servico.descricao && (
                              <p className="text-sm text-gray-500">{servico.descricao}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                          {servico.unidade}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-bold text-green-600">
                          {formatCurrency(servico.valor_venda)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-orange-600">
                          {formatCurrency(servico.valor_custo)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-bold ${parseFloat(margem) >= 20 ? 'text-green-600' : 'text-red-600'}`}>
                          {margem}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openModal(servico)}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Editar"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteModal({ open: true, servico })}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                            title="Remover"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
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
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <Wrench className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {editingServico ? 'Editar Serviço' : 'Novo Serviço Extra'}
                </h2>
              </div>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="label">Nome do Serviço *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Troca de Inversor"
                  required
                />
              </div>

              <div>
                <label className="label">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field"
                  placeholder="Descrição do serviço..."
                  rows={2}
                />
              </div>

              <div>
                <label className="label">Unidade</label>
                <select
                  value={formData.unidade}
                  onChange={(e) => setFormData({ ...formData, unidade: e.target.value })}
                  className="input-field"
                >
                  <option value="unidade">Unidade</option>
                  <option value="metro">Metro</option>
                  <option value="hora">Hora</option>
                  <option value="dia">Dia</option>
                  <option value="m²">M²</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Valor de Venda (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={formData.valor_venda_formatado}
                      onChange={handleMoedaVendaChange}
                      className="input-field pl-10"
                      placeholder="350,00"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="label">Custo (R$) *</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">R$</span>
                    <input
                      type="text"
                      value={formData.valor_custo_formatado}
                      onChange={handleMoedaCustoChange}
                      className="input-field pl-10"
                      placeholder="245,00"
                      required
                    />
                  </div>
                </div>
              </div>

              {formData.valor_venda && formData.valor_custo && (
                <div className="p-3 bg-blue-50 rounded-lg">
                  <div className="flex justify-between text-sm">
                    <span className="text-blue-700">Lucro:</span>
                    <span className="font-bold text-green-600">
                      {formatCurrency(parseFloat(formData.valor_venda) - parseFloat(formData.valor_custo))}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm mt-1">
                    <span className="text-blue-700">Margem:</span>
                    <span className="font-bold text-blue-600">
                      {calcularMargem(parseFloat(formData.valor_venda), parseFloat(formData.valor_custo))}%
                    </span>
                  </div>
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
                  ) : editingServico ? 'Salvar' : 'Criar Serviço'}
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
                <h2 className="text-lg font-semibold text-gray-900">Remover Serviço</h2>
              </div>
              <button onClick={() => setDeleteModal({ open: false, servico: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600">
                Tem certeza que deseja remover o serviço <strong>{deleteModal.servico?.nome}</strong>?
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDeleteModal({ open: false, servico: null })}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModal.servico?.id)}
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

export default ServicosExtras
