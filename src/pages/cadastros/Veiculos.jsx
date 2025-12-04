import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  Car,
  Edit,
  Trash2,
  X,
  Save,
  Calendar,
  Fuel,
  Gauge
} from 'lucide-react'
import toast from 'react-hot-toast'

const Veiculos = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingVeiculo, setEditingVeiculo] = useState(null)
  
  const queryClient = useQueryClient()

  const { data: veiculos, isLoading } = useQuery({
    queryKey: ['veiculos'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('*')
        .eq('ativo', true)
        .order('placa')
      if (error) throw error
      return data
    }
  })

  const filtered = veiculos?.filter(v =>
    v.placa?.toLowerCase().includes(search.toLowerCase()) ||
    v.modelo?.toLowerCase().includes(search.toLowerCase()) ||
    v.marca?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('veiculos')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['veiculos'])
      toast.success('Veículo excluído!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const handleEdit = (veiculo) => {
    setEditingVeiculo(veiculo)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingVeiculo(null)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Deseja excluir este veículo?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Veículos</h1>
          <p className="text-gray-600">Gerencie a frota de veículos</p>
        </div>
        <button onClick={handleNew} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Veículo
        </button>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por placa, modelo ou marca..."
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
            <Car className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum veículo encontrado</p>
            <button onClick={handleNew} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Adicionar Veículo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((veiculo) => (
              <div key={veiculo.id} className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                      <Car className="w-6 h-6 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-lg text-gray-900">{veiculo.placa}</p>
                      <p className="text-sm text-gray-600">
                        {veiculo.marca} {veiculo.modelo}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEdit(veiculo)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(veiculo.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  {veiculo.ano && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <span>Ano: {veiculo.ano}</span>
                    </div>
                  )}
                  {veiculo.cor && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <div 
                        className="w-4 h-4 rounded-full border border-gray-300"
                        style={{ backgroundColor: getCorHex(veiculo.cor) }}
                      />
                      <span>Cor: {veiculo.cor}</span>
                    </div>
                  )}
                  {veiculo.combustivel && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Fuel className="w-4 h-4" />
                      <span>{veiculo.combustivel}</span>
                    </div>
                  )}
                  {veiculo.km_atual && (
                    <div className="flex items-center gap-2 text-gray-600">
                      <Gauge className="w-4 h-4" />
                      <span>{Number(veiculo.km_atual).toLocaleString('pt-BR')} km</span>
                    </div>
                  )}
                </div>

                {veiculo.renavam && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <p className="text-xs text-gray-500">RENAVAM: {veiculo.renavam}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <VeiculoModal
          veiculo={editingVeiculo}
          onClose={() => {
            setShowModal(false)
            setEditingVeiculo(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries(['veiculos'])
            setShowModal(false)
            setEditingVeiculo(null)
          }}
        />
      )}
    </div>
  )
}

// Função auxiliar para cor
const getCorHex = (cor) => {
  const cores = {
    branco: '#ffffff',
    preto: '#000000',
    prata: '#c0c0c0',
    cinza: '#808080',
    vermelho: '#dc2626',
    azul: '#2563eb',
    verde: '#16a34a',
    amarelo: '#eab308',
    laranja: '#ea580c',
    marrom: '#78350f'
  }
  return cores[cor?.toLowerCase()] || '#9ca3af'
}

// Modal de Criação/Edição
const VeiculoModal = ({ veiculo, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    placa: veiculo?.placa || '',
    marca: veiculo?.marca || '',
    modelo: veiculo?.modelo || '',
    ano: veiculo?.ano || '',
    cor: veiculo?.cor || '',
    combustivel: veiculo?.combustivel || '',
    renavam: veiculo?.renavam || '',
    chassi: veiculo?.chassi || '',
    km_atual: veiculo?.km_atual || '',
    observacoes: veiculo?.observacoes || ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.placa.trim()) {
      toast.error('Placa é obrigatória')
      return
    }

    setLoading(true)

    try {
      const dataToSave = {
        ...formData,
        ano: formData.ano ? parseInt(formData.ano) : null,
        km_atual: formData.km_atual ? parseInt(formData.km_atual) : null
      }

      if (veiculo) {
        const { error } = await supabase
          .from('veiculos')
          .update(dataToSave)
          .eq('id', veiculo.id)
        if (error) throw error
        toast.success('Veículo atualizado!')
      } else {
        const { error } = await supabase
          .from('veiculos')
          .insert([dataToSave])
        if (error) throw error
        toast.success('Veículo criado!')
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
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">
            {veiculo ? 'Editar Veículo' : 'Novo Veículo'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Placa *</label>
              <input
                type="text"
                value={formData.placa}
                onChange={(e) => setFormData({ ...formData, placa: e.target.value.toUpperCase() })}
                className="input-field"
                placeholder="ABC-1234"
                required
              />
            </div>
            <div>
              <label className="label">Marca</label>
              <input
                type="text"
                value={formData.marca}
                onChange={(e) => setFormData({ ...formData, marca: e.target.value })}
                className="input-field"
                placeholder="Ex: Fiat, VW, Ford"
              />
            </div>
            <div>
              <label className="label">Modelo</label>
              <input
                type="text"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                className="input-field"
                placeholder="Ex: Strada, Saveiro"
              />
            </div>
            <div>
              <label className="label">Ano</label>
              <input
                type="number"
                value={formData.ano}
                onChange={(e) => setFormData({ ...formData, ano: e.target.value })}
                className="input-field"
                placeholder="2024"
                min="1900"
                max="2100"
              />
            </div>
            <div>
              <label className="label">Cor</label>
              <select
                value={formData.cor}
                onChange={(e) => setFormData({ ...formData, cor: e.target.value })}
                className="input-field"
              >
                <option value="">Selecione...</option>
                <option value="Branco">Branco</option>
                <option value="Preto">Preto</option>
                <option value="Prata">Prata</option>
                <option value="Cinza">Cinza</option>
                <option value="Vermelho">Vermelho</option>
                <option value="Azul">Azul</option>
                <option value="Verde">Verde</option>
                <option value="Amarelo">Amarelo</option>
                <option value="Laranja">Laranja</option>
                <option value="Marrom">Marrom</option>
              </select>
            </div>
            <div>
              <label className="label">Combustível</label>
              <select
                value={formData.combustivel}
                onChange={(e) => setFormData({ ...formData, combustivel: e.target.value })}
                className="input-field"
              >
                <option value="">Selecione...</option>
                <option value="Gasolina">Gasolina</option>
                <option value="Etanol">Etanol</option>
                <option value="Flex">Flex</option>
                <option value="Diesel">Diesel</option>
                <option value="GNV">GNV</option>
                <option value="Elétrico">Elétrico</option>
                <option value="Híbrido">Híbrido</option>
              </select>
            </div>
            <div>
              <label className="label">RENAVAM</label>
              <input
                type="text"
                value={formData.renavam}
                onChange={(e) => setFormData({ ...formData, renavam: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Chassi</label>
              <input
                type="text"
                value={formData.chassi}
                onChange={(e) => setFormData({ ...formData, chassi: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">KM Atual</label>
              <input
                type="number"
                value={formData.km_atual}
                onChange={(e) => setFormData({ ...formData, km_atual: e.target.value })}
                className="input-field"
                placeholder="0"
                min="0"
              />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Observações sobre o veículo..."
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

export default Veiculos
