import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, Search, Loader2, Wallet, Edit, Trash2, X, TrendingDown, Sun, Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const FaixasPrecoCusto = () => {
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingFaixa, setEditingFaixa] = useState(null)
  const [deleteModal, setDeleteModal] = useState({ open: false, faixa: null })
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    placas_min: '',
    placas_max: '',
    valor_por_placa: '',
    valorFormatado: '',
    descricao: ''
  })

  const formatarMoeda = (valor) => {
    if (!valor) return ''
    const numero = parseFloat(valor)
    if (isNaN(numero)) return ''
    return numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const parseMoeda = (valorFormatado) => {
    if (!valorFormatado) return ''
    return valorFormatado.replace(/\./g, '').replace(',', '.')
  }

  const handleMoedaChange = (e) => {
    let valor = e.target.value
    valor = valor.replace(/[^0-9,]/g, '')
    const partes = valor.split(',')
    if (partes.length > 2) {
      valor = partes[0] + ',' + partes.slice(1).join('')
    }
    if (partes[1] && partes[1].length > 2) {
      valor = partes[0] + ',' + partes[1].substring(0, 2)
    }
    setFormData({ ...formData, valorFormatado: valor, valor_por_placa: parseMoeda(valor) })
  }

  const { data: faixas, isLoading } = useQuery({
    queryKey: ['faixas-preco-custo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('faixas_preco_custo')
        .select('*')
        .eq('ativo', true)
        .not('placas_min', 'is', null)
        .order('placas_min', { ascending: true })
      if (error) throw error
      return data
    }
  })

  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingFaixa) {
        const { error } = await supabase.from('faixas_preco_custo').update(data).eq('id', editingFaixa.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('faixas_preco_custo').insert(data)
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faixas-preco-custo'])
      toast.success(editingFaixa ? 'Faixa atualizada!' : 'Faixa criada!')
      closeModal()
    },
    onError: (error) => toast.error('Erro ao salvar: ' + error.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from('faixas_preco_custo').update({ ativo: false }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['faixas-preco-custo'])
      toast.success('Faixa removida!')
      setDeleteModal({ open: false, faixa: null })
    },
    onError: (error) => toast.error('Erro ao remover: ' + error.message)
  })

  const openModal = (faixa = null) => {
    if (faixa) {
      setEditingFaixa(faixa)
      setFormData({
        placas_min: faixa.placas_min?.toString() || '',
        placas_max: faixa.placas_max?.toString() || '',
        valor_por_placa: faixa.valor_por_placa?.toString() || '',
        valorFormatado: formatarMoeda(faixa.valor_por_placa) || '',
        descricao: faixa.descricao || ''
      })
    } else {
      setEditingFaixa(null)
      setFormData({ placas_min: '', placas_max: '', valor_por_placa: '', valorFormatado: '', descricao: '' })
    }
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditingFaixa(null)
    setFormData({ placas_min: '', placas_max: '', valor_por_placa: '', valorFormatado: '', descricao: '' })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.placas_min || !formData.placas_max || !formData.valor_por_placa) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }
    const placasMax = parseInt(formData.placas_max)
    const valorPlaca = parseFloat(formData.valor_por_placa)
    saveMutation.mutate({
      placas_min: parseInt(formData.placas_min),
      placas_max: placasMax,
      valor_por_placa: valorPlaca,
      valor: placasMax <= 9998 ? placasMax * valorPlaca : null,
      kwp_min: 0,
      kwp_max: 0,
      descricao: formData.descricao || null
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const filtered = faixas?.filter(f => {
    if (!search) return true
    return (
      f.placas_min?.toString().includes(search) ||
      f.placas_max?.toString().includes(search) ||
      f.descricao?.toLowerCase().includes(search.toLowerCase())
    )
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Custo Equipe por Placa</h1>
          <p className="text-gray-600">Custo de mão de obra da equipe por placa instalada</p>
        </div>
        <button onClick={() => openModal()} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Faixa
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
            <Users className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">{faixas?.length || 0}</p>
            <p className="text-sm text-gray-500">Faixas Cadastradas</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Sun className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900">
              {faixas?.[0]?.placas_min || 0} - {faixas?.[faixas.length - 1]?.placas_max === 9999 ? '∞' : faixas?.[faixas.length - 1]?.placas_max || 0}
            </p>
            <p className="text-sm text-gray-500">Range Placas</p>
          </div>
        </div>
        <div className="card !p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
            <TrendingDown className="w-5 h-5 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(faixas?.reduce((max, f) => Math.max(max, f.valor_por_placa || 0), 0))}
            </p>
            <p className="text-sm text-gray-500">Maior R$/placa</p>
          </div>
        </div>
      </div>

      <div className="card !p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Buscar faixa..." value={search} onChange={(e) => setSearch(e.target.value)} className="input-field !pl-10" />
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : (
        <div className="card !p-0 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Faixa (Placas)</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">R$/Placa</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Custo Máx. Faixa</th>
                <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filtered?.map((faixa) => (
                <tr key={faixa.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                        <Sun className="w-4 h-4 text-orange-600" />
                      </div>
                      <span className="font-medium text-gray-900">
                        {faixa.placas_min} - {faixa.placas_max === 9999 ? '∞' : faixa.placas_max} placas
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{faixa.descricao || '-'}</td>
                  <td className="px-4 py-3 text-right">
                    <span className="font-bold text-orange-600 text-lg">{formatCurrency(faixa.valor_por_placa)}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {faixa.placas_max <= 9998 ? formatCurrency(faixa.placas_max * faixa.valor_por_placa) : 'Variável'}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openModal(faixa)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg" title="Editar">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteModal({ open: true, faixa })} className="p-2 text-red-600 hover:bg-red-50 rounded-lg" title="Remover">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered?.length === 0 && (
            <div className="text-center py-12 text-gray-500">Nenhuma faixa encontrada</div>
          )}
        </div>
      )}

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={closeModal}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-bold text-gray-900">{editingFaixa ? 'Editar Faixa' : 'Nova Faixa de Custo'}</h2>
              <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Placas Mín. *</label>
                  <input type="number" min="1" required value={formData.placas_min}
                    onChange={(e) => setFormData({ ...formData, placas_min: e.target.value })}
                    className="input-field" placeholder="Ex: 9" />
                </div>
                <div>
                  <label className="label">Placas Máx. *</label>
                  <input type="number" min="1" required value={formData.placas_max}
                    onChange={(e) => setFormData({ ...formData, placas_max: e.target.value })}
                    className="input-field" placeholder="Ex: 16" />
                  <p className="text-xs text-gray-400 mt-1">Use 9999 para "sem limite"</p>
                </div>
              </div>
              <div>
                <label className="label">Custo por Placa (R$) *</label>
                <input type="text" required value={formData.valorFormatado} onChange={handleMoedaChange}
                  className="input-field text-lg font-bold text-orange-600" placeholder="88,00" />
              </div>
              <div>
                <label className="label">Descrição</label>
                <input type="text" value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field" placeholder="Ex: 9 a 16 placas" />
              </div>
              {formData.placas_max && formData.valor_por_placa && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <p className="text-sm text-orange-700">
                    <strong>Custo máx. da faixa:</strong> {formatCurrency(parseFloat(formData.placas_max) * parseFloat(formData.valor_por_placa))}
                  </p>
                </div>
              )}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={closeModal} className="btn-secondary flex-1">Cancelar</button>
                <button type="submit" disabled={saveMutation.isLoading} className="btn-primary flex-1">
                  {saveMutation.isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
                  {editingFaixa ? 'Atualizar' : 'Criar Faixa'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de exclusão */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setDeleteModal({ open: false, faixa: null })}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <div className="p-6 text-center">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Remover Faixa</h3>
              <p className="text-gray-600">
                Tem certeza que deseja remover a faixa <strong>{deleteModal.faixa?.placas_min} - {deleteModal.faixa?.placas_max === 9999 ? '∞' : deleteModal.faixa?.placas_max} placas</strong>?
              </p>
            </div>
            <div className="flex gap-3 p-6 border-t">
              <button onClick={() => setDeleteModal({ open: false, faixa: null })} className="btn-secondary flex-1">Cancelar</button>
              <button onClick={() => deleteMutation.mutate(deleteModal.faixa?.id)} disabled={deleteMutation.isLoading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                {deleteMutation.isLoading ? 'Removendo...' : 'Remover'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default FaixasPrecoCusto
