import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const ClienteForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
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
                onChange={handleChange} 
                className="input-field"
              >
                <option value="fisica">Pessoa Física</option>
                <option value="juridica">Pessoa Jurídica</option>
              </select>
            </div>

            <div>
              <label className="label">{formData.tipo_pessoa === 'juridica' ? 'CNPJ' : 'CPF'}</label>
              <input 
                type="text" 
                name="cpf_cnpj" 
                value={formData.cpf_cnpj} 
                onChange={handleChange} 
                className="input-field" 
                placeholder={formData.tipo_pessoa === 'juridica' ? '00.000.000/0000-00' : '000.000.000-00'}
              />
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
            <div>
              <label className="label">Telefone</label>
              <input 
                type="text" 
                name="telefone" 
                value={formData.telefone} 
                onChange={handleChange} 
                className="input-field" 
                placeholder="(00) 00000-0000" 
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input 
                type="email" 
                name="email" 
                value={formData.email} 
                onChange={handleChange} 
                className="input-field" 
              />
            </div>
          </div>
        </div>

        {/* Endereço */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <label className="label">CEP</label>
              <input 
                type="text" 
                name="cep" 
                value={formData.cep} 
                onChange={handleChange} 
                className="input-field" 
                placeholder="00000-000" 
              />
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
