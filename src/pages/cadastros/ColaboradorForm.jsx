import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Loader2, 
  User, 
  Award, 
  Shield, 
  Plus, 
  Trash2,
  AlertTriangle,
  CheckCircle,
  Calendar
} from 'lucide-react'
import toast from 'react-hot-toast'

const ColaboradorForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')

  // Dados do colaborador
  const [formData, setFormData] = useState({
    nome: '',
    cpf: '',
    rg: '',
    data_nascimento: '',
    telefone: '',
    email: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    funcao_id: '',
    data_admissao: '',
    salario: '',
    pix: '',
    banco: '',
    agencia: '',
    conta: '',
    observacoes: ''
  })

  // Certificados
  const [certificados, setCertificados] = useState([])
  
  // EPIs
  const [epis, setEpis] = useState([])

  // Buscar funções
  const { data: funcoes } = useQuery({
    queryKey: ['funcoes-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('funcoes')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  useEffect(() => {
    if (isEditing) {
      loadColaborador()
    }
  }, [id])

  const loadColaborador = async () => {
    setLoadingData(true)
    try {
      // Carregar colaborador
      const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        nome: colaborador.nome || '',
        cpf: colaborador.cpf || '',
        rg: colaborador.rg || '',
        data_nascimento: colaborador.data_nascimento || '',
        telefone: colaborador.telefone || '',
        email: colaborador.email || '',
        endereco: colaborador.endereco || '',
        cidade: colaborador.cidade || '',
        estado: colaborador.estado || '',
        cep: colaborador.cep || '',
        funcao_id: colaborador.funcao_id || '',
        data_admissao: colaborador.data_admissao || '',
        salario: colaborador.salario || '',
        pix: colaborador.pix || '',
        banco: colaborador.banco || '',
        agencia: colaborador.agencia || '',
        conta: colaborador.conta || '',
        observacoes: colaborador.observacoes || ''
      })

      // Carregar certificados
      const { data: certs } = await supabase
        .from('certificados')
        .select('*')
        .eq('colaborador_id', id)
        .eq('ativo', true)
        .order('data_validade')

      setCertificados(certs || [])

      // Carregar EPIs
      const { data: episData } = await supabase
        .from('epis')
        .select('*')
        .eq('colaborador_id', id)
        .eq('ativo', true)
        .order('data_validade')

      setEpis(episData || [])

    } catch (error) {
      toast.error('Erro ao carregar colaborador')
      navigate('/colaboradores')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Funções para Certificados
  const addCertificado = () => {
    setCertificados([...certificados, {
      id: `new-${Date.now()}`,
      tipo: 'nr35',
      nome: '',
      numero: '',
      instituicao: '',
      data_emissao: '',
      data_validade: '',
      carga_horaria: '',
      observacoes: '',
      isNew: true
    }])
  }

  const updateCertificado = (index, field, value) => {
    const updated = [...certificados]
    updated[index][field] = value
    
    // Auto-preencher nome baseado no tipo
    if (field === 'tipo') {
      const nomes = {
        nr10: 'NR-10 - Segurança em Eletricidade',
        nr35: 'NR-35 - Trabalho em Altura',
        sep: 'SEP - Sistema Elétrico de Potência',
        direcao: 'Curso de Direção Defensiva',
        primeiro_socorros: 'Primeiros Socorros',
        outros: ''
      }
      updated[index].nome = nomes[value] || ''
    }
    
    setCertificados(updated)
  }

  const removeCertificado = async (index) => {
    const cert = certificados[index]
    
    if (cert.isNew) {
      setCertificados(certificados.filter((_, i) => i !== index))
    } else {
      // Marcar como inativo no banco
      await supabase
        .from('certificados')
        .update({ ativo: false })
        .eq('id', cert.id)
      
      setCertificados(certificados.filter((_, i) => i !== index))
      toast.success('Certificado removido')
    }
  }

  // Funções para EPIs
  const addEpi = () => {
    setEpis([...epis, {
      id: `new-${Date.now()}`,
      tipo: 'capacete',
      descricao: '',
      ca: '',
      marca: '',
      data_entrega: '',
      data_validade: '',
      quantidade: 1,
      observacoes: '',
      isNew: true
    }])
  }

  const updateEpi = (index, field, value) => {
    const updated = [...epis]
    updated[index][field] = value
    
    // Auto-preencher descrição baseado no tipo
    if (field === 'tipo') {
      const descricoes = {
        capacete: 'Capacete de Segurança',
        oculos: 'Óculos de Proteção',
        luva: 'Luva de Segurança',
        bota: 'Bota de Segurança',
        cinto: 'Cinto de Segurança (Talabarte)',
        uniforme: 'Uniforme',
        protetor_auricular: 'Protetor Auricular',
        outros: ''
      }
      updated[index].descricao = descricoes[value] || ''
    }
    
    setEpis(updated)
  }

  const removeEpi = async (index) => {
    const epi = epis[index]
    
    if (epi.isNew) {
      setEpis(epis.filter((_, i) => i !== index))
    } else {
      await supabase
        .from('epis')
        .update({ ativo: false })
        .eq('id', epi.id)
      
      setEpis(epis.filter((_, i) => i !== index))
      toast.success('EPI removido')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.nome.trim()) {
      toast.error('Nome é obrigatório')
      return
    }

    setLoading(true)

    try {
      const colaboradorData = {
        nome: formData.nome,
        cpf: formData.cpf,
        rg: formData.rg,
        data_nascimento: formData.data_nascimento || null,
        telefone: formData.telefone,
        email: formData.email,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        funcao_id: formData.funcao_id || null,
        data_admissao: formData.data_admissao || null,
        salario: formData.salario ? parseFloat(formData.salario) : null,
        pix: formData.pix,
        banco: formData.banco,
        agencia: formData.agencia,
        conta: formData.conta,
        observacoes: formData.observacoes
      }

      let colaboradorId = id

      if (isEditing) {
        const { error } = await supabase
          .from('colaboradores')
          .update(colaboradorData)
          .eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('colaboradores')
          .insert([colaboradorData])
          .select()
          .single()
        if (error) throw error
        colaboradorId = data.id
      }

      // Salvar certificados
      for (const cert of certificados) {
        const certData = {
          colaborador_id: colaboradorId,
          tipo: cert.tipo,
          nome: cert.nome,
          numero: cert.numero,
          instituicao: cert.instituicao,
          data_emissao: cert.data_emissao || null,
          data_validade: cert.data_validade || null,
          carga_horaria: cert.carga_horaria ? parseInt(cert.carga_horaria) : null,
          observacoes: cert.observacoes
        }

        if (cert.isNew) {
          await supabase.from('certificados').insert([certData])
        } else {
          await supabase.from('certificados').update(certData).eq('id', cert.id)
        }
      }

      // Salvar EPIs
      for (const epi of epis) {
        const epiData = {
          colaborador_id: colaboradorId,
          tipo: epi.tipo,
          descricao: epi.descricao,
          ca: epi.ca,
          marca: epi.marca,
          data_entrega: epi.data_entrega || null,
          data_validade: epi.data_validade || null,
          quantidade: epi.quantidade ? parseInt(epi.quantidade) : 1,
          observacoes: epi.observacoes
        }

        if (epi.isNew) {
          await supabase.from('epis').insert([epiData])
        } else {
          await supabase.from('epis').update(epiData).eq('id', epi.id)
        }
      }

      toast.success(isEditing ? 'Colaborador atualizado!' : 'Colaborador criado!')
      navigate('/colaboradores')

    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const getValidadeStatus = (dataValidade) => {
    if (!dataValidade) return { status: 'indefinido', label: 'Sem validade', color: 'text-gray-500' }
    
    const hoje = new Date()
    const validade = new Date(dataValidade)
    const diffDays = Math.ceil((validade - hoje) / (1000 * 60 * 60 * 24))

    if (diffDays < 0) {
      return { status: 'vencido', label: 'Vencido', color: 'text-red-600', bg: 'bg-red-100' }
    } else if (diffDays <= 30) {
      return { status: 'vencendo', label: `Vence em ${diffDays} dias`, color: 'text-orange-600', bg: 'bg-orange-100' }
    } else if (diffDays <= 60) {
      return { status: 'alerta', label: `Vence em ${diffDays} dias`, color: 'text-yellow-600', bg: 'bg-yellow-100' }
    } else {
      return { status: 'ok', label: 'Válido', color: 'text-green-600', bg: 'bg-green-100' }
    }
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

  const tiposCertificado = [
    { value: 'nr10', label: 'NR-10 - Segurança em Eletricidade' },
    { value: 'nr35', label: 'NR-35 - Trabalho em Altura' },
    { value: 'sep', label: 'SEP - Sistema Elétrico de Potência' },
    { value: 'direcao', label: 'Direção Defensiva' },
    { value: 'primeiro_socorros', label: 'Primeiros Socorros' },
    { value: 'outros', label: 'Outros' },
  ]

  const tiposEpi = [
    { value: 'capacete', label: 'Capacete' },
    { value: 'oculos', label: 'Óculos' },
    { value: 'luva', label: 'Luva' },
    { value: 'bota', label: 'Bota' },
    { value: 'cinto', label: 'Cinto/Talabarte' },
    { value: 'uniforme', label: 'Uniforme' },
    { value: 'protetor_auricular', label: 'Protetor Auricular' },
    { value: 'outros', label: 'Outros' },
  ]

  const tabs = [
    { id: 'dados', label: 'Dados Pessoais', icon: User },
    { id: 'certificados', label: 'Certificados', icon: Award, count: certificados.length },
    { id: 'epis', label: 'EPIs', icon: Shield, count: epis.length },
  ]

  // Contar alertas
  const alertasCertificados = certificados.filter(c => {
    const status = getValidadeStatus(c.data_validade)
    return status.status === 'vencido' || status.status === 'vencendo'
  }).length

  const alertasEpis = epis.filter(e => {
    const status = getValidadeStatus(e.data_validade)
    return status.status === 'vencido' || status.status === 'vencendo'
  }).length

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
        <button onClick={() => navigate('/colaboradores')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}
          </h1>
          <p className="text-gray-600">
            {isEditing ? formData.nome : 'Preencha os dados do colaborador'}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => {
            const hasAlerts = (tab.id === 'certificados' && alertasCertificados > 0) ||
                             (tab.id === 'epis' && alertasEpis > 0)
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`px-2 py-0.5 rounded-full text-xs ${
                    hasAlerts ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {hasAlerts && (
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                )}
              </button>
            )
          })}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: Dados Pessoais */}
        {activeTab === 'dados' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="lg:col-span-2">
                  <label className="label">Nome Completo *</label>
                  <input type="text" name="nome" value={formData.nome} onChange={handleChange} className="input-field" required />
                </div>
                <div>
                  <label className="label">CPF</label>
                  <input type="text" name="cpf" value={formData.cpf} onChange={handleChange} className="input-field" placeholder="000.000.000-00" />
                </div>
                <div>
                  <label className="label">RG</label>
                  <input type="text" name="rg" value={formData.rg} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Data de Nascimento</label>
                  <input type="date" name="data_nascimento" value={formData.data_nascimento} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Telefone</label>
                  <input type="tel" name="telefone" value={formData.telefone} onChange={handleChange} className="input-field" placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="label">E-mail</label>
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <label className="label">Endereço</label>
                  <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Cidade</label>
                  <input type="text" name="cidade" value={formData.cidade} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Estado</label>
                  <select name="estado" value={formData.estado} onChange={handleChange} className="input-field">
                    <option value="">Selecione...</option>
                    {estados.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">CEP</label>
                  <input type="text" name="cep" value={formData.cep} onChange={handleChange} className="input-field" placeholder="00000-000" />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Profissionais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="label">Função</label>
                  <select name="funcao_id" value={formData.funcao_id} onChange={handleChange} className="input-field">
                    <option value="">Selecione...</option>
                    {funcoes?.map(f => <option key={f.id} value={f.id}>{f.nome}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Data de Admissão</label>
                  <input type="date" name="data_admissao" value={formData.data_admissao} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Salário (R$)</label>
                  <input type="number" name="salario" value={formData.salario} onChange={handleChange} className="input-field" step="0.01" min="0" />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Dados Bancários</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="label">PIX</label>
                  <input type="text" name="pix" value={formData.pix} onChange={handleChange} className="input-field" placeholder="CPF, telefone ou chave" />
                </div>
                <div>
                  <label className="label">Banco</label>
                  <input type="text" name="banco" value={formData.banco} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Agência</label>
                  <input type="text" name="agencia" value={formData.agencia} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Conta</label>
                  <input type="text" name="conta" value={formData.conta} onChange={handleChange} className="input-field" />
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
              <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="input-field" placeholder="Observações gerais sobre o colaborador..." />
            </div>
          </div>
        )}

        {/* Tab: Certificados */}
        {activeTab === 'certificados' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Certificados e Treinamentos</h2>
              <button type="button" onClick={addCertificado} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Adicionar Certificado
              </button>
            </div>

            {certificados.length === 0 ? (
              <div className="text-center py-8">
                <Award className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Nenhum certificado cadastrado</p>
                <button type="button" onClick={addCertificado} className="btn-primary mt-4">
                  <Plus className="w-4 h-4" /> Adicionar Certificado
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {certificados.map((cert, index) => {
                  const validadeStatus = getValidadeStatus(cert.data_validade)
                  return (
                    <div key={cert.id} className={`p-4 border rounded-lg ${validadeStatus.status === 'vencido' ? 'border-red-300 bg-red-50' : validadeStatus.status === 'vencendo' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Award className="w-5 h-5 text-blue-600" />
                          <span className="font-medium">Certificado {index + 1}</span>
                          {cert.data_validade && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${validadeStatus.bg} ${validadeStatus.color}`}>
                              {validadeStatus.label}
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeCertificado(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="label">Tipo</label>
                          <select
                            value={cert.tipo}
                            onChange={(e) => updateCertificado(index, 'tipo', e.target.value)}
                            className="input-field"
                          >
                            {tiposCertificado.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Nome</label>
                          <input
                            type="text"
                            value={cert.nome}
                            onChange={(e) => updateCertificado(index, 'nome', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Número</label>
                          <input
                            type="text"
                            value={cert.numero}
                            onChange={(e) => updateCertificado(index, 'numero', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Instituição</label>
                          <input
                            type="text"
                            value={cert.instituicao}
                            onChange={(e) => updateCertificado(index, 'instituicao', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Data Emissão</label>
                          <input
                            type="date"
                            value={cert.data_emissao}
                            onChange={(e) => updateCertificado(index, 'data_emissao', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Data Validade</label>
                          <input
                            type="date"
                            value={cert.data_validade}
                            onChange={(e) => updateCertificado(index, 'data_validade', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Carga Horária</label>
                          <input
                            type="number"
                            value={cert.carga_horaria}
                            onChange={(e) => updateCertificado(index, 'carga_horaria', e.target.value)}
                            className="input-field"
                            placeholder="horas"
                          />
                        </div>
                        <div>
                          <label className="label">Observações</label>
                          <input
                            type="text"
                            value={cert.observacoes}
                            onChange={(e) => updateCertificado(index, 'observacoes', e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Tab: EPIs */}
        {activeTab === 'epis' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Equipamentos de Proteção Individual</h2>
              <button type="button" onClick={addEpi} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Adicionar EPI
              </button>
            </div>

            {epis.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">Nenhum EPI cadastrado</p>
                <button type="button" onClick={addEpi} className="btn-primary mt-4">
                  <Plus className="w-4 h-4" /> Adicionar EPI
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {epis.map((epi, index) => {
                  const validadeStatus = getValidadeStatus(epi.data_validade)
                  return (
                    <div key={epi.id} className={`p-4 border rounded-lg ${validadeStatus.status === 'vencido' ? 'border-red-300 bg-red-50' : validadeStatus.status === 'vencendo' ? 'border-orange-300 bg-orange-50' : 'border-gray-200'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-green-600" />
                          <span className="font-medium">EPI {index + 1}</span>
                          {epi.data_validade && (
                            <span className={`px-2 py-0.5 rounded-full text-xs ${validadeStatus.bg} ${validadeStatus.color}`}>
                              {validadeStatus.label}
                            </span>
                          )}
                        </div>
                        <button type="button" onClick={() => removeEpi(index)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                        <div>
                          <label className="label">Tipo</label>
                          <select
                            value={epi.tipo}
                            onChange={(e) => updateEpi(index, 'tipo', e.target.value)}
                            className="input-field"
                          >
                            {tiposEpi.map(t => (
                              <option key={t.value} value={t.value}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Descrição</label>
                          <input
                            type="text"
                            value={epi.descricao}
                            onChange={(e) => updateEpi(index, 'descricao', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">CA (Certificado Aprovação)</label>
                          <input
                            type="text"
                            value={epi.ca}
                            onChange={(e) => updateEpi(index, 'ca', e.target.value)}
                            className="input-field"
                            placeholder="00000"
                          />
                        </div>
                        <div>
                          <label className="label">Marca</label>
                          <input
                            type="text"
                            value={epi.marca}
                            onChange={(e) => updateEpi(index, 'marca', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Data Entrega</label>
                          <input
                            type="date"
                            value={epi.data_entrega}
                            onChange={(e) => updateEpi(index, 'data_entrega', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Data Validade</label>
                          <input
                            type="date"
                            value={epi.data_validade}
                            onChange={(e) => updateEpi(index, 'data_validade', e.target.value)}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Quantidade</label>
                          <input
                            type="number"
                            value={epi.quantidade}
                            onChange={(e) => updateEpi(index, 'quantidade', e.target.value)}
                            className="input-field"
                            min="1"
                          />
                        </div>
                        <div>
                          <label className="label">Observações</label>
                          <input
                            type="text"
                            value={epi.observacoes}
                            onChange={(e) => updateEpi(index, 'observacoes', e.target.value)}
                            className="input-field"
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/colaboradores')} className="btn-secondary">
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

export default ColaboradorForm
