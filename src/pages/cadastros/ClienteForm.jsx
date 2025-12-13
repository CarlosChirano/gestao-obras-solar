import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2, AlertCircle, Check, Plus, Trash2, MapPin, Edit, Navigation, Star, X, Building2, FileText } from 'lucide-react'
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
    tipo_identificacao: 'documento', // 'documento' ou 'contrato'
    cpf_cnpj: '',
    numero_contrato: '',
    rg_ie: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    observacoes: ''
  })

  // Estado para endereços de obras
  const [enderecos, setEnderecos] = useState([])
  const [showEnderecoModal, setShowEnderecoModal] = useState(false)
  const [enderecoEditando, setEnderecoEditando] = useState(null)
  const [loadingCEPEndereco, setLoadingCEPEndereco] = useState(false)
  const [enderecoForm, setEnderecoForm] = useState({
    nome: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    latitude: '',
    longitude: '',
    referencia: '',
    contato_local: '',
    telefone_local: '',
    observacoes: '',
    is_principal: false
  })

  useEffect(() => {
    if (isEditing) {
      loadCliente()
    }
  }, [id])

  const loadCliente = async () => {
    setLoadingData(true)
    try {
      // Carregar cliente
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      // Determinar tipo de identificação baseado nos dados
      const tipoIdent = data.numero_contrato && !data.cpf_cnpj ? 'contrato' : 'documento'

      setFormData({
        nome: data.nome || '',
        tipo_pessoa: data.tipo_pessoa || 'fisica',
        tipo_identificacao: tipoIdent,
        cpf_cnpj: data.cpf_cnpj || '',
        numero_contrato: data.numero_contrato || '',
        rg_ie: data.rg_ie || '',
        telefone: data.telefone || '',
        email: data.email || '',
        endereco: data.endereco || '',
        cidade: data.cidade || '',
        estado: data.estado || '',
        cep: data.cep || '',
        observacoes: data.observacoes || ''
      })

      // Carregar endereços de obras
      const { data: enderecosData, error: enderecosError } = await supabase
        .from('cliente_enderecos')
        .select('*')
        .eq('cliente_id', id)
        .eq('ativo', true)
        .order('is_principal', { ascending: false })
        .order('nome')

      if (!enderecosError) {
        setEnderecos(enderecosData || [])
      }
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

  const handleCPFCNPJChange = (e) => {
    const masked = maskCPFCNPJ(e.target.value, formData.tipo_pessoa)
    setFormData(prev => ({ ...prev, cpf_cnpj: masked }))
    
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

  const handlePhoneChange = (e) => {
    const masked = maskPhone(e.target.value)
    setFormData(prev => ({ ...prev, telefone: masked }))
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
    setFormData(prev => ({ ...prev, cep: masked }))
    
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

  const handleTipoPessoaChange = (e) => {
    const novoTipo = e.target.value
    setFormData(prev => ({ 
      ...prev, 
      tipo_pessoa: novoTipo,
      cpf_cnpj: ''
    }))
    setErrors(prev => ({ ...prev, cpf_cnpj: false }))
  }

  const handleTipoIdentificacaoChange = (tipo) => {
    setFormData(prev => ({
      ...prev,
      tipo_identificacao: tipo,
      cpf_cnpj: tipo === 'documento' ? prev.cpf_cnpj : '',
      numero_contrato: tipo === 'contrato' ? prev.numero_contrato : ''
    }))
    setErrors(prev => ({ ...prev, cpf_cnpj: false }))
  }

  // ============================================
  // FUNÇÕES PARA ENDEREÇOS DE OBRAS
  // ============================================

  const openEnderecoModal = (endereco = null) => {
    if (endereco) {
      setEnderecoEditando(endereco)
      setEnderecoForm({
        nome: endereco.nome || '',
        endereco: endereco.endereco || '',
        numero: endereco.numero || '',
        complemento: endereco.complemento || '',
        bairro: endereco.bairro || '',
        cidade: endereco.cidade || '',
        estado: endereco.estado || '',
        cep: endereco.cep || '',
        latitude: endereco.latitude || '',
        longitude: endereco.longitude || '',
        referencia: endereco.referencia || '',
        contato_local: endereco.contato_local || '',
        telefone_local: endereco.telefone_local || '',
        observacoes: endereco.observacoes || '',
        is_principal: endereco.is_principal || false
      })
    } else {
      setEnderecoEditando(null)
      setEnderecoForm({
        nome: '',
        endereco: '',
        numero: '',
        complemento: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        latitude: '',
        longitude: '',
        referencia: '',
        contato_local: '',
        telefone_local: '',
        observacoes: '',
        is_principal: enderecos.length === 0
      })
    }
    setShowEnderecoModal(true)
  }

  const handleEnderecoChange = (e) => {
    const { name, value, type, checked } = e.target
    setEnderecoForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleEnderecoCEPChange = async (e) => {
    const masked = maskCEP(e.target.value)
    setEnderecoForm(prev => ({ ...prev, cep: masked }))
    
    if (masked.replace(/\D/g, '').length === 8) {
      setLoadingCEPEndereco(true)
      const address = await fetchAddressByCEP(masked)
      setLoadingCEPEndereco(false)
      
      if (address) {
        setEnderecoForm(prev => ({
          ...prev,
          endereco: address.endereco || prev.endereco,
          bairro: address.bairro || prev.bairro,
          cidade: address.cidade || prev.cidade,
          estado: address.estado || prev.estado
        }))
        toast.success('Endereço preenchido!')
      }
    }
  }

  const handleEnderecoPhoneChange = (e) => {
    const masked = maskPhone(e.target.value)
    setEnderecoForm(prev => ({ ...prev, telefone_local: masked }))
  }

  const getMyLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setEnderecoForm(prev => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6)
          }))
          toast.success('Localização capturada!')
        },
        (error) => {
          toast.error('Erro ao obter localização: ' + error.message)
        }
      )
    } else {
      toast.error('Geolocalização não suportada')
    }
  }

  const saveEndereco = async () => {
    if (!enderecoForm.nome.trim()) {
      toast.error('Nome do local é obrigatório')
      return
    }

    try {
      if (isEditing && id) {
        if (enderecoEditando) {
          const { error } = await supabase
            .from('cliente_enderecos')
            .update({
              ...enderecoForm,
              latitude: enderecoForm.latitude ? parseFloat(enderecoForm.latitude) : null,
              longitude: enderecoForm.longitude ? parseFloat(enderecoForm.longitude) : null,
              atualizado_em: new Date().toISOString()
            })
            .eq('id', enderecoEditando.id)
          
          if (error) throw error
          toast.success('Endereço atualizado!')
        } else {
          const { error } = await supabase
            .from('cliente_enderecos')
            .insert({
              cliente_id: id,
              ...enderecoForm,
              latitude: enderecoForm.latitude ? parseFloat(enderecoForm.latitude) : null,
              longitude: enderecoForm.longitude ? parseFloat(enderecoForm.longitude) : null
            })
          
          if (error) throw error
          toast.success('Endereço adicionado!')
        }
        
        const { data } = await supabase
          .from('cliente_enderecos')
          .select('*')
          .eq('cliente_id', id)
          .eq('ativo', true)
          .order('is_principal', { ascending: false })
          .order('nome')
        setEnderecos(data || [])
      } else {
        if (enderecoEditando) {
          setEnderecos(prev => prev.map(e => 
            e.id === enderecoEditando.id 
              ? { ...e, ...enderecoForm }
              : e
          ))
        } else {
          setEnderecos(prev => [...prev, {
            id: `temp-${Date.now()}`,
            ...enderecoForm,
            isTemp: true
          }])
        }
        toast.success(enderecoEditando ? 'Endereço atualizado!' : 'Endereço adicionado!')
      }
      
      setShowEnderecoModal(false)
    } catch (error) {
      toast.error('Erro ao salvar endereço: ' + error.message)
    }
  }

  const deleteEndereco = async (endereco) => {
    if (!confirm('Remover este endereço de obra?')) return
    
    try {
      if (isEditing && id && !endereco.isTemp) {
        const { error } = await supabase
          .from('cliente_enderecos')
          .update({ ativo: false })
          .eq('id', endereco.id)
        
        if (error) throw error
      }
      
      setEnderecos(prev => prev.filter(e => e.id !== endereco.id))
      toast.success('Endereço removido!')
    } catch (error) {
      toast.error('Erro ao remover: ' + error.message)
    }
  }

  const setEnderecoPrincipal = async (endereco) => {
    try {
      if (isEditing && id) {
        // Remover principal de todos
        await supabase
          .from('cliente_enderecos')
          .update({ is_principal: false })
          .eq('cliente_id', id)
        
        // Definir novo principal
        await supabase
          .from('cliente_enderecos')
          .update({ is_principal: true })
          .eq('id', endereco.id)
        
        // Recarregar
        const { data } = await supabase
          .from('cliente_enderecos')
          .select('*')
          .eq('cliente_id', id)
          .eq('ativo', true)
          .order('is_principal', { ascending: false })
          .order('nome')
        setEnderecos(data || [])
        toast.success('Endereço principal atualizado!')
      } else {
        setEnderecos(prev => prev.map(e => ({
          ...e,
          is_principal: e.id === endereco.id
        })))
      }
    } catch (error) {
      toast.error('Erro ao definir principal')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    // Validação de CPF/CNPJ apenas se tipo_identificacao for documento
    if (formData.tipo_identificacao === 'documento' && formData.cpf_cnpj) {
      const isValid = formData.tipo_pessoa === 'juridica' 
        ? isValidCNPJ(formData.cpf_cnpj)
        : isValidCPF(formData.cpf_cnpj)
      
      if (!isValid) {
        toast.error(`${formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'} inválido`)
        return
      }
    }

    if (formData.email && !isValidEmail(formData.email)) {
      toast.error('E-mail inválido')
      return
    }

    setLoading(true)

    try {
      const clienteData = {
        nome: formData.nome,
        tipo_pessoa: formData.tipo_pessoa,
        cpf_cnpj: formData.tipo_identificacao === 'documento' ? formData.cpf_cnpj : null,
        numero_contrato: formData.tipo_identificacao === 'contrato' ? formData.numero_contrato : null,
        rg_ie: formData.rg_ie,
        telefone: formData.telefone,
        email: formData.email,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        observacoes: formData.observacoes
      }

      let clienteId = id

      if (isEditing) {
        const { error } = await supabase
          .from('clientes')
          .update({
            ...clienteData,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', id)
        
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('clientes')
          .insert([clienteData])
          .select()
          .single()
        
        if (error) throw error
        clienteId = data.id

        // Salvar endereços temporários
        const enderecosTempList = enderecos.filter(e => e.isTemp)
        if (enderecosTempList.length > 0) {
          const enderecosData = enderecosTempList.map(e => ({
            cliente_id: clienteId,
            nome: e.nome,
            endereco: e.endereco,
            numero: e.numero,
            complemento: e.complemento,
            bairro: e.bairro,
            cidade: e.cidade,
            estado: e.estado,
            cep: e.cep,
            latitude: e.latitude ? parseFloat(e.latitude) : null,
            longitude: e.longitude ? parseFloat(e.longitude) : null,
            referencia: e.referencia,
            contato_local: e.contato_local,
            telefone_local: e.telefone_local,
            observacoes: e.observacoes,
            is_principal: e.is_principal
          }))
          
          await supabase.from('cliente_enderecos').insert(enderecosData)
        }
      }

      toast.success(isEditing ? 'Cliente atualizado!' : 'Cliente cadastrado!')
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

            {/* Seletor de Tipo de Identificação */}
            <div>
              <label className="label">Identificar por</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTipoIdentificacaoChange('documento')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.tipo_identificacao === 'documento'
                      ? 'bg-blue-50 border-blue-500 text-blue-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  {formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTipoIdentificacaoChange('contrato')}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                    formData.tipo_identificacao === 'contrato'
                      ? 'bg-green-50 border-green-500 text-green-700'
                      : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  Nº Contrato
                </button>
              </div>
            </div>

            {/* Campo CPF/CNPJ - só aparece se tipo_identificacao for 'documento' */}
            {formData.tipo_identificacao === 'documento' && (
              <div>
                <label className="label">
                  {formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}
                </label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="cpf_cnpj" 
                    value={formData.cpf_cnpj} 
                    onChange={handleCPFCNPJChange} 
                    className={`input-field pr-10 ${errors.cpf_cnpj ? 'border-red-500' : ''}`}
                    placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
                    maxLength={formData.tipo_pessoa === 'juridica' ? 18 : 14}
                  />
                  {formData.cpf_cnpj && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2">
                      {errors.cpf_cnpj ? (
                        <AlertCircle className="w-5 h-5 text-red-500" />
                      ) : formData.cpf_cnpj.length === (formData.tipo_pessoa === 'juridica' ? 18 : 14) ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : null}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Campo Número de Contrato - só aparece se tipo_identificacao for 'contrato' */}
            {formData.tipo_identificacao === 'contrato' && (
              <div>
                <label className="label">Número do Contrato</label>
                <div className="relative">
                  <input 
                    type="text" 
                    name="numero_contrato" 
                    value={formData.numero_contrato} 
                    onChange={handleChange} 
                    className="input-field"
                    placeholder="Ex: CONT-2024-001"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">
                {formData.tipo_pessoa === 'juridica' ? 'Inscrição Estadual' : 'RG'}
              </label>
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
            
            <div>
              <label className="label">E-mail</label>
              <div className="relative">
                <input 
                  type="email" 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} 
                  onBlur={handleEmailBlur}
                  className={`input-field pr-10 ${errors.email ? 'border-red-500' : ''}`}
                  placeholder="email@exemplo.com"
                />
                {formData.email && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {errors.email ? (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    ) : isValidEmail(formData.email) ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : null}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Endereço Principal */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço Principal (Sede/Residência)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

        {/* Endereços de Obras */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                Endereços de Obras
              </h2>
              <p className="text-sm text-gray-500">Cadastre os locais onde serão realizados os serviços</p>
            </div>
            <button 
              type="button" 
              onClick={() => openEnderecoModal()}
              className="btn-primary"
            >
              <Plus className="w-4 h-4" /> Adicionar Obra
            </button>
          </div>

          {enderecos.length === 0 ? (
            <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Nenhum endereço de obra cadastrado</p>
              <button 
                type="button" 
                onClick={() => openEnderecoModal()}
                className="text-blue-600 hover:text-blue-700 font-medium mt-2"
              >
                Adicionar primeiro endereço
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {enderecos.map((endereco) => (
                <div 
                  key={endereco.id}
                  className={`p-4 rounded-xl border-2 ${
                    endereco.is_principal 
                      ? 'border-yellow-400 bg-yellow-50' 
                      : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{endereco.nome}</h3>
                        {endereco.is_principal && (
                          <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 text-xs font-medium rounded-full flex items-center gap-1">
                            <Star className="w-3 h-3" /> Principal
                          </span>
                        )}
                        {endereco.isTemp && (
                          <span className="px-2 py-0.5 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                            Pendente
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {[endereco.endereco, endereco.numero].filter(Boolean).join(', ')}
                        {endereco.complemento ? ` - ${endereco.complemento}` : ''}
                      </p>
                      <p className="text-sm text-gray-500">
                        {[endereco.cidade, endereco.estado].filter(Boolean).join('/')}
                        {endereco.cep ? ` - CEP: ${endereco.cep}` : ''}
                      </p>
                      {endereco.latitude && endereco.longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${endereco.latitude},${endereco.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-1"
                        >
                          <Navigation className="w-3 h-3" />
                          GPS: {endereco.latitude}, {endereco.longitude}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      {!endereco.is_principal && (
                        <button
                          type="button"
                          onClick={() => setEnderecoPrincipal(endereco)}
                          className="p-2 text-yellow-600 hover:bg-yellow-100 rounded-lg"
                          title="Definir como principal"
                        >
                          <Star className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => openEnderecoModal(endereco)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg"
                        title="Editar"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteEndereco(endereco)}
                        className="p-2 text-red-600 hover:bg-red-100 rounded-lg"
                        title="Remover"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Observações */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
          <textarea 
            name="observacoes" 
            value={formData.observacoes} 
            onChange={handleChange}
            rows={4}
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

      {/* Modal de Endereço */}
      {showEnderecoModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-8 border-b">
              <h2 className="text-xl font-bold text-gray-900">
                {enderecoEditando ? 'Editar Endereço' : 'Novo Endereço de Obra'}
              </h2>
              <button onClick={() => setShowEnderecoModal(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 overflow-y-auto max-h-[60vh] space-y-5">
              {/* Nome do Local */}
              <div>
                <label className="label">Nome do Local *</label>
                <input
                  type="text"
                  name="nome"
                  value={enderecoForm.nome}
                  onChange={handleEnderecoChange}
                  className="input-field"
                  placeholder="Ex: Obra Centro, Filial Norte, Fazenda Sul..."
                />
              </div>

              {/* CEP e Número */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="label">CEP</label>
                  <div className="relative">
                    <input
                      type="text"
                      name="cep"
                      value={enderecoForm.cep}
                      onChange={handleEnderecoCEPChange}
                      className="input-field"
                      placeholder="00.000-000"
                      maxLength={10}
                    />
                    {loadingCEPEndereco && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="label">Nº</label>
                  <input
                    type="text"
                    name="numero"
                    value={enderecoForm.numero}
                    onChange={handleEnderecoChange}
                    className="input-field"
                    placeholder="123"
                  />
                </div>
              </div>

              {/* Endereço */}
              <div>
                <label className="label">Endereço</label>
                <input
                  type="text"
                  name="endereco"
                  value={enderecoForm.endereco}
                  onChange={handleEnderecoChange}
                  className="input-field"
                  placeholder="Rua, Avenida..."
                />
              </div>

              {/* Complemento + Bairro */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="label">Complemento</label>
                  <input
                    type="text"
                    name="complemento"
                    value={enderecoForm.complemento}
                    onChange={handleEnderecoChange}
                    className="input-field"
                    placeholder="Bloco, Sala..."
                  />
                </div>
                <div>
                  <label className="label">Bairro</label>
                  <input
                    type="text"
                    name="bairro"
                    value={enderecoForm.bairro}
                    onChange={handleEnderecoChange}
                    className="input-field"
                  />
                </div>
              </div>

              {/* Cidade + Estado */}
              <div className="grid grid-cols-3 gap-5">
                <div className="col-span-2">
                  <label className="label">Cidade</label>
                  <input
                    type="text"
                    name="cidade"
                    value={enderecoForm.cidade}
                    onChange={handleEnderecoChange}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select
                    name="estado"
                    value={enderecoForm.estado}
                    onChange={handleEnderecoChange}
                    className="input-field"
                  >
                    <option value="">UF</option>
                    {estados.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Coordenadas GPS */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Coordenadas GPS</label>
                  <button
                    type="button"
                    onClick={getMyLocation}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <MapPin className="w-4 h-4" />
                    Usar minha localização
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-5">
                  <div>
                    <label className="text-xs text-gray-500">Latitude</label>
                    <input
                      type="text"
                      name="latitude"
                      value={enderecoForm.latitude}
                      onChange={handleEnderecoChange}
                      className="input-field"
                      placeholder="-23.550520"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Longitude</label>
                    <input
                      type="text"
                      name="longitude"
                      value={enderecoForm.longitude}
                      onChange={handleEnderecoChange}
                      className="input-field"
                      placeholder="-46.633308"
                    />
                  </div>
                </div>
              </div>

              {/* Ponto de Referência */}
              <div>
                <label className="label">Ponto de Referência</label>
                <input
                  type="text"
                  name="referencia"
                  value={enderecoForm.referencia}
                  onChange={handleEnderecoChange}
                  className="input-field"
                  placeholder="Próximo ao posto, em frente ao mercado..."
                />
              </div>

              {/* Contato no Local */}
              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="label">Contato no Local</label>
                  <input
                    type="text"
                    name="contato_local"
                    value={enderecoForm.contato_local}
                    onChange={handleEnderecoChange}
                    className="input-field"
                    placeholder="Nome do responsável"
                  />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input
                    type="text"
                    name="telefone_local"
                    value={enderecoForm.telefone_local}
                    onChange={handleEnderecoPhoneChange}
                    className="input-field"
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              {/* Observações */}
              <div>
                <label className="label">Observações</label>
                <textarea
                  name="observacoes"
                  value={enderecoForm.observacoes}
                  onChange={handleEnderecoChange}
                  rows={3}
                  className="input-field resize-none"
                  placeholder="Informações adicionais sobre o local..."
                />
              </div>

              {/* Checkbox Principal */}
              <div className="flex items-center gap-3 pt-2">
                <input
                  type="checkbox"
                  id="is_principal"
                  name="is_principal"
                  checked={enderecoForm.is_principal}
                  onChange={handleEnderecoChange}
                  className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="is_principal" className="text-sm text-gray-700 flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Definir como endereço principal
                </label>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-4 p-8 border-t bg-gray-50">
              <button
                type="button"
                onClick={() => setShowEnderecoModal(false)}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveEndereco}
                className="btn-primary flex-1"
              >
                <Save className="w-4 h-4" />
                {enderecoEditando ? 'Atualizar' : 'Adicionar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ClienteForm
