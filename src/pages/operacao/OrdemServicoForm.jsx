import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Save, Loader2, Plus, Trash2, MapPin, Calendar, Users, Wrench, DollarSign, Car } from 'lucide-react'
import toast from 'react-hot-toast'

// Máscara de Moeda - R$ 0.000,00
const maskMoney = (value) => {
  if (!value) return ''
  let numbers = value.toString().replace(/\D/g, '')
  if (!numbers) return ''
  const amount = parseInt(numbers) / 100
  return amount.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const parseMoney = (value) => {
  if (!value) return null
  const numbers = value.replace(/[R$\s.]/g, '').replace(',', '.')
  const parsed = parseFloat(numbers)
  return isNaN(parsed) ? null : parsed
}

// Formata número para exibição como moeda
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return parseFloat(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  })
}

const OrdemServicoForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const isEditing = !!id

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')

  // Dados básicos da OS
  const [formData, setFormData] = useState({
    cliente_id: '',
    equipe_id: '',
    empresa_contratante_id: '',
    data_agendamento: '',
    previsao_duracao: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    valor_total: '',
    valor_mao_obra: '',
    valor_materiais: '',
    valor_deslocamento: '',
    status: 'agendada',
    prioridade: 'normal',
    observacoes: '',
    observacoes_internas: '',
    veiculo_id: '',
    km_inicial: ''
  })

  // Serviços da OS
  const [servicos, setServicos] = useState([])
  
  // Colaboradores da OS
  const [colaboradores, setColaboradores] = useState([])
  
  // Custos extras
  const [custosExtras, setCustosExtras] = useState([])

  // Buscar dados auxiliares
  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      return data
    }
  })

  const { data: equipes } = useQuery({
    queryKey: ['equipes-select'],
    queryFn: async () => {
      const { data } = await supabase.from('equipes').select('id, nome, cor').eq('ativo', true).order('nome')
      return data
    }
  })

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas_contratantes').select('id, nome').eq('ativo', true).order('nome')
      return data
    }
  })

  const { data: servicosDisponiveis } = useQuery({
    queryKey: ['servicos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome')
      return data
    }
  })

  const { data: colaboradoresDisponiveis } = useQuery({
    queryKey: ['colaboradores-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome, funcao:funcoes(id, nome, valor_diaria)')
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('veiculos').select('id, placa, modelo').eq('ativo', true).order('modelo')
      return data
    }
  })

  useEffect(() => {
    if (isEditing) {
      loadOrdemServico()
    }
  }, [id])

  const loadOrdemServico = async () => {
    setLoadingData(true)
    try {
      // Carregar OS
      const { data: os, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        cliente_id: os.cliente_id || '',
        equipe_id: os.equipe_id || '',
        empresa_contratante_id: os.empresa_contratante_id || '',
        data_agendamento: os.data_agendamento || '',
        previsao_duracao: os.previsao_duracao || '',
        endereco: os.endereco || '',
        cidade: os.cidade || '',
        estado: os.estado || '',
        cep: os.cep || '',
        valor_total: os.valor_total ? maskMoney((os.valor_total * 100).toString()) : '',
        valor_mao_obra: os.valor_mao_obra || '',
        valor_materiais: os.valor_materiais ? maskMoney((os.valor_materiais * 100).toString()) : '',
        valor_deslocamento: os.valor_deslocamento ? maskMoney((os.valor_deslocamento * 100).toString()) : '',
        status: os.status || 'agendada',
        prioridade: os.prioridade || 'normal',
        observacoes: os.observacoes || '',
        observacoes_internas: os.observacoes_internas || '',
        veiculo_id: os.veiculo_id || '',
        km_inicial: os.km_inicial || ''
      })

      // Carregar serviços
      const { data: osServicos } = await supabase
        .from('os_servicos')
        .select('*, servico:servicos(nome)')
        .eq('ordem_servico_id', id)

      setServicos(osServicos?.map(s => ({
        ...s,
        servico_nome: s.servico?.nome
      })) || [])

      // Carregar colaboradores
      const { data: osColaboradores } = await supabase
        .from('os_colaboradores')
        .select('*, colaborador:colaboradores(nome), funcao:funcoes(nome)')
        .eq('ordem_servico_id', id)

      setColaboradores(osColaboradores?.map(c => ({
        ...c,
        colaborador_nome: c.colaborador?.nome,
        funcao_nome: c.funcao?.nome
      })) || [])

      // Carregar custos extras
      const { data: osCustos } = await supabase
        .from('os_custos_extras')
        .select('*')
        .eq('ordem_servico_id', id)

      setCustosExtras(osCustos || [])

    } catch (error) {
      toast.error('Erro ao carregar OS')
      navigate('/ordens-servico')
    } finally {
      setLoadingData(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // Handlers para valores monetários
  const handleMoneyChange = (name) => (e) => {
    const masked = maskMoney(e.target.value)
    setFormData(prev => ({ ...prev, [name]: masked }))
  }

  // Funções para Serviços
  const addServico = () => {
    setServicos([...servicos, {
      servico_id: '',
      descricao: '',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
      isNew: true
    }])
  }

  const updateServico = (index, field, value) => {
    const updated = [...servicos]
    updated[index][field] = value

    // Se selecionou um serviço, preencher valor unitário
    if (field === 'servico_id' && value) {
      const servico = servicosDisponiveis?.find(s => s.id === value)
      if (servico) {
        updated[index].valor_unitario = servico.valor_unitario
        updated[index].servico_nome = servico.nome
      }
    }

    // Recalcular valor total
    if (field === 'quantidade' || field === 'valor_unitario') {
      updated[index].valor_total = (parseFloat(updated[index].quantidade) || 0) * (parseFloat(updated[index].valor_unitario) || 0)
    }

    setServicos(updated)
  }

  const removeServico = (index) => {
    setServicos(servicos.filter((_, i) => i !== index))
  }

  // Funções para Colaboradores
  const addColaborador = () => {
    setColaboradores([...colaboradores, {
      colaborador_id: '',
      funcao_id: '',
      valor_diaria: 0,
      dias_trabalhados: 1,
      valor_total: 0,
      isNew: true
    }])
  }

  const updateColaborador = (index, field, value) => {
    const updated = [...colaboradores]
    updated[index][field] = value

    // Se selecionou um colaborador, preencher função e valor
    if (field === 'colaborador_id' && value) {
      const col = colaboradoresDisponiveis?.find(c => c.id === value)
      if (col) {
        updated[index].funcao_id = col.funcao?.id || ''
        updated[index].valor_diaria = col.funcao?.valor_diaria || 0
        updated[index].colaborador_nome = col.nome
        updated[index].funcao_nome = col.funcao?.nome
      }
    }

    // Recalcular valor total
    if (field === 'dias_trabalhados' || field === 'valor_diaria') {
      updated[index].valor_total = (parseFloat(updated[index].dias_trabalhados) || 0) * (parseFloat(updated[index].valor_diaria) || 0)
    }

    setColaboradores(updated)
  }

  const removeColaborador = (index) => {
    setColaboradores(colaboradores.filter((_, i) => i !== index))
  }

  // Funções para Custos Extras
  const addCustoExtra = () => {
    setCustosExtras([...custosExtras, {
      tipo: 'material',
      descricao: '',
      valor: 0,
      isNew: true
    }])
  }

  const updateCustoExtra = (index, field, value) => {
    const updated = [...custosExtras]
    updated[index][field] = value
    setCustosExtras(updated)
  }

  const removeCustoExtra = (index) => {
    setCustosExtras(custosExtras.filter((_, i) => i !== index))
  }

  // Calcular totais
  const totalServicos = servicos.reduce((sum, s) => sum + (parseFloat(s.valor_total) || 0), 0)
  const totalMaoObra = colaboradores.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0)
  const totalCustosExtras = custosExtras.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.cliente_id) {
      toast.error('Selecione um cliente')
      return
    }

    setLoading(true)

    try {
      const osData = {
        cliente_id: formData.cliente_id,
        equipe_id: formData.equipe_id || null,
        empresa_contratante_id: formData.empresa_contratante_id || null,
        data_agendamento: formData.data_agendamento || null,
        previsao_duracao: formData.previsao_duracao ? parseInt(formData.previsao_duracao) : null,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        valor_total: parseMoney(formData.valor_total) || totalServicos,
        valor_mao_obra: totalMaoObra,
        valor_materiais: parseMoney(formData.valor_materiais) || 0,
        valor_deslocamento: parseMoney(formData.valor_deslocamento) || 0,
        status: formData.status,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes,
        observacoes_internas: formData.observacoes_internas,
        veiculo_id: formData.veiculo_id || null,
        km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null
      }

      let osId = id

      if (isEditing) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(osData)
          .eq('id', id)
        if (error) throw error

        // Limpar dados antigos
        await supabase.from('os_servicos').delete().eq('ordem_servico_id', id)
        await supabase.from('os_colaboradores').delete().eq('ordem_servico_id', id)
        await supabase.from('os_custos_extras').delete().eq('ordem_servico_id', id)
      } else {
        // Gerar número da OS
        const { count } = await supabase
          .from('ordens_servico')
          .select('*', { count: 'exact', head: true })
        
        osData.numero = `OS-${String((count || 0) + 1).padStart(5, '0')}`

        const { data, error } = await supabase
          .from('ordens_servico')
          .insert([osData])
          .select()
          .single()
        if (error) throw error
        osId = data.id
      }

      // Inserir serviços
      if (servicos.length > 0) {
        const servicosData = servicos.map(s => ({
          ordem_servico_id: osId,
          servico_id: s.servico_id || null,
          descricao: s.descricao,
          quantidade: parseFloat(s.quantidade) || 1,
          valor_unitario: parseFloat(s.valor_unitario) || 0,
          valor_total: parseFloat(s.valor_total) || 0
        }))
        await supabase.from('os_servicos').insert(servicosData)
      }

      // Inserir colaboradores
      if (colaboradores.length > 0) {
        const colaboradoresData = colaboradores.map(c => ({
          ordem_servico_id: osId,
          colaborador_id: c.colaborador_id,
          funcao_id: c.funcao_id || null,
          valor_diaria: parseFloat(c.valor_diaria) || 0,
          dias_trabalhados: parseFloat(c.dias_trabalhados) || 1,
          valor_total: parseFloat(c.valor_total) || 0
        }))
        await supabase.from('os_colaboradores').insert(colaboradoresData)
      }

      // Inserir custos extras
      if (custosExtras.length > 0) {
        const custosData = custosExtras.map(c => ({
          ordem_servico_id: osId,
          tipo: c.tipo,
          descricao: c.descricao,
          valor: parseFloat(c.valor) || 0
        }))
        await supabase.from('os_custos_extras').insert(custosData)
      }

      toast.success(isEditing ? 'OS atualizada!' : 'OS criada!')
      navigate('/ordens-servico')

    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const estados = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']
  const tiposCusto = [
    { value: 'material', label: 'Material' },
    { value: 'alimentacao', label: 'Alimentação' },
    { value: 'hospedagem', label: 'Hospedagem' },
    { value: 'combustivel', label: 'Combustível' },
    { value: 'pedagio', label: 'Pedágio' },
    { value: 'outros', label: 'Outros' }
  ]

  const tabs = [
    { id: 'dados', label: 'Dados Gerais', icon: Calendar },
    { id: 'servicos', label: 'Serviços', icon: Wrench },
    { id: 'equipe', label: 'Equipe', icon: Users },
    { id: 'custos', label: 'Custos', icon: DollarSign },
    { id: 'veiculo', label: 'Veículo', icon: Car },
  ]

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
        <button onClick={() => navigate('/ordens-servico')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? 'Editar Ordem de Serviço' : 'Nova Ordem de Serviço'}
          </h1>
          <p className="text-gray-600">Preencha os dados da OS</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4 overflow-x-auto">
          {tabs.map((tab) => (
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
            </button>
          ))}
        </nav>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Tab: Dados Gerais */}
        {activeTab === 'dados' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informações Principais</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Cliente *</label>
                  <select name="cliente_id" value={formData.cliente_id} onChange={handleChange} className="input-field" required>
                    <option value="">Selecione um cliente...</option>
                    {clientes?.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Empresa Contratante</label>
                  <select name="empresa_contratante_id" value={formData.empresa_contratante_id} onChange={handleChange} className="input-field">
                    <option value="">Selecione...</option>
                    {empresas?.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Data de Agendamento</label>
                  <input type="date" name="data_agendamento" value={formData.data_agendamento} onChange={handleChange} className="input-field" />
                </div>
                <div>
                  <label className="label">Previsão de Duração (horas)</label>
                  <input type="number" name="previsao_duracao" value={formData.previsao_duracao} onChange={handleChange} className="input-field" min="1" />
                </div>
                <div>
                  <label className="label">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="input-field">
                    <option value="agendada">Agendada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="pausada">Pausada</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
                    <option value="com_pendencia">Com Pendência</option>
                  </select>
                </div>
                <div>
                  <label className="label">Prioridade</label>
                  <select name="prioridade" value={formData.prioridade} onChange={handleChange} className="input-field">
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div>
                  <label className="label">Equipe</label>
                  <select name="equipe_id" value={formData.equipe_id} onChange={handleChange} className="input-field">
                    <option value="">Selecione uma equipe...</option>
                    {equipes?.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Local do Serviço</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="label">Endereço</label>
                  <input type="text" name="endereco" value={formData.endereco} onChange={handleChange} className="input-field" placeholder="Rua, número, bairro" />
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="label">Observações (visível para cliente)</label>
                  <textarea name="observacoes" value={formData.observacoes} onChange={handleChange} rows={3} className="input-field" />
                </div>
                <div>
                  <label className="label">Observações Internas</label>
                  <textarea name="observacoes_internas" value={formData.observacoes_internas} onChange={handleChange} rows={3} className="input-field" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Serviços */}
        {activeTab === 'servicos' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Serviços</h2>
              <button type="button" onClick={addServico} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Adicionar Serviço
              </button>
            </div>

            {servicos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum serviço adicionado</p>
            ) : (
              <div className="space-y-3">
                {servicos.map((servico, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="label">Serviço</label>
                      <select
                        value={servico.servico_id}
                        onChange={(e) => updateServico(index, 'servico_id', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Selecione...</option>
                        {servicosDisponiveis?.map(s => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Qtd</label>
                      <input
                        type="number"
                        value={servico.quantidade}
                        onChange={(e) => updateServico(index, 'quantidade', e.target.value)}
                        className="input-field"
                        min="0.01"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Valor Unit.</label>
                      <input
                        type="number"
                        value={servico.valor_unitario}
                        onChange={(e) => updateServico(index, 'valor_unitario', e.target.value)}
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="label">Total</label>
                      <input
                        type="text"
                        value={formatCurrency(servico.valor_total)}
                        className="input-field bg-gray-100"
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeServico(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Serviços</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalServicos)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Equipe */}
        {activeTab === 'equipe' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Colaboradores</h2>
              <button type="button" onClick={addColaborador} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Adicionar Colaborador
              </button>
            </div>

            {colaboradores.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum colaborador adicionado</p>
            ) : (
              <div className="space-y-3">
                {colaboradores.map((col, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="label">Colaborador</label>
                      <select
                        value={col.colaborador_id}
                        onChange={(e) => updateColaborador(index, 'colaborador_id', e.target.value)}
                        className="input-field"
                      >
                        <option value="">Selecione...</option>
                        {colaboradoresDisponiveis?.map(c => (
                          <option key={c.id} value={c.id}>{c.nome} {c.funcao?.nome ? `(${c.funcao.nome})` : ''}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="label">Diária</label>
                      <input
                        type="number"
                        value={col.valor_diaria}
                        onChange={(e) => updateColaborador(index, 'valor_diaria', e.target.value)}
                        className="input-field"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Dias</label>
                      <input
                        type="number"
                        value={col.dias_trabalhados}
                        onChange={(e) => updateColaborador(index, 'dias_trabalhados', e.target.value)}
                        className="input-field"
                        min="0.5"
                        step="0.5"
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="label">Total</label>
                      <input
                        type="text"
                        value={formatCurrency(col.valor_total)}
                        className="input-field bg-gray-100"
                        disabled
                      />
                    </div>
                    <div className="col-span-1">
                      <button type="button" onClick={() => removeColaborador(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
                <div className="flex justify-end pt-4 border-t">
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Mão de Obra</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalMaoObra)}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Custos */}
        {activeTab === 'custos' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">Custos Extras</h2>
                <button type="button" onClick={addCustoExtra} className="btn-secondary text-sm">
                  <Plus className="w-4 h-4" /> Adicionar Custo
                </button>
              </div>

              {custosExtras.length === 0 ? (
                <p className="text-gray-500 text-center py-8">Nenhum custo extra adicionado</p>
              ) : (
                <div className="space-y-3">
                  {custosExtras.map((custo, index) => (
                    <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-3">
                        <label className="label">Tipo</label>
                        <select
                          value={custo.tipo}
                          onChange={(e) => updateCustoExtra(index, 'tipo', e.target.value)}
                          className="input-field"
                        >
                          {tiposCusto.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-span-5">
                        <label className="label">Descrição</label>
                        <input
                          type="text"
                          value={custo.descricao}
                          onChange={(e) => updateCustoExtra(index, 'descricao', e.target.value)}
                          className="input-field"
                          placeholder="Descrição do custo"
                        />
                      </div>
                      <div className="col-span-3">
                        <label className="label">Valor</label>
                        <input
                          type="number"
                          value={custo.valor}
                          onChange={(e) => updateCustoExtra(index, 'valor', e.target.value)}
                          className="input-field"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-1">
                        <button type="button" onClick={() => removeCustoExtra(index)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-end pt-4 border-t">
                    <div className="text-right">
                      <p className="text-sm text-gray-500">Total Custos Extras</p>
                      <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCustosExtras)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Valor Materiais</label>
                  <input 
                    type="text" 
                    name="valor_materiais" 
                    value={formData.valor_materiais} 
                    onChange={handleMoneyChange('valor_materiais')} 
                    className="input-field" 
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="label">Valor Deslocamento</label>
                  <input 
                    type="text" 
                    name="valor_deslocamento" 
                    value={formData.valor_deslocamento} 
                    onChange={handleMoneyChange('valor_deslocamento')} 
                    className="input-field" 
                    placeholder="R$ 0,00"
                  />
                </div>
                <div>
                  <label className="label">Valor Total da OS</label>
                  <input 
                    type="text" 
                    name="valor_total" 
                    value={formData.valor_total} 
                    onChange={handleMoneyChange('valor_total')} 
                    className="input-field" 
                    placeholder={formatCurrency(totalServicos)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Veículo */}
        {activeTab === 'veiculo' && (
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Veículo</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">Veículo</label>
                <select name="veiculo_id" value={formData.veiculo_id} onChange={handleChange} className="input-field">
                  <option value="">Selecione um veículo...</option>
                  {veiculos?.map(v => (
                    <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">KM Inicial</label>
                <input type="number" name="km_inicial" value={formData.km_inicial} onChange={handleChange} className="input-field" min="0" />
              </div>
            </div>
          </div>
        )}

        {/* Resumo e Botões */}
        <div className="card bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex gap-6">
              <div>
                <p className="text-xs text-gray-500">Serviços</p>
                <p className="font-bold text-gray-900">{formatCurrency(totalServicos)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Mão de Obra</p>
                <p className="font-bold text-gray-900">{formatCurrency(totalMaoObra)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Custos Extras</p>
                <p className="font-bold text-gray-900">{formatCurrency(totalCustosExtras)}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => navigate('/ordens-servico')} className="btn-secondary">
                Cancelar
              </button>
              <button type="submit" disabled={loading} className="btn-primary">
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                {loading ? 'Salvando...' : 'Salvar OS'}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  )
}

export default OrdemServicoForm
