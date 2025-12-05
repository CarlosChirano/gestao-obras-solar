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
  MapPin,
  AlertCircle,
  Check
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// FUNÇÕES DE MÁSCARA
// ============================================

const maskCNPJ = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1/$2')
    .replace(/(\d{4})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 18)
}

const maskPhone = (value) => {
  if (!value) return ''
  const numbers = value.replace(/\D/g, '')
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14)
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15)
}

const maskCEP = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1')
    .slice(0, 10)
}

const isValidEmail = (email) => {
  if (!email) return true // Vazio é permitido
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const isValidCNPJ = (cnpj) => {
  if (!cnpj) return true // Vazio é permitido
  const numbers = cnpj.replace(/\D/g, '')
  
  if (numbers.length !== 14) return false
  if (/^(\d)\1+$/.test(numbers)) return false
  
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += parseInt(numbers[i]) * weights1[i]
  }
  let digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(numbers[12])) return false
  
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  sum = 0
  for (let i = 0; i < 13; i++) {
    sum += parseInt(numbers[i]) * weights2[i]
  }
  digit = sum % 11
  digit = digit < 2 ? 0 : 11 - digit
  if (digit !== parseInt(numbers[13])) return false
  
  return true
}

// Busca CEP via ViaCEP
const fetchAddressByCEP = async (cep) => {
  const numbers = cep.replace(/\D/g, '')
  if (numbers.length !== 8) return null
  
  try {
    const response = await fetch(`https://viacep.com.br/ws/${numbers}/json/`)
    const data = await response.json()
    
    if (data.erro) return null
    
    return {
      endereco: data.logradouro || '',
      bairro: data.bairro || '',
      cidade: data.localidade || '',
      estado: data.uf || ''
    }
  } catch (error) {
    console.error('Erro ao buscar CEP:', error)
    return null
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

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
      <div className="card p-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Nenhuma empresa encontrada</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left p-4 font-medium text-gray-600">Empresa</th>
                  <th className="text-left p-4 font-medium text-gray-600">CNPJ</th>
                  <th className="text-left p-4 font-medium text-gray-600">Contato</th>
                  <th className="text-left p-4 font-medium text-gray-600">Cidade/UF</th>
                  <th className="w-24 p-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered?.map((empresa) => (
                  <tr key={empresa.id} className="hover:bg-gray-50">
                    <td className="p-4">
                      <div className="font-medium text-gray-900">{empresa.nome}</div>
                      {empresa.razao_social && (
                        <div className="text-sm text-gray-500">{empresa.razao_social}</div>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">{empresa.cnpj || '-'}</td>
                    <td className="p-4">
                      {empresa.telefone && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Phone className="w-3 h-3" /> {empresa.telefone}
                        </div>
                      )}
                      {empresa.email && (
                        <div className="flex items-center gap-1 text-sm text-gray-600">
                          <Mail className="w-3 h-3" /> {empresa.email}
                        </div>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">
                      {empresa.cidade && empresa.estado ? `${empresa.cidade}/${empresa.estado}` : '-'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1">
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

// ============================================
// MODAL DE CRIAÇÃO/EDIÇÃO
// ============================================

const EmpresaModal = ({ empresa, onClose, onSave }) => {
  const [loading, setLoading] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const [errors, setErrors] = useState({})
  
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

  // Handlers com máscara
  const handleCNPJChange = (e) => {
    const masked = maskCNPJ(e.target.value)
    setFormData({ ...formData, cnpj: masked })
    
    // Validação
    if (masked.length === 18) {
      setErrors(prev => ({ ...prev, cnpj: !isValidCNPJ(masked) }))
    } else {
      setErrors(prev => ({ ...prev, cnpj: false }))
    }
  }

  const handlePhoneChange = (e) => {
    const masked = maskPhone(e.target.value)
    setFormData({ ...formData, telefone: masked })
  }

  const handleEmailChange = (e) => {
    const value = e.target.value
    setFormData({ ...formData, email: value })
  }

  const handleEmailBlur = () => {
    if (formData.email && !isValidEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: true }))
    } else {
      setErrors(prev => ({ ...prev, email: false }))
    }
  }

  const handleCEPChange = async (e) => {
    const masked = maskCEP(e.target.value)
    setFormData({ ...formData, cep: masked })
    
    // Busca automática quando CEP completo
    if (masked.replace(/\D/g, '').length === 8) {
      setLoadingCEP(true)
      const address = await fetchAddressByCEP(masked)
      setLoadingCEP(false)
      
      if (address) {
        setFormData(prev => ({
          ...prev,
          endereco: address.endereco || prev.endereco,
          cidade: address.cidade || prev.cidade,
          estado: address.estado || prev.estado
        }))
        toast.success('Endereço preenchido automaticamente!')
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.nome.trim()) {
      newErrors.nome = true
      toast.error('Nome é obrigatório')
      return false
    }
    
    if (formData.cnpj && !isValidCNPJ(formData.cnpj)) {
      newErrors.cnpj = true
      toast.error('CNPJ inválido')
      return false
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = true
      toast.error('E-mail inválido')
      return false
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateForm()) return

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
            {/* Nome */}
            <div>
              <label className="label">Nome Fantasia *</label>
              <input
                type="text"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                className={`input-field ${errors.nome ? 'border-red-500' : ''}`}
                placeholder="Nome da empresa"
                required
              />
            </div>
            
            {/* Razão Social */}
            <div>
              <label className="label">Razão Social</label>
              <input
                type="text"
                value={formData.razao_social}
                onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                className="input-field"
              />
            </div>
            
            {/* CNPJ com máscara e validação */}
            <div>
              <label className="label">CNPJ</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.cnpj}
                  onChange={handleCNPJChange}
                  className={`input-field ${errors.cnpj ? 'border-red-500' : ''}`}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                />
                {formData.cnpj && formData.cnpj.length === 18 && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${errors.cnpj ? 'text-red-500' : 'text-green-500'}`}>
                    {errors.cnpj ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </span>
                )}
              </div>
              {errors.cnpj && <p className="text-red-500 text-xs mt-1">CNPJ inválido</p>}
            </div>
            
            {/* Inscrição Estadual */}
            <div>
              <label className="label">Inscrição Estadual</label>
              <input
                type="text"
                value={formData.inscricao_estadual}
                onChange={(e) => setFormData({ ...formData, inscricao_estadual: e.target.value })}
                className="input-field"
              />
            </div>
            
            {/* Telefone com máscara */}
            <div>
              <label className="label">Telefone</label>
              <input
                type="tel"
                value={formData.telefone}
                onChange={handlePhoneChange}
                className="input-field"
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            
            {/* E-mail com validação */}
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  onBlur={handleEmailBlur}
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@empresa.com"
                />
                {formData.email && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-500' : 'text-green-500'}`}>
                    {errors.email ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </span>
                )}
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">E-mail inválido (ex: nome@empresa.com)</p>}
            </div>
          </div>

          <div className="border-t border-gray-200 pt-4 mt-4">
            <h3 className="font-medium text-gray-900 mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* CEP com máscara e busca automática */}
              <div>
                <label className="label">CEP</label>
                <div className="relative">
                  <input
                    type="text"
                    value={formData.cep}
                    onChange={handleCEPChange}
                    className="input-field"
                    placeholder="00.000-000"
                    maxLength={10}
                  />
                  {loadingCEP && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-blue-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">Digite o CEP para buscar o endereço automaticamente</p>
              </div>
              
              <div></div>
              
              {/* Endereço */}
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
              
              {/* Cidade */}
              <div>
                <label className="label">Cidade</label>
                <input
                  type="text"
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                  className="input-field"
                />
              </div>
              
              {/* Estado */}
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
