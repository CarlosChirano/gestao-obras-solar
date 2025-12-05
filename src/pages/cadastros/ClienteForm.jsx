import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2, AlertCircle, Check } from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// FUNÇÕES DE MÁSCARA
// ============================================

const maskCPF = (value) => {
  if (!value) return ''
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1')
    .slice(0, 14)
}

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

const maskCPFCNPJ = (value, tipo) => {
  if (!value) return ''
  if (tipo === 'juridica') {
    return maskCNPJ(value)
  }
  return maskCPF(value)
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
  if (!email) return true
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

const isValidCPF = (cpf) => {
  if (!cpf) return true
  const numbers = cpf.replace(/\D/g, '')
  
  if (numbers.length !== 11) return false
  if (/^(\d)\1+$/.test(numbers)) return false
  
  let sum = 0
  for (let i = 0; i < 9; i++) {
    sum += parseInt(numbers[i]) * (10 - i)
  }
  let digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[9])) return false
  
  sum = 0
  for (let i = 0; i < 10; i++) {
    sum += parseInt(numbers[i]) * (11 - i)
  }
  digit = (sum * 10) % 11
  if (digit === 10) digit = 0
  if (digit !== parseInt(numbers[10])) return false
  
  return true
}

const isValidCNPJ = (cnpj) => {
  if (!cnpj) return true
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
    return null
  }
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const ClienteForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [loadingCEP, setLoadingCEP] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    nome: '',
    tipo_pessoa: 'fisica',
    cpf_cnpj: '',
    rg_ie: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: ''
  })

  useEffect(() => {
    if (isEditing) {
      loadCliente()
    }
  }, [id])

  const loadCliente = async () => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        nome: data.nome || '',
        tipo_pessoa: data.tipo_pessoa || 'fisica',
        cpf_cnpj: data.cpf_cnpj || '',
        rg_ie: data.rg_ie || '',
        telefone: data.telefone || '',
        email: data.email || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        observacoes: data.observacoes || ''
      })
    } catch (error) {
      toast.error('Erro ao carregar cliente')
      navigate('/clientes')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handler para CPF/CNPJ com máscara
  const handleCPFCNPJChange = (e) => {
    const masked = maskCPFCNPJ(e.target.value, formData.tipo_pessoa)
    setFormData(prev => ({ ...prev, cpf_cnpj: masked }))
    
    // Validação
    const isComplete = formData.tipo_pessoa === 'juridica' 
      ? masked.length === 18 
      : masked.length === 14
    
    if (isComplete) {
      const isValid = formData.tipo_pessoa === 'juridica' 
        ? isValidCNPJ(masked) 
        : isValidCPF(masked)
      setErrors(prev => ({ ...prev, cpf_cnpj: !isValid }))
    } else {
      setErrors(prev => ({ ...prev, cpf_cnpj: false }))
    }
  }

  // Handler para Telefone com máscara
  const handlePhoneChange = (e) => {
    const masked = maskPhone(e.target.value)
    setFormData(prev => ({ ...prev, telefone: masked }))
  }

  // Handler para Email com validação
  const handleEmailBlur = () => {
    if (formData.email && !isValidEmail(formData.email)) {
      setErrors(prev => ({ ...prev, email: true }))
    } else {
      setErrors(prev => ({ ...prev, email: false }))
    }
  }

  // Handler para CEP com máscara e busca automática
  const handleCEPChange = async (e) => {
    const masked = maskCEP(e.target.value)
    setFormData(prev => ({ ...prev, cep: masked }))
    
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

  // Quando muda o tipo de pessoa, limpa e reformata o CPF/CNPJ
  const handleTipoPessoaChange = (e) => {
    const novoTipo = e.target.value
    setFormData(prev => ({ 
      ...prev, 
      tipo_pessoa: novoTipo,
      cpf_cnpj: '' // Limpa o campo ao mudar o tipo
    }))
    setErrors(prev => ({ ...prev, cpf_cnpj: false }))
  }

  const validateForm = () => {
    const newErrors = {}
    
    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return false
    }
    
    if (formData.cpf_cnpj) {
      const isValid = formData.tipo_pessoa === 'juridica' 
        ? isValidCNPJ(formData.cpf_cnpj) 
        : isValidCPF(formData.cpf_cnpj)
      if (!isValid) {
        newErrors.cpf_cnpj = true
        toast.error(formData.tipo_pessoa === 'juridica' ? 'CNPJ inválido' : 'CPF inválido')
        return false
      }
    }
    
    if (formData.email && !isValidEmail(formData.email)) {
      newErrors.email = true
      toast.error('E-mail inválido')
      return false
    }
    
    setErrors(newErrors)
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)

    try {
      if (isEditing) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', id)
        if (error) throw error
        toast.success('Cliente atualizado!')
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert([formData])
        if (error) throw error
        toast.success('Cliente cadastrado!')
      }
      navigate('/clientes')
    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/clientes')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Cliente' : 'Novo Cliente'}
          </h1>
          <p className="text-gray-600">Preencha os dados do cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados Principais */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Principais</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="label">Nome / Razão Social *</label>
              <input 
                type="text" 
                name="nome" 
                value={formData.nome} 
                onChange={handleChange} 
                className="input-field" 
                required 
              />
            </div>
            
            <div>
              <label className="label">Tipo de Pessoa</label>
              <select 
                name="tipo_pessoa" 
                value={formData.tipo_pessoa} 
                onChange={handleTipoPessoaChange} 
                className="input-field"
              >
                <option value="fisica">Pessoa Física</option>
                <option value="juridica">Pessoa Jurídica</option>
              </select>
            </div>

            {/* CPF/CNPJ com máscara e validação */}
            <div>
              <label className="label">{formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</label>
              <div className="relative">
                <input 
                  type="text" 
                  name="cpf_cnpj" 
                  value={formData.cpf_cnpj} 
                  onChange={handleCPFCNPJChange} 
                  className={`input-field ${errors.cpf_cnpj ? 'border-red-500' : ''}`}
                  placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                  maxLength={formData.tipo_pessoa === 'juridica' ? 18 : 14}
                />
                {formData.cpf_cnpj && (
                  (formData.tipo_pessoa === 'juridica' && formData.cpf_cnpj.length === 18) ||
                  (formData.tipo_pessoa === 'fisica' && formData.cpf_cnpj.length === 14)
                ) && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${errors.cpf_cnpj ? 'text-red-500' : 'text-green-500'}`}>
                    {errors.cpf_cnpj ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </span>
                )}
              </div>
              {errors.cpf_cnpj && (
                <p className="text-red-500 text-xs mt-1">
                  {formData.tipo_pessoa === 'juridica' ? 'CNPJ inválido' : 'CPF inválido'}
                </p>
              )}
            </div>

            <div>
              <label className="label">{formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'RG'}</label>
              <input 
                type="text" 
                name="rg_ie" 
                value={formData.rg_ie} 
                onChange={handleChange} 
                className="input-field" 
              />
            </div>
          </div>
        </div>

        {/* Contato */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Contato</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Telefone com máscara */}
            <div>
              <label className="label">Telefone</label>
              <input 
                type="text" 
                name="telefone" 
                value={formData.telefone} 
                onChange={handlePhoneChange} 
                className="input-field" 
                placeholder="(00) 00000-0000"
                maxLength={15}
              />
            </div>
            
            {/* Email com validação */}
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange}
                  onBlur={handleEmailBlur}
                  className={`input-field ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@exemplo.com"
                />
                {formData.email && (
                  <span className={`absolute right-3 top-1/2 -translate-y-1/2 ${errors.email ? 'text-red-500' : 'text-green-500'}`}>
                    {errors.email ? <AlertCircle className="w-4 h-4" /> : <Check className="w-4 h-4" />}
                  </span>
                )}
              </div>
              {errors.email && <p className="text-red-500 text-xs mt-1">E-mail inválido (ex: nome@email.com)</p>}
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* CEP com máscara e busca automática */}
            <div>
              <label className="label">CEP</label>
              <div className="relative">
                <input 
                  type="text" 
                  name="cep" 
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
            
            <div className="md:col-span-2">
              <label className="label">Endereço</label>
              <input 
                type="text" 
                name="endereco" 
                value={formData.endereco} 
                onChange={handleChange} 
                className="input-field" 
                placeholder="Rua, número, bairro" 
              />
            </div>
            <div>
              <label className="label">Cidade</label>
              <input 
                type="text" 
                name="cidade" 
                value={formData.cidade} 
                onChange={handleChange} 
                className="input-field" 
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select 
                name="estado" 
                value={formData.estado} 
                onChange={handleChange} 
                className="input-field"
              >
                <option value="">Selecione...</option>
                {estados.map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Observações */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
          <textarea 
            name="observacoes" 
            value={formData.observacoes} 
            onChange={handleChange} 
            rows={3} 
            className="input-field" 
            placeholder="Observações adicionais..." 
          />
        </div>

        {/* Botões */}
        <div className="flex gap-3 justify-end">
          <button type="button" onClick={() => navigate('/clientes')} className="btn-secondary">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {loading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ClienteForm
