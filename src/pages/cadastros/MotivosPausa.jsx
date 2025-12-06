import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  PauseCircle, 
  Edit,
  Trash2,
  X,
  Save,
  CloudRain,
  Package,
  FileEdit,
  ZapOff,
  UserX,
  XCircle,
  Clock,
  AlertTriangle,
  MoreHorizontal
} from 'lucide-react'
import toast from 'react-hot-toast'

// Mapeamento de ícones disponíveis
const ICONES_DISPONIVEIS = [
  { value: 'cloud-rain', label: 'Chuva', icon: CloudRain },
  { value: 'package', label: 'Pacote/Material', icon: Package },
  { value: 'file-edit', label: 'Edição/Projeto', icon: FileEdit },
  { value: 'zap-off', label: 'Sem Energia', icon: ZapOff },
  { value: 'user-x', label: 'Pessoa Ausente', icon: UserX },
  { value: 'x-circle', label: 'Cancelado', icon: XCircle },
  { value: 'clock', label: 'Aguardando', icon: Clock },
  { value: 'alert-triangle', label: 'Alerta/Problema', icon: AlertTriangle },
  { value: 'pause-circle', label: 'Pausa Geral', icon: PauseCircle },
  { value: 'more-horizontal', label: 'Outros', icon: MoreHorizontal },
]

const CORES_DISPONIVEIS = [
  { value: '#3B82F6', label: 'Azul' },
  { value: '#22C55E', label: 'Verde' },
  { value: '#EF4444', label: 'Vermelho' },
  { value: '#F59E0B', label: 'Amarelo' },
  { value: '#8B5CF6', label: 'Roxo' },
  { value: '#EC4899', label: 'Rosa' },
  { value: '#F97316', label: 'Laranja' },
  { value: '#6B7280', label: 'Cinza' },
  { value: '#14B8A6', label: 'Teal' },
  { value: '#DC2626', label: 'Vermelho Escuro' },
]

const MotivosPausa = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingMotivo, setEditingMotivo] = useState(null)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    icone: 'pause-circle',
    cor: '#6B7280'
  })
  
  const queryClient = useQueryClient()

  // Buscar motivos de pausa
  const { data: motivos, isLoading } = useQuery({
    queryKey: ['motivos-pausa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_pausa')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Filtrar motivos
  const filtered = motivos?.filter(m =>
    m.nome?.toLowerCase().includes(search.toLowerCase()) ||
    m.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  // Mutation para salvar
  const saveMutation = useMutation({
    mutationFn: async (data) => {
      if (editingMotivo) {
        const { error } = await supabase
          .from('motivos_pausa')
          .update(data)
          .eq('id', editingMotivo.id)
        if (error) throw error
      } else {
        const { error } = await supabase
          .from('motivos_pausa')
          .insert([data])
        if (error) throw error
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['motivos-pausa'])
      toast.success(editingMotivo ? 'Motivo atualizado!' : 'Motivo cadastrado!')
      handleCloseModal()
    },
    onError: () => toast.error('Erro ao salvar motivo')
  })

  // Mutation para excluir
  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('motivos_pausa')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['motivos-pausa'])
      toast.success('Motivo excluído!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const handleOpenModal = (motivo = null) => {
    if (motivo) {
      setEditingMotivo(motivo)
      setFormData({
        nome: motivo.nome || '',
        descricao: motivo.descricao || '',
        icone: motivo.icone || 'pause-circle',
        cor: motivo.cor || '#6B7280'
      })
    } else {
      setEditingMotivo(null)
      setFormData({
        nome: '',
        descricao: '',
        icone: 'pause-circle',
        cor: '#6B7280'
      })
    }
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingMotivo(null)
    setFormData({
      nome: '',
      descricao: '',
      icone: 'pause-circle',
      cor: '#6B7280'
    })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!formData.nome.trim()) {
      toast.error('Digite o nome do motivo')
      return
    }
    saveMutation.mutate(formData)
  }

  const handleDelete = (motivo) => {
    if (confirm(`Deseja excluir o motivo "${motivo.nome}"?`)) {
      deleteMutation.mutate(motivo.id)
    }
  }

  // Função para pegar o componente de ícone pelo valor
  const getIconComponent = (iconValue) => {
    const found = ICONES_DISPONIVEIS.find(i => i.value === iconValue)
    return found?.icon || PauseCircle
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Motivos de Pausa</h1>
          <p className="text-gray-500 mt-1">Cadastre os motivos de pausa para as ordens de serviço</p>
        </div>
        <button onClick={() => handleOpenModal()} className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Motivo
        </button>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar motivos..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-field pl-12"
        />
      </div>

      {/* Lista de Motivos */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="card text-center py-12">
          <PauseCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum motivo encontrado</h3>
          <p className="text-gray-500 mb-4">Cadastre motivos de pausa para usar nas ordens de serviço</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Plus className="w-5 h-5" /> Cadastrar Motivo
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered?.map((motivo) => {
            const IconComponent = getIconComponent(motivo.icone)
            return (
              <div 
                key={motivo.id} 
                className="card hover:shadow-lg transition-all"
                style={{ borderLeftWidth: '4px', borderLeftColor: motivo.cor }}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: `${motivo.cor}20` }}
                    >
                      <IconComponent className="w-6 h-6" style={{ color: motivo.cor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{motivo.nome}</h3>
                      {motivo.descricao && (
                        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{motivo.descricao}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleOpenModal(motivo)}
                      className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(motivo)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Cadastro/Edição */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {editingMotivo ? 'Editar Motivo' : 'Novo Motivo de Pausa'}
              </h2>
              <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {/* Nome */}
              <div>
                <label className="label">Nome *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  className="input-field"
                  placeholder="Ex: Chuva forte"
                  required
                />
              </div>

              {/* Descrição */}
              <div>
                <label className="label">Descrição</label>
                <textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="input-field"
                  rows={2}
                  placeholder="Descrição opcional do motivo..."
                />
              </div>

              {/* Ícone */}
              <div>
                <label className="label">Ícone</label>
                <div className="grid grid-cols-5 gap-2">
                  {ICONES_DISPONIVEIS.map((icone) => {
                    const IconComp = icone.icon
                    const isSelected = formData.icone === icone.value
                    return (
                      <button
                        key={icone.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, icone: icone.value })}
                        className={`p-3 rounded-xl flex items-center justify-center transition-all ${
                          isSelected 
                            ? 'bg-blue-100 ring-2 ring-blue-500' 
                            : 'bg-gray-100 hover:bg-gray-200'
                        }`}
                        title={icone.label}
                      >
                        <IconComp className={`w-5 h-5 ${isSelected ? 'text-blue-600' : 'text-gray-600'}`} />
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Cor */}
              <div>
                <label className="label">Cor</label>
                <div className="grid grid-cols-5 gap-2">
                  {CORES_DISPONIVEIS.map((cor) => {
                    const isSelected = formData.cor === cor.value
                    return (
                      <button
                        key={cor.value}
                        type="button"
                        onClick={() => setFormData({ ...formData, cor: cor.value })}
                        className={`w-full h-10 rounded-xl transition-all ${
                          isSelected ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                        }`}
                        style={{ backgroundColor: cor.value }}
                        title={cor.label}
                      />
                    )
                  })}
                </div>
              </div>

              {/* Preview */}
              <div className="pt-4 border-t">
                <label className="label text-xs text-gray-400">Preview</label>
                <div 
                  className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: `${formData.cor}15` }}
                >
                  {(() => {
                    const IconPreview = getIconComponent(formData.icone)
                    return (
                      <div 
                        className="w-10 h-10 rounded-lg flex items-center justify-center"
                        style={{ backgroundColor: `${formData.cor}30` }}
                      >
                        <IconPreview className="w-5 h-5" style={{ color: formData.cor }} />
                      </div>
                    )
                  })()}
                  <span className="font-medium" style={{ color: formData.cor }}>
                    {formData.nome || 'Nome do motivo'}
                  </span>
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={handleCloseModal} className="btn-secondary flex-1">
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={saveMutation.isPending} 
                  className="btn-primary flex-1"
                >
                  {saveMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Save className="w-5 h-5" />
                  )}
                  {saveMutation.isPending ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default MotivosPausa
