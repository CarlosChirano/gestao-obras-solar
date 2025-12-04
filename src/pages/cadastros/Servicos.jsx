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
  Save,
  DollarSign,
  Clock
} from 'lucide-react'
import toast from 'react-hot-toast'

const Servicos = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingServico, setEditingServico] = useState(null)
  
  const queryClient = useQueryClient()

  const { data: servicos, isLoading } = useQuery({
    queryKey: ['servicos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('servicos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const filtered = servicos?.filter(s =>
    s.nome?.toLowerCase().includes(search.toLowerCase()) ||
    s.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('servicos')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['servicos'])
      toast.success('Serviço excluído!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const handleEdit = (servico) => {
    setEditingServico(servico)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingServico(null)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Deseja excluir este serviço?')) {
      deleteMutation.mutate(id)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Serviços</h1>
          <p className="text-gray-600">Cadastre os serviços oferecidos</p>
        </div>
        <button onClick={handleNew} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Serviço
        </button>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum serviço encontrado</p>
            <button onClick={handleNew} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Adicionar Serviço
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((servico) => (
              <div key={servico.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                      <Wrench className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{servico.nome}</p>
                      {servico.codigo && (
                        <p className="text-xs text-gray-500">Cód: {servico.codigo}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(servico)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(servico.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {servico.descricao && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{servico.descricao}</p>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-1 text-gray-600">
                    <DollarSign className="w-4 h-4" />
                    <span className="font-semibold text-green-600">
                      {formatCurrency(servico.valor_base)}
                    </span>
                  </div>
                  {servico.duracao_estimada && (
                    <div className="flex items-center gap-1 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{servico.duracao_estimada}h</span>
                    </div>
                  )}
                </div>

                {servico.unidade && (
                  <div className="mt-2">
                    <span className="badge badge-gray">{servico.unidade}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <ServicoModal
          servico={editingServico}
          onClose={() => {
            setShowModal(false)
            setEditingServico(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries(['servicos'])
            setShowModal(false)
            setEditingServico(null)
          }}
        />
      )}
    </div>
  )
}

// Modal de Criação/Edição
const ServicoModal = ({ servico, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: servico?.nome || '',
    codigo: servico?.codigo || '',
    descricao: servico?.descricao || '',
    valor_base: servico?.valor_base || '',
    unidade: servico?.unidade || 'unidade',
    duracao_estimada: servico?.duracao_estimada || '',
    observacoes: servico?.observacoes || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        valor_base: formData.valor_base ? parseFloat(formData.valor_base) : null,
        duracao_estimada: formData.duracao_estimada ? parseFloat(formData.duracao_estimada) : null
      }

      if (servico) {
        const { error } = await supabase
          .from('servicos')
          .update(dataToSave)
          .eq('id', servico.id)
        if (error) throw error
        toast.success('Serviço atualizado!')
      } else {
        const { error } = await supabase
          .from('servicos')
          .insert([dataToSave])
        if (error) throw error
        toast.success('Serviço criado!')
      }
      onSave()
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2 className="modal-title">
            {servico ? 'Editar Serviço' : 'Novo Serviço'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome do Serviço *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="input-field"
                placeholder="Ex: Instalação de Sistema Fotovoltaico"
                required
              />
            </div>
            <div>
              <label className="label">Código</label>
              <input
                type="text"
                value={formData.codigo}
                onChange={(e) => setFormData({ ...formData, codigo: e.target.value })}
                className="input-field"
                placeholder="Ex: SRV001"
              />
            </div>
            <div>
              <label className="label">Valor Base (R$)</label>
              <input
                type="number"
                value={formData.valor_base}
                onChange={(e) => setFormData({ ...formData, valor_base: e.target.value })}
                className="input-field"
                placeholder="0,00"
                step="0.01"
                min="0"
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
                <option value="hora">Hora</option>
                <option value="dia">Dia</option>
                <option value="metro">Metro</option>
                <option value="m2">Metro²</option>
                <option value="kWp">kWp</option>
                <option value="modulo">Módulo</option>
                <option value="placa">Placa</option>
              </select>
            </div>
            <div>
              <label className="label">Duração Estimada (horas)</label>
              <input
                type="number"
                value={formData.duracao_estimada}
                onChange={(e) => setFormData({ ...formData, duracao_estimada: e.target.value })}
                className="input-field"
                placeholder="Ex: 8"
                step="0.5"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Descrição</label>
            <textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              className="input-field"
              rows={3}
              placeholder="Descreva o serviço..."
            />
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Observações internas..."
            />
          </div>
        </form>

        <div className="modal-footer">
          <button type="button" onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSubmit} disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default Servicos
