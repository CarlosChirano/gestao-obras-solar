import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  Building,
  Edit,
  Trash2,
  X,
  Save,
  Phone,
  Mail,
  MapPin
} from 'lucide-react'
import toast from 'react-hot-toast'

const EmpresasContratantes = () => {
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingEmpresa, setEditingEmpresa] = useState(null)
  
  const queryClient = useQueryClient()

  const { data: empresas, isLoading } = useQuery({
    queryKey: ['empresas-contratantes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_contratantes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const filtered = empresas?.filter(e =>
    e.nome?.toLowerCase().includes(search.toLowerCase()) ||
    e.cnpj?.includes(search) ||
    e.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('empresas_contratantes')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['empresas-contratantes'])
      toast.success('Empresa excluída!')
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const handleEdit = (empresa) => {
    setEditingEmpresa(empresa)
    setShowModal(true)
  }

  const handleNew = () => {
    setEditingEmpresa(null)
    setShowModal(true)
  }

  const handleDelete = (id) => {
    if (confirm('Deseja excluir esta empresa?')) {
      deleteMutation.mutate(id)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas Contratantes</h1>
          <p className="text-gray-600">Gerencie as empresas que contratam seus serviços</p>
        </div>
        <button onClick={handleNew} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Empresa
        </button>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, CNPJ ou cidade..."
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
            <Building className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma empresa encontrada</p>
            <button onClick={handleNew} className="btn-primary mt-4">
              <Plus className="w-5 h-5" /> Adicionar Empresa
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Empresa</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">CNPJ</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Cidade</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{empresa.nome}</p>
                          {empresa.razao_social && (
                            <p className="text-xs text-gray-500">{empresa.razao_social}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{empresa.cnpj || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="space-y-1">
                        {empresa.telefone && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Phone className="w-3 h-3" />
                            {empresa.telefone}
                          </div>
                        )}
                        {empresa.email && (
                          <div className="flex items-center gap-1 text-sm text-gray-600">
                            <Mail className="w-3 h-3" />
                            {empresa.email}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {empresa.cidade ? (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <MapPin className="w-3 h-3" />
                          {empresa.cidade}{empresa.estado && `/${empresa.estado}`}
                        </div>
                      ) : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(empresa)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(empresa.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
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

      {/* Modal */}
      {showModal && (
        <EmpresaModal
          empresa={editingEmpresa}
          onClose={() => {
            setShowModal(false)
            setEditingEmpresa(null)
          }}
          onSave={() => {
            queryClient.invalidateQueries(['empresas-contratantes'])
            setShowModal(false)
            setEditingEmpresa(null)
          }}
        />
      )}
    </div>
  )
}

// Modal de Criação/Edição
const EmpresaModal = ({ empresa, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: empresa?.nome || '',
    razao_social: empresa?.razao_social || '',
    cnpj: empresa?.cnpj || '',
    inscricao_estadual: empresa?.inscricao_estadual || '',
    telefone: empresa?.telefone || '',
    email: empresa?.email || '',
    endereco: empresa?.endereco || '',
    cidade: empresa?.cidade || '',
    estado: empresa?.estado || '',
    cep: empresa?.cep || '',
    observacoes: empresa?.observacoes || ''
  })

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      if (empresa) {
        const { error } = await supabase
          .from('empresas_contratantes')
          .update(formData)
          .eq('id', empresa.id)
        if (error) throw error
        toast.success('Empresa atualizada!')
      } else {
        const { error } = await supabase
          .from('empresas_contratantes')
          .insert([formData])
        if (error) throw error
        toast.success('Empresa criada!')
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
            {empresa ? 'Editar Empresa' : 'Nova Empresa Contratante'}
          </h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome Fantasia *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className="input-field"
                placeholder="Nome da empresa"
                required
              />
            </div>
            <div>
              <label className="label">Razão Social</label>
              <input
                type="text"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">CNPJ</label>
              <input
                type="text"
                value={formData.cnpj}
                onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                className="input-field"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <div>
              <label className="label">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.inscricao_estadual}
                onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                className="input-field"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="label">Endereço</label>
                <input
                  type="text"
                  value={formData.endereco}
                  onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                  className="input-field"
                  placeholder="Rua, número, bairro"
                />
              </div>
              <div>
                <label className="label">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Estado</label>
                <select
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value })}
                  className="input-field"
                >
                  <option value="">Selecione...</option>
                  {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="label">CEP</label>
                <input
                  type="text"
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                  className="input-field"
                  placeholder="00000-000"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              value={formData.observacoes}
              onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Observações sobre a empresa..."
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

export default EmpresasContratantes
