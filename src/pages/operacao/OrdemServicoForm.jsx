import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Save, Loader2, Plus, Trash2, MapPin, Calendar, Users, Wrench, 
  DollarSign, Car, FileText, Image, Video, Upload, Eye, X, Navigation, Crosshair,
  TrendingUp, TrendingDown, Fuel, Coffee, UtensilsCrossed, Calculator, AlertCircle,
  CheckCircle, Percent
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// MÁSCARA DE MOEDA - R$ 0.000.000,00
// ============================================

const maskMoney = (value) => {
  if (!value) return ''
  let numbers = value.toString().replace(/\D/g, '')
  if (!numbers || numbers === '0') return ''
  numbers = numbers.replace(/^0+/, '')
  if (!numbers) return ''
  numbers = numbers.padStart(3, '0')
  const cents = numbers.slice(-2)
  let reais = numbers.slice(0, -2)
  reais = reais.replace(/^0+/, '') || '0'
  reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `R$ ${reais},${cents}`
}

const parseMoney = (value) => {
  if (!value) return null
  const numbers = value.replace('R$', '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.')
  const parsed = parseFloat(numbers)
  return isNaN(parsed) ? null : parsed
}

const formatMoneyFromDB = (value) => {
  if (!value && value !== 0) return ''
  const cents = Math.round(value * 100).toString()
  return maskMoney(cents)
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  const num = parseFloat(value)
  const cents = Math.round(num * 100).toString().padStart(3, '0')
  const centsStr = cents.slice(-2)
  let reais = cents.slice(0, -2)
  reais = reais.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  if (!reais) reais = '0'
  return `R$ ${reais},${centsStr}`
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
    cliente_endereco_id: '',
    equipe_id: '',
    empresa_contratante_id: '',
    data_agendamento: '',
    previsao_duracao: '',
    endereco: '',
    cidade: '',
    estado: '',
    cep: '',
    latitude: '',
    longitude: '',
    valor_total: '',
    valor_mao_obra: '',
    valor_materiais: '',
    valor_deslocamento: '',
    status: 'agendada',
    prioridade: 'normal',
    observacoes: '',
    observacoes_internas: '',
    veiculo_id: '',
    km_inicial: '',
    valor_gasolina_extra: '' // NOVO: campo para gasolina extra
  })

  const [servicos, setServicos] = useState([])
  const [colaboradores, setColaboradores] = useState([])
  const [custosExtras, setCustosExtras] = useState([])
  const [anexos, setAnexos] = useState([])
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  const [enderecosObra, setEnderecosObra] = useState([])
  const [loadingEnderecos, setLoadingEnderecos] = useState(false)

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

  // ATUALIZADO: Buscar colaboradores COM os campos de custos diários
  const { data: colaboradoresDisponiveis } = useQuery({
    queryKey: ['colaboradores-select-custos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('colaboradores')
        .select(`
          id, nome, 
          funcao:funcoes(id, nome, valor_diaria, valor_meia_diaria),
          valor_cafe_dia,
          valor_almoco_dia,
          valor_transporte_dia,
          valor_outros_dia
        `)
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  // ATUALIZADO: Buscar veículos COM os campos de custos diários
  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-select-custos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, valor_aluguel_dia, valor_gasolina_dia')
        .eq('ativo', true)
        .order('modelo')
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
      const { data: os, error } = await supabase
        .from('ordens_servico')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error

      setFormData({
        cliente_id: os.cliente_id || '',
        cliente_endereco_id: os.cliente_endereco_id || '',
        equipe_id: os.equipe_id || '',
        empresa_contratante_id: os.empresa_contratante_id || '',
        data_agendamento: os.data_agendamento || '',
        previsao_duracao: os.previsao_duracao || '',
        endereco: os.endereco || '',
        cidade: os.cidade || '',
        estado: os.estado || '',
        cep: os.cep || '',
        latitude: os.latitude || '',
        longitude: os.longitude || '',
        valor_total: formatMoneyFromDB(os.valor_total),
        valor_mao_obra: os.valor_mao_obra || '',
        valor_materiais: formatMoneyFromDB(os.valor_materiais),
        valor_deslocamento: formatMoneyFromDB(os.valor_deslocamento),
        status: os.status || 'agendada',
        prioridade: os.prioridade || 'normal',
        observacoes: os.observacoes || '',
        observacoes_internas: os.observacoes_internas || '',
        veiculo_id: os.veiculo_id || '',
        km_inicial: os.km_inicial || '',
        valor_gasolina_extra: formatMoneyFromDB(os.valor_gasolina_extra)
      })

      // Carregar endereços
      if (os.cliente_id) {
        const { data: enderecosData } = await supabase
          .from('cliente_enderecos')
          .select('*')
          .eq('cliente_id', os.cliente_id)
          .eq('ativo', true)
          .order('is_principal', { ascending: false })
        setEnderecosObra(enderecosData || [])
      }

      // Carregar anexos
      const { data: osAnexos } = await supabase
        .from('os_anexos')
        .select('*')
        .eq('ordem_servico_id', id)
        .eq('ativo', true)
      setAnexos(osAnexos || [])

      // Carregar serviços
      const { data: osServicos } = await supabase
        .from('os_servicos')
        .select('*, servico:servicos(nome)')
        .eq('ordem_servico_id', id)
      setServicos(osServicos?.map(s => ({ ...s, servico_nome: s.servico?.nome })) || [])

      // Carregar colaboradores
      const { data: osColaboradores } = await supabase
        .from('os_colaboradores')
        .select('*, colaborador:colaboradores(nome, valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia), funcao:funcoes(nome)')
        .eq('ordem_servico_id', id)
      setColaboradores(osColaboradores?.map(c => ({
        ...c,
        colaborador_nome: c.colaborador?.nome,
        funcao_nome: c.funcao?.nome,
        valor_cafe_dia: c.colaborador?.valor_cafe_dia || 0,
        valor_almoco_dia: c.colaborador?.valor_almoco_dia || 0,
        valor_transporte_dia: c.colaborador?.valor_transporte_dia || 0,
        valor_outros_dia: c.colaborador?.valor_outros_dia || 0
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

  const handleClienteChange = async (e) => {
    const clienteId = e.target.value
    setFormData(prev => ({ 
      ...prev, 
      cliente_id: clienteId,
      cliente_endereco_id: '',
      endereco: '',
      cidade: '',
      estado: '',
      cep: '',
      latitude: '',
      longitude: ''
    }))
    
    if (clienteId) {
      setLoadingEnderecos(true)
      try {
        const { data, error } = await supabase
          .from('cliente_enderecos')
          .select('*')
          .eq('cliente_id', clienteId)
          .eq('ativo', true)
          .order('is_principal', { ascending: false })
        
        if (!error) {
          setEnderecosObra(data || [])
          const principal = data?.find(e => e.is_principal)
          if (principal) {
            handleEnderecoObraChange({ target: { value: principal.id } }, data)
          }
        }
      } catch (error) {
        console.error('Erro ao carregar endereços:', error)
      } finally {
        setLoadingEnderecos(false)
      }
    } else {
      setEnderecosObra([])
    }
  }

  const handleEnderecoObraChange = (e, enderecosLista = null) => {
    const enderecoId = e.target.value
    const lista = enderecosLista || enderecosObra
    const endereco = lista.find(end => end.id === enderecoId)
    
    if (endereco) {
      setFormData(prev => ({
        ...prev,
        cliente_endereco_id: enderecoId,
        endereco: [endereco.endereco, endereco.numero].filter(Boolean).join(', ') + 
                  (endereco.complemento ? ` - ${endereco.complemento}` : '') +
                  (endereco.bairro ? ` - ${endereco.bairro}` : ''),
        cidade: endereco.cidade || '',
        estado: endereco.estado || '',
        cep: endereco.cep || '',
        latitude: endereco.latitude || '',
        longitude: endereco.longitude || ''
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        cliente_endereco_id: '',
        endereco: '',
        cidade: '',
        estado: '',
        cep: '',
        latitude: '',
        longitude: ''
      }))
    }
  }

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

    if (field === 'servico_id' && value) {
      const servico = servicosDisponiveis?.find(s => s.id === value)
      if (servico) {
        updated[index].valor_unitario = servico.valor_unitario
        updated[index].servico_nome = servico.nome
      }
    }

    if (field === 'quantidade' || field === 'valor_unitario') {
      updated[index].valor_total = (parseFloat(updated[index].quantidade) || 0) * (parseFloat(updated[index].valor_unitario) || 0)
    }

    setServicos(updated)
  }

  const removeServico = (index) => {
    setServicos(servicos.filter((_, i) => i !== index))
  }

  // Funções para Colaboradores - ATUALIZADO para incluir custos
  const addColaborador = () => {
    setColaboradores([...colaboradores, {
      colaborador_id: '',
      funcao_id: '',
      valor_diaria: 0,
      dias_trabalhados: 1,
      valor_total: 0,
      valor_cafe_dia: 0,
      valor_almoco_dia: 0,
      valor_transporte_dia: 0,
      valor_outros_dia: 0,
      isNew: true
    }])
  }

  const updateColaborador = (index, field, value) => {
    const updated = [...colaboradores]
    updated[index][field] = value

    // Se selecionou um colaborador, preencher função, valor e custos
    if (field === 'colaborador_id' && value) {
      const col = colaboradoresDisponiveis?.find(c => c.id === value)
      if (col) {
        updated[index].funcao_id = col.funcao?.id || ''
        updated[index].valor_diaria = col.funcao?.valor_diaria || 0
        updated[index].colaborador_nome = col.nome
        updated[index].funcao_nome = col.funcao?.nome
        // NOVO: Preencher custos do colaborador
        updated[index].valor_cafe_dia = col.valor_cafe_dia || 0
        updated[index].valor_almoco_dia = col.valor_almoco_dia || 0
        updated[index].valor_transporte_dia = col.valor_transporte_dia || 0
        updated[index].valor_outros_dia = col.valor_outros_dia || 0
      }
    }

    // Recalcular valor total da diária
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

  // ============================================
  // CÁLCULOS AUTOMÁTICOS DE CUSTOS
  // ============================================

  // Total dos serviços (RECEITA)
  const totalServicos = servicos.reduce((sum, s) => sum + (parseFloat(s.valor_total) || 0), 0)
  
  // Total de diárias dos colaboradores
  const totalDiarias = colaboradores.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0)

  // NOVO: Custos de alimentação calculados automaticamente
  const custoAlimentacao = colaboradores.reduce((sum, c) => {
    const dias = parseFloat(c.dias_trabalhados) || 0
    const cafe = parseFloat(c.valor_cafe_dia) || 0
    const almoco = parseFloat(c.valor_almoco_dia) || 0
    const transporte = parseFloat(c.valor_transporte_dia) || 0
    const outros = parseFloat(c.valor_outros_dia) || 0
    return sum + (dias * (cafe + almoco + transporte + outros))
  }, 0)

  // NOVO: Custo do veículo calculado automaticamente
  const veiculoSelecionado = veiculos?.find(v => v.id === formData.veiculo_id)
  const custoVeiculoAluguel = parseFloat(veiculoSelecionado?.valor_aluguel_dia) || 0
  const custoVeiculoGasolina = parseFloat(veiculoSelecionado?.valor_gasolina_dia) || 0
  const custoGasolinaExtra = parseMoney(formData.valor_gasolina_extra) || 0
  const custoVeiculoTotal = custoVeiculoAluguel + custoVeiculoGasolina + custoGasolinaExtra

  // Custos extras manuais
  const totalCustosExtras = custosExtras.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0)

  // Total de mão de obra (diárias + alimentação)
  const totalMaoObra = totalDiarias + custoAlimentacao

  // TOTAL DE CUSTOS
  const totalCustos = totalMaoObra + custoVeiculoTotal + totalCustosExtras

  // LUCRO PREVISTO
  const valorReceitaOS = parseMoney(formData.valor_total) || totalServicos
  const lucroPrevisto = valorReceitaOS - totalCustos
  const margemLucro = valorReceitaOS > 0 ? (lucroPrevisto / valorReceitaOS) * 100 : 0

  // ============================================

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
        cliente_endereco_id: formData.cliente_endereco_id || null,
        equipe_id: formData.equipe_id || null,
        empresa_contratante_id: formData.empresa_contratante_id || null,
        data_agendamento: formData.data_agendamento || null,
        previsao_duracao: formData.previsao_duracao ? parseInt(formData.previsao_duracao) : null,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado,
        cep: formData.cep,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        valor_total: parseMoney(formData.valor_total) || totalServicos,
        valor_mao_obra: totalMaoObra,
        valor_materiais: parseMoney(formData.valor_materiais) || 0,
        valor_deslocamento: parseMoney(formData.valor_deslocamento) || 0,
        valor_gasolina_extra: parseMoney(formData.valor_gasolina_extra) || 0,
        status: formData.status,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes,
        observacoes_internas: formData.observacoes_internas,
        veiculo_id: formData.veiculo_id || null,
        km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null
      }

      let osId = id

      if (isEditing) {
        const { error } = await supabase.from('ordens_servico').update(osData).eq('id', id)
        if (error) throw error
        await supabase.from('os_servicos').delete().eq('ordem_servico_id', id)
        await supabase.from('os_colaboradores').delete().eq('ordem_servico_id', id)
        await supabase.from('os_custos_extras').delete().eq('ordem_servico_id', id)
      } else {
        const { count } = await supabase.from('ordens_servico').select('*', { count: 'exact', head: true })
        osData.numero = `OS-${String((count || 0) + 1).padStart(5, '0')}`
        const { data, error } = await supabase.from('ordens_servico').insert([osData]).select().single()
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

      // Upload dos anexos
      const anexosPendentes = anexos.filter(a => a.isTemp && a.file)
      if (anexosPendentes.length > 0) {
        for (const anexo of anexosPendentes) {
          const fileExt = anexo.arquivo_nome.split('.').pop().toLowerCase()
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
          const filePath = `${osId}/${fileName}`
          
          const { error: uploadError } = await supabase.storage.from('os-anexos').upload(filePath, anexo.file)
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from('os-anexos').getPublicUrl(filePath)
            await supabase.from('os_anexos').insert({
              ordem_servico_id: osId,
              nome: anexo.nome,
              tipo: anexo.tipo,
              arquivo_url: publicUrl,
              arquivo_nome: anexo.arquivo_nome,
              arquivo_tamanho: anexo.arquivo_tamanho
            })
          }
        }
      }

      toast.success(isEditing ? 'OS atualizada!' : 'OS criada!')
      navigate('/ordens-servico')

    } catch (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } finally {
      setLoading(false)
    }
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
    { id: 'veiculo', label: 'Veículo', icon: Car },
    { id: 'custos', label: 'Custos', icon: DollarSign },
    { id: 'resumo', label: 'Resumo Financeiro', icon: Calculator },
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
                  <select name="cliente_id" value={formData.cliente_id} onChange={handleClienteChange} className="input-field" required>
                    <option value="">Selecione um cliente...</option>
                    {clientes?.map(c => (
                      <option key={c.id} value={c.id}>{c.nome}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="label flex items-center gap-2">
                    Local da Obra
                    {loadingEnderecos && <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                  </label>
                  <select 
                    name="cliente_endereco_id" 
                    value={formData.cliente_endereco_id} 
                    onChange={handleEnderecoObraChange} 
                    className="input-field"
                    disabled={!formData.cliente_id || loadingEnderecos}
                  >
                    <option value="">
                      {!formData.cliente_id ? 'Selecione um cliente primeiro...' : enderecosObra.length === 0 ? 'Nenhum endereço cadastrado' : 'Selecione o local da obra...'}
                    </option>
                    {enderecosObra.map(end => (
                      <option key={end.id} value={end.id}>
                        {end.nome}{end.is_principal ? ' ⭐' : ''}{end.cidade ? ` - ${end.cidade}/${end.estado}` : ''}
                      </option>
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
                  <label className="label">Status</label>
                  <select name="status" value={formData.status} onChange={handleChange} className="input-field">
                    <option value="agendada">Agendada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="pausada">Pausada</option>
                    <option value="concluida">Concluída</option>
                    <option value="cancelada">Cancelada</option>
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
                {servicos.map((serv, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3 items-end p-3 bg-gray-50 rounded-lg">
                    <div className="col-span-4">
                      <label className="label">Serviço</label>
                      <select
                        value={serv.servico_id}
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
                        value={serv.quantidade}
                        onChange={(e) => updateServico(index, 'quantidade', e.target.value)}
                        className="input-field"
                        min="1"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="label">Valor Unit.</label>
                      <input
                        type="number"
                        value={serv.valor_unitario}
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
                        value={formatCurrency(serv.valor_total)}
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
                    <p className="text-sm text-gray-500">Total Serviços (Receita)</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(totalServicos)}</p>
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
              <h2 className="text-lg font-semibold text-gray-900">Equipe</h2>
              <button type="button" onClick={addColaborador} className="btn-secondary text-sm">
                <Plus className="w-4 h-4" /> Adicionar Colaborador
              </button>
            </div>

            {colaboradores.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum colaborador adicionado</p>
            ) : (
              <div className="space-y-4">
                {colaboradores.map((col, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-4">
                        <label className="label">Colaborador</label>
                        <select
                          value={col.colaborador_id}
                          onChange={(e) => updateColaborador(index, 'colaborador_id', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Selecione...</option>
                          {colaboradoresDisponiveis?.map(c => (
                            <option key={c.id} value={c.id}>{c.nome} - {c.funcao?.nome || 'Sem função'}</option>
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
                        <label className="label">Total Diária</label>
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

                    {/* Custos adicionais do colaborador */}
                    {col.colaborador_id && (col.valor_cafe_dia > 0 || col.valor_almoco_dia > 0 || col.valor_transporte_dia > 0 || col.valor_outros_dia > 0) && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <p className="text-xs text-gray-500 mb-2">Custos adicionais por dia trabalhado:</p>
                        <div className="flex flex-wrap gap-2">
                          {col.valor_cafe_dia > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                              <Coffee className="w-3 h-3" /> Café: {formatCurrency(col.valor_cafe_dia)}
                            </span>
                          )}
                          {col.valor_almoco_dia > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                              <UtensilsCrossed className="w-3 h-3" /> Almoço: {formatCurrency(col.valor_almoco_dia)}
                            </span>
                          )}
                          {col.valor_transporte_dia > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                              Transporte: {formatCurrency(col.valor_transporte_dia)}
                            </span>
                          )}
                          {col.valor_outros_dia > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                              Outros: {formatCurrency(col.valor_outros_dia)}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-2">
                          Total adicional: {formatCurrency((col.valor_cafe_dia + col.valor_almoco_dia + col.valor_transporte_dia + col.valor_outros_dia) * col.dias_trabalhados)}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
                
                <div className="flex justify-between items-center pt-4 border-t">
                  <div>
                    <p className="text-sm text-gray-500">Diárias: {formatCurrency(totalDiarias)}</p>
                    <p className="text-sm text-gray-500">Alimentação/Transporte: {formatCurrency(custoAlimentacao)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Total Mão de Obra</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalMaoObra)}</p>
                  </div>
                </div>
              </div>
            )}
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

            {/* Custos do veículo selecionado */}
            {veiculoSelecionado && (
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Custos do Veículo
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 text-blue-600 mb-1">
                      <Car className="w-4 h-4" />
                      <span className="text-sm font-medium">Aluguel/Dia</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(custoVeiculoAluguel)}</p>
                  </div>
                  
                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 text-orange-600 mb-1">
                      <Fuel className="w-4 h-4" />
                      <span className="text-sm font-medium">Gasolina Padrão</span>
                    </div>
                    <p className="text-lg font-bold">{formatCurrency(custoVeiculoGasolina)}</p>
                  </div>

                  <div className="p-3 bg-white rounded-lg border">
                    <div className="flex items-center gap-2 text-red-600 mb-1">
                      <Fuel className="w-4 h-4" />
                      <span className="text-sm font-medium">Gasolina Extra</span>
                    </div>
                    <input 
                      type="text"
                      name="valor_gasolina_extra"
                      value={formData.valor_gasolina_extra}
                      onChange={handleMoneyChange('valor_gasolina_extra')}
                      className="input-field"
                      placeholder="R$ 0,00"
                    />
                    <p className="text-xs text-gray-500 mt-1">Para OS distantes</p>
                  </div>
                </div>

                <div className="mt-4 p-3 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg border border-blue-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Custo Total do Veículo:</span>
                    <span className="text-xl font-bold text-gray-900">{formatCurrency(custoVeiculoTotal)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab: Custos Extras */}
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
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Valores da OS</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="label">Valor Materiais</label>
                  <input type="text" name="valor_materiais" value={formData.valor_materiais} onChange={handleMoneyChange('valor_materiais')} className="input-field" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="label">Valor Deslocamento</label>
                  <input type="text" name="valor_deslocamento" value={formData.valor_deslocamento} onChange={handleMoneyChange('valor_deslocamento')} className="input-field" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="label">Valor Total da OS (Receita)</label>
                  <input type="text" name="valor_total" value={formData.valor_total} onChange={handleMoneyChange('valor_total')} className="input-field" placeholder={formatCurrency(totalServicos)} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Resumo Financeiro - NOVA */}
        {activeTab === 'resumo' && (
          <div className="space-y-6">
            {/* Painel Principal */}
            <div className="card bg-gradient-to-br from-gray-50 to-blue-50">
              <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-blue-600" />
                Resumo Financeiro da OS
              </h2>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Receita */}
                <div className="bg-white rounded-xl p-5 border-2 border-green-200">
                  <div className="flex items-center gap-2 text-green-600 mb-4">
                    <TrendingUp className="w-5 h-5" />
                    <h3 className="font-semibold">RECEITA</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Serviços</span>
                      <span>{formatCurrency(totalServicos)}</span>
                    </div>
                    {(parseMoney(formData.valor_total) || 0) !== totalServicos && (parseMoney(formData.valor_total) || 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">Valor Ajustado</span>
                        <span>{formatCurrency(parseMoney(formData.valor_total))}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <div className="flex justify-between">
                      <span className="font-medium text-green-700">Total Receita</span>
                      <span className="text-2xl font-bold text-green-600">{formatCurrency(valorReceitaOS)}</span>
                    </div>
                  </div>
                </div>

                {/* Custos */}
                <div className="bg-white rounded-xl p-5 border-2 border-red-200">
                  <div className="flex items-center gap-2 text-red-600 mb-4">
                    <TrendingDown className="w-5 h-5" />
                    <h3 className="font-semibold">CUSTOS</h3>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Diárias</span>
                      <span>{formatCurrency(totalDiarias)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Alimentação/Transporte</span>
                      <span>{formatCurrency(custoAlimentacao)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Veículo</span>
                      <span>{formatCurrency(custoVeiculoTotal)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Custos Extras</span>
                      <span>{formatCurrency(totalCustosExtras)}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-red-200">
                    <div className="flex justify-between">
                      <span className="font-medium text-red-700">Total Custos</span>
                      <span className="text-2xl font-bold text-red-600">{formatCurrency(totalCustos)}</span>
                    </div>
                  </div>
                </div>

                {/* Lucro */}
                <div className={`rounded-xl p-5 border-2 ${lucroPrevisto >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                  <div className={`flex items-center gap-2 mb-4 ${lucroPrevisto >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                    {lucroPrevisto >= 0 ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
                    <h3 className="font-semibold">RESULTADO</h3>
                  </div>
                  
                  <div className="text-center py-4">
                    <p className={`text-4xl font-bold ${lucroPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(lucroPrevisto)}
                    </p>
                    <p className={`text-sm mt-2 ${lucroPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {lucroPrevisto >= 0 ? 'Lucro Previsto' : 'Prejuízo Previsto'}
                    </p>
                  </div>

                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center gap-2">
                      <Percent className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-600">Margem de Lucro:</span>
                      <span className={`font-bold ${margemLucro >= 30 ? 'text-green-600' : margemLucro >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {margemLucro.toFixed(1)}%
                      </span>
                    </div>
                    {margemLucro < 30 && margemLucro >= 0 && (
                      <p className="text-xs text-center text-yellow-600 mt-2">
                        ⚠️ Margem abaixo do ideal (30%)
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Detalhamento */}
              <div className="mt-6 p-4 bg-white rounded-xl border">
                <h4 className="font-medium text-gray-700 mb-3">📊 Detalhamento dos Custos</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="p-3 bg-blue-50 rounded-lg text-center">
                    <p className="text-blue-600 font-medium">Mão de Obra</p>
                    <p className="text-lg font-bold text-blue-700">{formatCurrency(totalMaoObra)}</p>
                    <p className="text-xs text-blue-500">{totalCustos > 0 ? ((totalMaoObra / totalCustos) * 100).toFixed(0) : 0}% do custo</p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <p className="text-orange-600 font-medium">Veículo</p>
                    <p className="text-lg font-bold text-orange-700">{formatCurrency(custoVeiculoTotal)}</p>
                    <p className="text-xs text-orange-500">{totalCustos > 0 ? ((custoVeiculoTotal / totalCustos) * 100).toFixed(0) : 0}% do custo</p>
                  </div>
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <p className="text-purple-600 font-medium">Extras</p>
                    <p className="text-lg font-bold text-purple-700">{formatCurrency(totalCustosExtras)}</p>
                    <p className="text-xs text-purple-500">{totalCustos > 0 ? ((totalCustosExtras / totalCustos) * 100).toFixed(0) : 0}% do custo</p>
                  </div>
                  <div className="p-3 bg-gray-100 rounded-lg text-center">
                    <p className="text-gray-600 font-medium">Colaboradores</p>
                    <p className="text-lg font-bold text-gray-700">{colaboradores.length}</p>
                    <p className="text-xs text-gray-500">pessoas na equipe</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Resumo e Botões */}
        <div className="card bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-gray-500">Receita</p>
                <p className="font-bold text-green-600">{formatCurrency(valorReceitaOS)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Custos</p>
                <p className="font-bold text-red-600">{formatCurrency(totalCustos)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Lucro</p>
                <p className={`font-bold ${lucroPrevisto >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(lucroPrevisto)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Margem</p>
                <p className={`font-bold ${margemLucro >= 30 ? 'text-green-600' : margemLucro >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                  {margemLucro.toFixed(1)}%
                </p>
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
