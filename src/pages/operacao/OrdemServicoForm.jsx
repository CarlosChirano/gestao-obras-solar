import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Save, Loader2, Plus, Trash2, MapPin, Calendar, Users, Wrench, 
  DollarSign, Car, FileText, Image, Video, Upload, Eye, X, Navigation, 
  Crosshair, ClipboardCheck, CalendarDays, CheckCircle, AlertTriangle,
  Receipt, TrendingUp, TrendingDown, Sun
} from 'lucide-react'
import toast from 'react-hot-toast'
import DiarioObra from './DiarioObra'

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
  const queryClient = useQueryClient()

  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(false)
  const [activeTab, setActiveTab] = useState('dados')

  // Modal de confirmação de lançamentos
  const [showLancamentosModal, setShowLancamentosModal] = useState(false)
  const [lancamentosPreview, setLancamentosPreview] = useState(null)
  const [statusAnterior, setStatusAnterior] = useState('')

  // Dados básicos da OS
  const [formData, setFormData] = useState({
    cliente_id: '',
    cliente_endereco_id: '',
    equipe_id: '',
    empresa_contratante_id: '',
    data_agendamento: '',
    previsao_duracao: '',
    previsao_dias: 1,
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
    // Campos Energia Solar
    quantidade_placas: '',
    tipo_telhado: '',
    potencia_kwp: '',
    tipo_servico_solar: ''
  })

  // Serviços da OS
  const [servicos, setServicos] = useState([])
  
  // Colaboradores da OS
  const [colaboradores, setColaboradores] = useState([])
  
  // Custos extras
  const [custosExtras, setCustosExtras] = useState([])
  
  // Anexos da OS
  const [anexos, setAnexos] = useState([])
  const [uploadingAnexo, setUploadingAnexo] = useState(false)
  
  // Endereços de obras do cliente selecionado
  const [enderecosObra, setEnderecosObra] = useState([])
  const [loadingEnderecos, setLoadingEnderecos] = useState(false)

  // Checklists selecionados para a OS
  const [checklistsSelecionados, setChecklistsSelecionados] = useState([])

  // Dados completos da OS para o DiarioObra
  const [ordemServicoCompleta, setOrdemServicoCompleta] = useState(null)

  // Sugestão de preço baseado na potência
  const [sugestaoPreco, setSugestaoPreco] = useState(null)

  // Buscar clientes
  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await supabase.from('clientes').select('id, nome').eq('ativo', true).order('nome')
      return data
    }
  })

  // Buscar equipes com membros
  const { data: equipes } = useQuery({
    queryKey: ['equipes-com-membros'],
    queryFn: async () => {
      const { data } = await supabase
        .from('equipes')
        .select(`
          id, nome, cor,
          equipe_membros(
            id,
            colaborador_id,
            funcao_na_equipe,
            colaborador:colaboradores(id, nome, valor_diaria, pix, valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia, funcao:funcoes(nome, valor_diaria))
          )
        `)
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  // Estado para equipes selecionadas
  const [equipesSelecionadas, setEquipesSelecionadas] = useState([])

  // Buscar empresas
  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase.from('empresas_contratantes').select('id, nome').eq('ativo', true).order('nome')
      return data
    }
  })

  // Buscar serviços disponíveis
  const { data: servicosDisponiveis } = useQuery({
    queryKey: ['servicos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('servicos').select('*').eq('ativo', true).order('nome')
      return data
    }
  })

  // Buscar colaboradores
  const { data: colaboradoresDisponiveis } = useQuery({
    queryKey: ['colaboradores-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('colaboradores')
        .select('id, nome, pix, valor_diaria, funcao:funcoes(id, nome, valor_diaria), valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia')
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  // Buscar veículos
  const { data: veiculos } = useQuery({
    queryKey: ['veiculos-select'],
    queryFn: async () => {
      const { data } = await supabase.from('veiculos').select('id, placa, modelo, valor_aluguel_dia, valor_gasolina_dia, valor_gelo_dia').eq('ativo', true).order('modelo')
      return data
    }
  })

  // Buscar faixas de preço de venda
  const { data: faixasVenda } = useQuery({
    queryKey: ['faixas-preco-venda'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faixas_preco_venda')
        .select('*')
        .eq('ativo', true)
        .order('kwp_min')
      return data
    }
  })

  // Buscar faixas de preço de custo
  const { data: faixasCusto } = useQuery({
    queryKey: ['faixas-preco-custo'],
    queryFn: async () => {
      const { data } = await supabase
        .from('faixas_preco_custo')
        .select('*')
        .eq('ativo', true)
        .order('kwp_min')
      return data
    }
  })

  // Estado para múltiplos veículos na OS
  const [veiculosOS, setVeiculosOS] = useState([])

  // Buscar modelos de checklist
  const { data: checklistModelos } = useQuery({
    queryKey: ['checklist-modelos'],
    queryFn: async () => {
      const { data } = await supabase
        .from('checklist_modelos')
        .select('id, nome, descricao, tipo')
        .eq('ativo', true)
        .order('nome')
      return data
    }
  })

  // Buscar contas bancárias para os lançamentos
  const { data: contasBancarias } = useQuery({
    queryKey: ['contas-bancarias'],
    queryFn: async () => {
      const { data } = await supabase
        .from('contas_bancarias')
        .select('id, nome, tipo')
        .eq('ativo', true)
        .order('nome')
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

      setOrdemServicoCompleta(os)
      setStatusAnterior(os.status)

      setFormData({
        cliente_id: os.cliente_id || '',
        cliente_endereco_id: os.cliente_endereco_id || '',
        equipe_id: os.equipe_id || '',
        empresa_contratante_id: os.empresa_contratante_id || '',
        data_agendamento: os.data_agendamento || '',
        previsao_duracao: os.previsao_duracao || '',
        previsao_dias: os.previsao_dias || 1,
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
        // Campos Energia Solar
        quantidade_placas: os.quantidade_placas || '',
        tipo_telhado: os.tipo_telhado || '',
        potencia_kwp: os.potencia_kwp || '',
        tipo_servico_solar: os.tipo_servico_solar || ''
      })

      if (os.cliente_id) {
        const { data: enderecosData } = await supabase
          .from('cliente_enderecos')
          .select('*')
          .eq('cliente_id', os.cliente_id)
          .eq('ativo', true)
          .order('is_principal', { ascending: false })
          .order('nome')
        setEnderecosObra(enderecosData || [])
      }

      const { data: osAnexos } = await supabase
        .from('os_anexos')
        .select('*')
        .eq('ordem_servico_id', id)
        .eq('ativo', true)
      setAnexos(osAnexos || [])

      const { data: osServicos } = await supabase
        .from('os_servicos')
        .select('*, servico:servicos(nome)')
        .eq('ordem_servico_id', id)

      setServicos(osServicos?.map(s => ({
        ...s,
        servico_nome: s.servico?.nome
      })) || [])

      const { data: osColaboradores } = await supabase
        .from('os_colaboradores')
        .select('*, colaborador:colaboradores(nome, pix), funcao:funcoes(nome)')
        .eq('ordem_servico_id', id)

      setColaboradores(osColaboradores?.map(c => ({
        ...c,
        colaborador_nome: c.colaborador?.nome,
        colaborador_pix: c.colaborador?.pix,
        funcao_nome: c.funcao?.nome
      })) || [])

      const { data: osCustos } = await supabase
        .from('os_custos_extras')
        .select('*')
        .eq('ordem_servico_id', id)

      setCustosExtras(osCustos || [])

      // Carregar múltiplos veículos da OS
      const { data: osVeiculos } = await supabase
        .from('os_veiculos')
        .select('*, veiculo:veiculos(modelo, placa)')
        .eq('ordem_servico_id', id)

      if (osVeiculos && osVeiculos.length > 0) {
        setVeiculosOS(osVeiculos.map(v => ({
          ...v,
          veiculo_info: v.veiculo ? `${v.veiculo.modelo} - ${v.veiculo.placa}` : ''
        })))
      } else if (os.veiculo_id) {
        // Compatibilidade: se tem veículo antigo no campo único, adicionar à lista
        const v = veiculos?.find(vei => vei.id === os.veiculo_id)
        if (v) {
          const dias = os.previsao_dias || 1
          setVeiculosOS([{
            veiculo_id: os.veiculo_id,
            km_inicial: os.km_inicial || '',
            valor_aluguel: parseFloat(v.valor_aluguel_dia) || 0,
            valor_gasolina: parseFloat(v.valor_gasolina_dia) || 0,
            valor_gelo: parseFloat(v.valor_gelo_dia) || 0,
            dias: dias,
            valor_total: ((parseFloat(v.valor_aluguel_dia) || 0) + (parseFloat(v.valor_gasolina_dia) || 0) + (parseFloat(v.valor_gelo_dia) || 0)) * dias,
            veiculo_info: `${v.modelo} - ${v.placa}`
          }])
        }
      }

      const { data: osChecklists } = await supabase
        .from('os_checklists')
        .select('*, checklist_modelo:checklist_modelos(id, nome)')
        .eq('ordem_servico_id', id)

      setChecklistsSelecionados(osChecklists?.map(c => ({
        checklist_modelo_id: c.checklist_modelo_id,
        tipo: c.tipo,
        nome: c.checklist_modelo?.nome
      })) || [])

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
    
    // Se mudou a potência, buscar sugestão de preço
    if (name === 'potencia_kwp') {
      buscarSugestaoPreco(value)
    }
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
          .order('nome')
        
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
        cliente_endereco_id: ''
      }))
    }
  }

  const handleMoneyChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: maskMoney(value) }))
  }

  // Buscar sugestão de preço baseado na potência
  const buscarSugestaoPreco = (potencia) => {
    if (!potencia || potencia <= 0 || !faixasVenda || !faixasCusto) {
      setSugestaoPreco(null)
      return
    }

    const kwp = parseFloat(potencia)
    
    // Buscar faixa de venda
    const faixaVenda = faixasVenda?.find(f => kwp >= parseFloat(f.kwp_min) && kwp <= parseFloat(f.kwp_max))
    // Buscar faixa de custo
    const faixaCusto = faixasCusto?.find(f => kwp >= parseFloat(f.kwp_min) && kwp <= parseFloat(f.kwp_max))

    if (faixaVenda || faixaCusto) {
      const valorVenda = parseFloat(faixaVenda?.valor) || 0
      const valorCusto = parseFloat(faixaCusto?.valor) || 0
      setSugestaoPreco({
        valorVenda,
        valorCusto,
        descricaoVenda: faixaVenda?.descricao || '',
        descricaoCusto: faixaCusto?.descricao || '',
        margem: valorVenda - valorCusto
      })
    } else {
      setSugestaoPreco(null)
    }
  }

  // Aplicar sugestão de preço
  const aplicarSugestaoPreco = () => {
    if (sugestaoPreco) {
      setFormData(prev => ({
        ...prev,
        valor_total: formatMoneyFromDB(sugestaoPreco.valorVenda)
      }))
      toast.success('Valor de venda aplicado!')
    }
  }

  // Atualizar sugestão quando potência muda
  useEffect(() => {
    if (formData.potencia_kwp && faixasVenda && faixasCusto) {
      buscarSugestaoPreco(formData.potencia_kwp)
    }
  }, [formData.potencia_kwp, faixasVenda, faixasCusto])

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
        updated[index].descricao = servico.nome
        updated[index].valor_unitario = servico.preco || 0
        updated[index].valor_total = (updated[index].quantidade || 1) * (servico.preco || 0)
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

  // Funções para Colaboradores
  const addColaborador = () => {
    setColaboradores([...colaboradores, {
      colaborador_id: '',
      funcao_id: '',
      valor_diaria: 0,
      dias_trabalhados: formData.previsao_dias || 1,
      valor_total: 0,
      // Custos diários (do cadastro)
      valor_cafe_dia: 0,
      valor_almoco_dia: 0,
      valor_transporte_dia: 0,
      valor_outros_dia: 0,
      // Custos calculados (para salvar)
      valor_cafe: 0,
      valor_almoco: 0,
      valor_transporte: 0,
      valor_outros: 0,
      isNew: true
    }])
  }

  // Função para selecionar/desmarcar equipe
  const handleToggleEquipe = (equipe) => {
    const isSelected = equipesSelecionadas.includes(equipe.id)
    
    if (isSelected) {
      // Remover equipe e seus membros
      setEquipesSelecionadas(prev => prev.filter(id => id !== equipe.id))
      
      // Remover colaboradores que vieram dessa equipe
      const membrosIds = equipe.equipe_membros?.map(m => m.colaborador_id) || []
      setColaboradores(prev => prev.filter(c => !membrosIds.includes(c.colaborador_id) || !c.fromEquipe))
    } else {
      // Adicionar equipe
      setEquipesSelecionadas(prev => [...prev, equipe.id])
      
      // Adicionar membros da equipe
      const novosMembros = equipe.equipe_membros?.map(membro => {
        const col = membro.colaborador
        const valorDiaria = parseFloat(col?.valor_diaria) || parseFloat(col?.funcao?.valor_diaria) || 0
        const dias = parseFloat(formData.previsao_dias) || 1
        // Custos diários do cadastro do colaborador
        const cafeDia = parseFloat(col?.valor_cafe_dia) || 0
        const almocoDia = parseFloat(col?.valor_almoco_dia) || 0
        const transporteDia = parseFloat(col?.valor_transporte_dia) || 0
        const outrosDia = parseFloat(col?.valor_outros_dia) || 0
        // Custo total = (diária + custos) × dias
        const custoDiario = valorDiaria + cafeDia + almocoDia + transporteDia + outrosDia
        return {
          colaborador_id: membro.colaborador_id,
          funcao_id: col?.funcao?.id || '',
          valor_diaria: valorDiaria,
          dias_trabalhados: dias,
          valor_total: dias * custoDiario,
          colaborador_nome: col?.nome,
          colaborador_pix: col?.pix,
          funcao_nome: membro.funcao_na_equipe || col?.funcao?.nome,
          // Custos diários (do cadastro)
          valor_cafe_dia: cafeDia,
          valor_almoco_dia: almocoDia,
          valor_transporte_dia: transporteDia,
          valor_outros_dia: outrosDia,
          // Custos calculados (para salvar)
          valor_cafe: cafeDia * dias,
          valor_almoco: almocoDia * dias,
          valor_transporte: transporteDia * dias,
          valor_outros: outrosDia * dias,
          fromEquipe: equipe.id,
          isNew: true
        }
      }) || []
      
      // Evitar duplicados
      const idsExistentes = colaboradores.map(c => c.colaborador_id)
      const membrosSemDuplicados = novosMembros.filter(m => !idsExistentes.includes(m.colaborador_id))
      
      setColaboradores(prev => [...prev, ...membrosSemDuplicados])
    }
  }

  const updateColaborador = (index, field, value) => {
    const updated = [...colaboradores]
    updated[index][field] = value

    if (field === 'colaborador_id' && value) {
      const col = colaboradoresDisponiveis?.find(c => c.id === value)
      if (col) {
        updated[index].funcao_id = col.funcao?.id || ''
        // Prioriza valor_diaria do colaborador, senão usa da função
        const valorDiaria = parseFloat(col.valor_diaria) || parseFloat(col.funcao?.valor_diaria) || 0
        updated[index].valor_diaria = valorDiaria
        updated[index].colaborador_nome = col.nome
        updated[index].colaborador_pix = col.pix
        updated[index].funcao_nome = col.funcao?.nome
        // Guardar valores de alimentação/transporte do cadastro
        updated[index].valor_cafe_dia = parseFloat(col.valor_cafe_dia) || 0
        updated[index].valor_almoco_dia = parseFloat(col.valor_almoco_dia) || 0
        updated[index].valor_transporte_dia = parseFloat(col.valor_transporte_dia) || 0
        updated[index].valor_outros_dia = parseFloat(col.valor_outros_dia) || 0
        // Calcular total: (diária + café + almoço + transporte + outros) × dias
        const dias = parseFloat(updated[index].dias_trabalhados) || 1
        const custoDiario = valorDiaria + updated[index].valor_cafe_dia + updated[index].valor_almoco_dia + 
                           updated[index].valor_transporte_dia + updated[index].valor_outros_dia
        updated[index].valor_total = dias * custoDiario
        // Guardar valores calculados para salvar no banco
        updated[index].valor_cafe = updated[index].valor_cafe_dia * dias
        updated[index].valor_almoco = updated[index].valor_almoco_dia * dias
        updated[index].valor_transporte = updated[index].valor_transporte_dia * dias
        updated[index].valor_outros = updated[index].valor_outros_dia * dias
      }
    }

    if (field === 'dias_trabalhados' || field === 'valor_diaria') {
      const dias = parseFloat(updated[index].dias_trabalhados) || 0
      const diaria = parseFloat(updated[index].valor_diaria) || 0
      const cafeDia = parseFloat(updated[index].valor_cafe_dia) || 0
      const almocoDia = parseFloat(updated[index].valor_almoco_dia) || 0
      const transporteDia = parseFloat(updated[index].valor_transporte_dia) || 0
      const outrosDia = parseFloat(updated[index].valor_outros_dia) || 0
      // Calcular total: (diária + café + almoço + transporte + outros) × dias
      const custoDiario = diaria + cafeDia + almocoDia + transporteDia + outrosDia
      updated[index].valor_total = dias * custoDiario
      // Atualizar valores calculados
      updated[index].valor_cafe = cafeDia * dias
      updated[index].valor_almoco = almocoDia * dias
      updated[index].valor_transporte = transporteDia * dias
      updated[index].valor_outros = outrosDia * dias
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

  // Funções para Múltiplos Veículos
  const addVeiculoOS = () => {
    setVeiculosOS([...veiculosOS, {
      veiculo_id: '',
      km_inicial: '',
      km_final: '',
      valor_aluguel: 0,
      valor_gasolina: 0,
      valor_gelo: 0,
      dias: formData.previsao_dias || 1,
      valor_total: 0,
      isNew: true
    }])
  }

  const updateVeiculoOS = (index, field, value) => {
    const updated = [...veiculosOS]
    updated[index][field] = value

    if (field === 'veiculo_id' && value) {
      const v = veiculos?.find(v => v.id === value)
      if (v) {
        updated[index].valor_aluguel = parseFloat(v.valor_aluguel_dia) || 0
        updated[index].valor_gasolina = parseFloat(v.valor_gasolina_dia) || 0
        updated[index].valor_gelo = parseFloat(v.valor_gelo_dia) || 0
        updated[index].veiculo_info = `${v.modelo} - ${v.placa}`
      }
    }

    // Recalcular total
    const dias = parseInt(updated[index].dias) || 1
    const aluguel = parseFloat(updated[index].valor_aluguel) || 0
    const gasolina = parseFloat(updated[index].valor_gasolina) || 0
    const gelo = parseFloat(updated[index].valor_gelo) || 0
    updated[index].valor_total = (aluguel + gasolina + gelo) * dias

    setVeiculosOS(updated)
  }

  const removeVeiculoOS = (index) => {
    setVeiculosOS(veiculosOS.filter((_, i) => i !== index))
  }

  // Total de veículos
  const totalVeiculos = veiculosOS.reduce((sum, v) => sum + (parseFloat(v.valor_total) || 0), 0)

  // Funções para Checklists
  const addChecklist = (tipo) => {
    setChecklistsSelecionados([...checklistsSelecionados, {
      checklist_modelo_id: '',
      tipo: tipo,
      nome: ''
    }])
  }

  const updateChecklist = (index, modeloId) => {
    const modelo = checklistModelos?.find(m => m.id === modeloId)
    const updated = [...checklistsSelecionados]
    updated[index] = {
      ...updated[index],
      checklist_modelo_id: modeloId,
      nome: modelo?.nome || ''
    }
    setChecklistsSelecionados(updated)
  }

  const removeChecklist = (index) => {
    setChecklistsSelecionados(checklistsSelecionados.filter((_, i) => i !== index))
  }

  // Calcular totais
  const totalServicos = servicos.reduce((sum, s) => sum + (parseFloat(s.valor_total) || 0), 0)
  const totalMaoObra = colaboradores.reduce((sum, c) => sum + (parseFloat(c.valor_total) || 0), 0)
  const totalCustosExtras = custosExtras.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0)

  // ============================================
  // LANÇAMENTOS AUTOMÁTICOS
  // ============================================

  const calcularLancamentos = () => {
    const cliente = clientes?.find(c => c.id === formData.cliente_id)
    const veiculo = veiculos?.find(v => v.id === formData.veiculo_id)
    const numeroOS = ordemServicoCompleta?.numero_os || 'Nova OS'
    
    const lancamentos = {
      receitas: [],
      despesas: [],
      totalReceitas: 0,
      totalDespesas: 0,
      lucro: 0
    }

    // 1. RECEITA - Valor total dos serviços
    if (totalServicos > 0) {
      lancamentos.receitas.push({
        tipo: 'receita',
        categoria: 'Serviços',
        descricao: `${numeroOS} - ${cliente?.nome || 'Cliente'}`,
        valor: totalServicos,
        data_vencimento: new Date().toISOString().split('T')[0],
        status: 'pendente'
      })
      lancamentos.totalReceitas += totalServicos
    }

    // 2. DESPESAS - Colaboradores (diárias + alimentação)
    colaboradores.forEach(colab => {
      if (!colab.colaborador_id) return
      
      const dias = parseFloat(colab.dias_trabalhados) || 0
      const valorDiaria = parseFloat(colab.valor_diaria) || 0
      const totalDiarias = dias * valorDiaria
      
      // Buscar dados completos do colaborador
      const colabCompleto = colaboradoresDisponiveis?.find(c => c.id === colab.colaborador_id)
      
      // Calcular alimentação
      const cafe = (parseFloat(colabCompleto?.valor_cafe_dia) || 0) * dias
      const almoco = (parseFloat(colabCompleto?.valor_almoco_dia) || 0) * dias
      const transporte = (parseFloat(colabCompleto?.valor_transporte_dia) || 0) * dias
      const outros = (parseFloat(colabCompleto?.valor_outros_dia) || 0) * dias
      const totalAlimentacao = cafe + almoco + transporte + outros
      
      const totalColaborador = totalDiarias + totalAlimentacao

      if (totalColaborador > 0) {
        lancamentos.despesas.push({
          tipo: 'despesa',
          categoria: 'Mão de Obra',
          descricao: `${colab.colaborador_nome || 'Colaborador'} - ${numeroOS}`,
          valor: totalColaborador,
          detalhe: {
            diarias: totalDiarias,
            alimentacao: totalAlimentacao,
            dias: dias,
            pix: colab.colaborador_pix || colabCompleto?.pix
          },
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'pendente',
          colaborador_id: colab.colaborador_id
        })
        lancamentos.totalDespesas += totalColaborador
      }
    })

    // 3. DESPESA - Veículo
    if (veiculo && formData.veiculo_id) {
      const dias = parseInt(formData.previsao_dias) || 1
      const aluguel = (parseFloat(veiculo.valor_aluguel_dia) || 0) * dias
      const gasolina = (parseFloat(veiculo.valor_gasolina_dia) || 0) * dias
      const totalVeiculo = aluguel + gasolina

      if (totalVeiculo > 0) {
        lancamentos.despesas.push({
          tipo: 'despesa',
          categoria: 'Veículos',
          descricao: `${veiculo.modelo} (${veiculo.placa}) - ${numeroOS}`,
          valor: totalVeiculo,
          detalhe: {
            aluguel: aluguel,
            gasolina: gasolina,
            dias: dias
          },
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'pendente',
          veiculo_id: formData.veiculo_id
        })
        lancamentos.totalDespesas += totalVeiculo
      }
    }

    // 4. DESPESAS - Custos Extras
    custosExtras.forEach(custo => {
      const valor = parseFloat(custo.valor) || 0
      if (valor > 0) {
        lancamentos.despesas.push({
          tipo: 'despesa',
          categoria: custo.tipo === 'material' ? 'Materiais' : 
                     custo.tipo === 'alimentacao' ? 'Alimentação' :
                     custo.tipo === 'hospedagem' ? 'Hospedagem' :
                     custo.tipo === 'combustivel' ? 'Combustível' :
                     custo.tipo === 'pedagio' ? 'Pedágio' : 'Outros',
          descricao: `${custo.descricao || custo.tipo} - ${numeroOS}`,
          valor: valor,
          data_vencimento: new Date().toISOString().split('T')[0],
          status: 'pendente'
        })
        lancamentos.totalDespesas += valor
      }
    })

    lancamentos.lucro = lancamentos.totalReceitas - lancamentos.totalDespesas

    return lancamentos
  }

  const gerarLancamentosFinanceiros = async (osId) => {
    const lancamentos = calcularLancamentos()
    const numeroOS = ordemServicoCompleta?.numero_os || `OS-${osId}`
    
    // Conta padrão (primeira conta ativa)
    const contaPadrao = contasBancarias?.[0]?.id

    try {
      // Inserir receitas
      for (const receita of lancamentos.receitas) {
        await supabase.from('lancamentos').insert({
          tipo: 'receita',
          categoria: receita.categoria,
          descricao: receita.descricao,
          valor: receita.valor,
          data_vencimento: receita.data_vencimento,
          status: 'pendente',
          ordem_servico_id: osId,
          conta_bancaria_id: contaPadrao
        })
      }

      // Inserir despesas
      for (const despesa of lancamentos.despesas) {
        await supabase.from('lancamentos').insert({
          tipo: 'despesa',
          categoria: despesa.categoria,
          descricao: despesa.descricao,
          valor: despesa.valor,
          data_vencimento: despesa.data_vencimento,
          status: 'pendente',
          ordem_servico_id: osId,
          conta_bancaria_id: contaPadrao,
          colaborador_id: despesa.colaborador_id || null
        })
      }

      return true
    } catch (error) {
      console.error('Erro ao gerar lançamentos:', error)
      throw error
    }
  }

  // Verificar se deve mostrar modal de lançamentos
  const handleStatusChange = (e) => {
    const novoStatus = e.target.value
    
    // Se está mudando para "concluida" e não estava antes
    if (novoStatus === 'concluida' && statusAnterior !== 'concluida') {
      const lancamentos = calcularLancamentos()
      setLancamentosPreview(lancamentos)
      setShowLancamentosModal(true)
      // Não muda o status ainda, espera confirmação
    } else {
      setFormData(prev => ({ ...prev, status: novoStatus }))
    }
  }

  const confirmarConclusao = () => {
    setFormData(prev => ({ ...prev, status: 'concluida' }))
    setShowLancamentosModal(false)
  }

  const cancelarConclusao = () => {
    setShowLancamentosModal(false)
    setLancamentosPreview(null)
  }

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
        previsao_dias: formData.previsao_dias ? parseInt(formData.previsao_dias) : 1,
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
        status: formData.status,
        prioridade: formData.prioridade,
        observacoes: formData.observacoes,
        observacoes_internas: formData.observacoes_internas,
        veiculo_id: formData.veiculo_id || null,
        km_inicial: formData.km_inicial ? parseFloat(formData.km_inicial) : null,
        // Campos Energia Solar
        quantidade_placas: formData.quantidade_placas ? parseInt(formData.quantidade_placas) : null,
        tipo_telhado: formData.tipo_telhado || null,
        potencia_kwp: formData.potencia_kwp ? parseFloat(formData.potencia_kwp) : null,
        tipo_servico_solar: formData.tipo_servico_solar || null
      }

      let osId = id

      if (isEditing) {
        const { error } = await supabase
          .from('ordens_servico')
          .update(osData)
          .eq('id', id)
        if (error) throw error

        await supabase.from('os_servicos').delete().eq('ordem_servico_id', id)
        await supabase.from('os_colaboradores').delete().eq('ordem_servico_id', id)
        await supabase.from('os_custos_extras').delete().eq('ordem_servico_id', id)
        await supabase.from('os_veiculos').delete().eq('ordem_servico_id', id)
        await supabase.from('os_checklists').delete().eq('ordem_servico_id', id)
      } else {
        const { count } = await supabase
          .from('ordens_servico')
          .select('*', { count: 'exact', head: true })
        
        osData.numero_os = `OS-${String((count || 0) + 1).padStart(5, '0')}`

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

      // Inserir colaboradores - apenas os que têm colaborador_id válido
      console.log('🔍 DEBUG - Colaboradores no estado:', colaboradores)
      console.log('🔍 DEBUG - Total de colaboradores:', colaboradores.length)
      
      const colaboradoresValidos = colaboradores.filter(c => c.colaborador_id)
      console.log('🔍 DEBUG - Colaboradores válidos (com ID):', colaboradoresValidos.length)
      
      if (colaboradoresValidos.length > 0) {
        const colaboradoresData = colaboradoresValidos.map(c => ({
          ordem_servico_id: osId,
          colaborador_id: c.colaborador_id,
          funcao_id: c.funcao_id || null,
          valor_diaria: parseFloat(c.valor_diaria) || 0,
          dias_trabalhados: parseFloat(c.dias_trabalhados) || 1,
          valor_total: parseFloat(c.valor_total) || 0,
          // Novos campos de custos
          valor_cafe: parseFloat(c.valor_cafe) || 0,
          valor_almoco: parseFloat(c.valor_almoco) || 0,
          valor_transporte: parseFloat(c.valor_transporte) || 0,
          valor_outros: parseFloat(c.valor_outros) || 0
        }))
        
        console.log('🔍 DEBUG - Dados a inserir:', JSON.stringify(colaboradoresData, null, 2))
        
        const { data: insertedData, error: errorColaboradores } = await supabase
          .from('os_colaboradores')
          .insert(colaboradoresData)
          .select()
        
        if (errorColaboradores) {
          console.error('❌ ERRO ao inserir colaboradores:', errorColaboradores)
          toast.error('Erro ao salvar colaboradores: ' + errorColaboradores.message)
          throw new Error('Erro ao salvar colaboradores: ' + errorColaboradores.message)
        }
        console.log('✅ Colaboradores salvos com sucesso:', insertedData)
      } else {
        console.log('⚠️ Nenhum colaborador válido para salvar')
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

      // Inserir veículos da OS
      if (veiculosOS.length > 0) {
        const veiculosData = veiculosOS.filter(v => v.veiculo_id).map(v => ({
          ordem_servico_id: osId,
          veiculo_id: v.veiculo_id,
          km_inicial: parseFloat(v.km_inicial) || null,
          km_final: parseFloat(v.km_final) || null,
          valor_aluguel: parseFloat(v.valor_aluguel) || 0,
          valor_gasolina: parseFloat(v.valor_gasolina) || 0,
          valor_gelo: parseFloat(v.valor_gelo) || 0,
          dias: parseInt(v.dias) || 1,
          valor_total: parseFloat(v.valor_total) || 0
        }))
        if (veiculosData.length > 0) {
          await supabase.from('os_veiculos').insert(veiculosData)
        }
      }

      // Inserir checklists selecionados
      if (checklistsSelecionados.length > 0) {
        const checklistsData = checklistsSelecionados
          .filter(c => c.checklist_modelo_id)
          .map((c, index) => ({
            ordem_servico_id: osId,
            checklist_modelo_id: c.checklist_modelo_id,
            tipo: c.tipo,
            ordem: index
          }))
        if (checklistsData.length > 0) {
          await supabase.from('os_checklists').insert(checklistsData)
        }
      }

      // Upload dos anexos pendentes
      const anexosPendentes = anexos.filter(a => a.isTemp && a.file)
      if (anexosPendentes.length > 0) {
        for (const anexo of anexosPendentes) {
          const fileExt = anexo.arquivo_nome.split('.').pop().toLowerCase()
          const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
          const filePath = `${osId}/${fileName}`
          
          const { error: uploadError } = await supabase.storage
            .from('os-anexos')
            .upload(filePath, anexo.file)
          
          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage
              .from('os-anexos')
              .getPublicUrl(filePath)
            
            await supabase
              .from('os_anexos')
              .insert({
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

      // GERAR LANÇAMENTOS AUTOMÁTICOS se status mudou para concluída
      if (formData.status === 'concluida' && statusAnterior !== 'concluida') {
        await gerarLancamentosFinanceiros(osId)
        toast.success('OS concluída e lançamentos gerados!')
      } else {
        toast.success(isEditing ? 'OS atualizada!' : 'OS criada!')
      }
      
      // Invalidar cache para atualizar listagem
      queryClient.invalidateQueries({ queryKey: ['ordens-servico'] })
      
      navigate('/ordens-servico')

    } catch (error) {
      console.error('Erro:', error)
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
    { id: 'custos', label: 'Custos', icon: DollarSign },
    { id: 'veiculo', label: 'Veículo', icon: Car },
    { id: 'checklists', label: 'Checklists', icon: ClipboardCheck },
    ...(isEditing ? [{ id: 'diario', label: 'Diário de Obra', icon: CalendarDays }] : [])
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
                      {!formData.cliente_id 
                        ? 'Selecione um cliente primeiro...' 
                        : enderecosObra.length === 0 
                          ? 'Nenhum endereço cadastrado' 
                          : 'Selecione o local da obra...'}
                    </option>
                    {enderecosObra.map(end => (
                      <option key={end.id} value={end.id}>
                        {end.nome}
                        {end.is_principal ? ' ⭐' : ''}
                        {end.cidade ? ` - ${end.cidade}/${end.estado}` : ''}
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
                  <label className="label">Data de Início</label>
                  <input type="date" name="data_agendamento" value={formData.data_agendamento} onChange={handleChange} className="input-field" />
                </div>

                <div>
                  <label className="label">Previsão de Dias</label>
                  <input 
                    type="number" 
                    name="previsao_dias" 
                    value={formData.previsao_dias} 
                    onChange={handleChange} 
                    className="input-field" 
                    min="1"
                  />
                </div>

                <div>
                  <label className="label">Status</label>
                  <select name="status" value={formData.status} onChange={handleStatusChange} className="input-field">
                    <option value="agendada">Agendada</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="em_execucao">Em Execução</option>
                    <option value="concluida">✅ Concluída</option>
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
              </div>
            </div>

            {/* Card: Dados Energia Solar */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Sun className="w-4 h-4 text-yellow-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Dados Energia Solar</h2>
                  <p className="text-xs text-gray-500">Informações para análise de custos por placa/telhado</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="label">Tipo de Serviço Solar</label>
                  <select 
                    name="tipo_servico_solar" 
                    value={formData.tipo_servico_solar} 
                    onChange={handleChange} 
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    <option value="instalacao">Instalação</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="limpeza">Limpeza</option>
                    <option value="vistoria">Vistoria</option>
                    <option value="reparo">Reparo</option>
                    <option value="ampliacao">Ampliação</option>
                  </select>
                </div>

                <div>
                  <label className="label">Quantidade de Placas</label>
                  <input 
                    type="number" 
                    name="quantidade_placas" 
                    value={formData.quantidade_placas} 
                    onChange={handleChange} 
                    className="input-field" 
                    placeholder="Ex: 12"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Potência (kWp)</label>
                  <input 
                    type="number" 
                    name="potencia_kwp" 
                    value={formData.potencia_kwp} 
                    onChange={handleChange} 
                    className="input-field" 
                    placeholder="Ex: 6.5"
                    step="0.1"
                    min="0"
                  />
                </div>

                <div>
                  <label className="label">Tipo de Telhado</label>
                  <select 
                    name="tipo_telhado" 
                    value={formData.tipo_telhado} 
                    onChange={handleChange} 
                    className="input-field"
                  >
                    <option value="">Selecione...</option>
                    <option value="Cerâmica">Cerâmica</option>
                    <option value="Metálico">Metálico</option>
                    <option value="Fibrocimento">Fibrocimento</option>
                    <option value="Laje">Laje</option>
                    <option value="Solo">Solo (Usina)</option>
                    <option value="Madeira">Madeira</option>
                    <option value="Shingle">Shingle</option>
                    <option value="Outro">Outro</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Card: Sugestão de Preço */}
            {sugestaoPreco && (
              <div className="card bg-gradient-to-r from-green-50 to-blue-50 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">💡 Sugestão de Preço</h2>
                    <p className="text-xs text-gray-500">Baseado na potência de {formData.potencia_kwp} kWp</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                  <div className="p-3 bg-white rounded-xl border">
                    <p className="text-xs text-gray-500">Valor de Venda</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(sugestaoPreco.valorVenda)}</p>
                    <p className="text-xs text-gray-400">{sugestaoPreco.descricaoVenda}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border">
                    <p className="text-xs text-gray-500">Custo Previsto</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(sugestaoPreco.valorCusto)}</p>
                    <p className="text-xs text-gray-400">{sugestaoPreco.descricaoCusto}</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border">
                    <p className="text-xs text-gray-500">Margem Prevista</p>
                    <p className="text-xl font-bold text-blue-600">{formatCurrency(sugestaoPreco.margem)}</p>
                    <p className="text-xs text-gray-400">
                      {sugestaoPreco.valorVenda > 0 
                        ? `${((sugestaoPreco.margem / sugestaoPreco.valorVenda) * 100).toFixed(1)}%`
                        : '0%'
                      }
                    </p>
                  </div>
                  <div className="flex items-center justify-center">
                    <button
                      type="button"
                      onClick={aplicarSugestaoPreco}
                      className="btn-primary bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aplicar Valor
                    </button>
                  </div>
                </div>

                {parseMoney(formData.valor_total) > 0 && parseMoney(formData.valor_total) !== sugestaoPreco.valorVenda && (
                  <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-700">
                      <strong>Atenção:</strong> O valor atual ({formData.valor_total}) é diferente da sugestão.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Endereço da Obra</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
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
                    {estados.map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
              <div className="space-y-4">
                <div>
                  <label className="label">Observações (visível ao cliente)</label>
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
              <button type="button" onClick={addServico} className="btn-secondary">
                <Plus className="w-4 h-4" /> Adicionar Serviço
              </button>
            </div>

            {servicos.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum serviço adicionado</p>
            ) : (
              <div className="space-y-3">
                {servicos.map((servico, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                      <div className="md:col-span-2">
                        <label className="label text-xs">Serviço</label>
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
                      <div>
                        <label className="label text-xs">Qtd</label>
                        <input
                          type="number"
                          value={servico.quantidade}
                          onChange={(e) => updateServico(index, 'quantidade', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Valor Unit.</label>
                        <input
                          type="number"
                          value={servico.valor_unitario}
                          onChange={(e) => updateServico(index, 'valor_unitario', e.target.value)}
                          className="input-field"
                          step="0.01"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <input
                        type="text"
                        value={servico.descricao}
                        onChange={(e) => updateServico(index, 'descricao', e.target.value)}
                        className="input-field flex-1 mr-3"
                        placeholder="Descrição"
                      />
                      <span className="font-bold text-green-600 mr-3">
                        {formatCurrency(servico.valor_total)}
                      </span>
                      <button type="button" onClick={() => removeServico(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Serviços</p>
                <p className="text-2xl font-bold text-green-600">{formatCurrency(totalServicos)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Equipe */}
        {activeTab === 'equipe' && (
          <div className="space-y-6">
            {/* Seleção de Equipes */}
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Selecionar Equipes</h2>
              <p className="text-sm text-gray-500 mb-4">
                Selecione uma ou mais equipes. Os membros serão adicionados automaticamente.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {equipes?.map(equipe => {
                  const isSelected = equipesSelecionadas.includes(equipe.id)
                  return (
                    <div
                      key={equipe.id}
                      onClick={() => handleToggleEquipe(equipe)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                        isSelected 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: equipe.cor || '#3B82F6' }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{equipe.nome}</p>
                          <p className="text-xs text-gray-500">
                            {equipe.equipe_membros?.length || 0} membros
                          </p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {equipes?.length === 0 && (
                <p className="text-gray-500 text-center py-4">Nenhuma equipe cadastrada</p>
              )}
            </div>

            {/* OU adicionar colaboradores individuais */}
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Colaboradores</h2>
                  <p className="text-sm text-gray-500">
                    Colaboradores das equipes selecionadas ou adicionados manualmente
                  </p>
                </div>
                <button type="button" onClick={addColaborador} className="btn-secondary">
                  <Plus className="w-4 h-4" /> Adicionar Individual
                </button>
              </div>

              {colaboradores.length === 0 ? (
                <p className="text-gray-500 text-center py-8">
                  Selecione uma equipe acima ou adicione colaboradores manualmente
                </p>
              ) : (
                <div className="space-y-3">
                  {colaboradores.map((colab, index) => {
                    const temCustos = (colab.valor_cafe_dia || 0) + (colab.valor_almoco_dia || 0) + 
                                     (colab.valor_transporte_dia || 0) + (colab.valor_outros_dia || 0) > 0
                    return (
                    <div key={index} className="p-4 bg-gray-50 rounded-xl">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div className="md:col-span-2">
                          <label className="label text-xs">Colaborador</label>
                          <select
                            value={colab.colaborador_id}
                            onChange={(e) => updateColaborador(index, 'colaborador_id', e.target.value)}
                            className="input-field"
                          >
                            <option value="">Selecione...</option>
                            {colaboradoresDisponiveis?.map(c => (
                              <option key={c.id} value={c.id}>{c.nome} - {c.funcao?.nome}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label text-xs">Diária</label>
                          <input
                            type="number"
                            value={colab.valor_diaria}
                            onChange={(e) => updateColaborador(index, 'valor_diaria', e.target.value)}
                            className="input-field"
                            step="0.01"
                          />
                        </div>
                        <div>
                          <label className="label text-xs">Dias</label>
                          <input
                            type="number"
                            value={colab.dias_trabalhados}
                            onChange={(e) => updateColaborador(index, 'dias_trabalhados', e.target.value)}
                            className="input-field"
                            min="0.5"
                            step="0.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-blue-600">{formatCurrency(colab.valor_total)}</span>
                          <button type="button" onClick={() => removeColaborador(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      {/* Mostrar custos extras se houver */}
                      {temCustos && (
                        <div className="mt-2 pt-2 border-t border-gray-200 flex flex-wrap gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-orange-400 rounded-full"></span>
                            Café: {formatCurrency(colab.valor_cafe || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
                            Almoço: {formatCurrency(colab.valor_almoco || 0)}
                          </span>
                          <span className="flex items-center gap-1">
                            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                            Transporte: {formatCurrency(colab.valor_transporte || 0)}
                          </span>
                          {(colab.valor_outros || 0) > 0 && (
                            <span className="flex items-center gap-1">
                              <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                              Outros: {formatCurrency(colab.valor_outros || 0)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              )}

              <div className="mt-4 pt-4 border-t flex justify-end">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Total Mão de Obra</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalMaoObra)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Custos */}
        {activeTab === 'custos' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Custos Extras</h2>
              <button type="button" onClick={addCustoExtra} className="btn-secondary">
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            </div>

            {custosExtras.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Nenhum custo extra</p>
            ) : (
              <div className="space-y-3">
                {custosExtras.map((custo, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                      <div>
                        <label className="label text-xs">Tipo</label>
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
                      <div className="md:col-span-2">
                        <label className="label text-xs">Descrição</label>
                        <input
                          type="text"
                          value={custo.descricao}
                          onChange={(e) => updateCustoExtra(index, 'descricao', e.target.value)}
                          className="input-field"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          value={custo.valor}
                          onChange={(e) => updateCustoExtra(index, 'valor', e.target.value)}
                          className="input-field"
                          step="0.01"
                        />
                        <button type="button" onClick={() => removeCustoExtra(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Custos Extras</p>
                <p className="text-2xl font-bold text-red-600">{formatCurrency(totalCustosExtras)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Veículos */}
        {activeTab === 'veiculo' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Veículos</h2>
                <p className="text-sm text-gray-500">Adicione os veículos utilizados na OS (pode adicionar mais de um)</p>
              </div>
              <button type="button" onClick={addVeiculoOS} className="btn-secondary">
                <Plus className="w-4 h-4" /> Adicionar Veículo
              </button>
            </div>

            {veiculosOS.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                Nenhum veículo adicionado. Clique em "Adicionar Veículo" para incluir.
              </p>
            ) : (
              <div className="space-y-4">
                {veiculosOS.map((veiculo, index) => (
                  <div key={index} className="p-4 bg-gray-50 rounded-xl border">
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
                      <div className="md:col-span-2">
                        <label className="label text-xs">Veículo</label>
                        <select
                          value={veiculo.veiculo_id}
                          onChange={(e) => updateVeiculoOS(index, 'veiculo_id', e.target.value)}
                          className="input-field"
                        >
                          <option value="">Selecione...</option>
                          {veiculos?.map(v => (
                            <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="label text-xs">KM Inicial</label>
                        <input
                          type="number"
                          value={veiculo.km_inicial}
                          onChange={(e) => updateVeiculoOS(index, 'km_inicial', e.target.value)}
                          className="input-field"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">KM Final</label>
                        <input
                          type="number"
                          value={veiculo.km_final}
                          onChange={(e) => updateVeiculoOS(index, 'km_final', e.target.value)}
                          className="input-field"
                          min="0"
                        />
                      </div>
                      <div>
                        <label className="label text-xs">Dias</label>
                        <input
                          type="number"
                          value={veiculo.dias}
                          onChange={(e) => updateVeiculoOS(index, 'dias', e.target.value)}
                          className="input-field"
                          min="1"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-purple-600">{formatCurrency(veiculo.valor_total)}</span>
                        <button type="button" onClick={() => removeVeiculoOS(index)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    
                    {/* Detalhes dos custos */}
                    {veiculo.veiculo_id && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="label text-xs">Aluguel/dia</label>
                            <input
                              type="number"
                              value={veiculo.valor_aluguel}
                              onChange={(e) => updateVeiculoOS(index, 'valor_aluguel', e.target.value)}
                              className="input-field"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="label text-xs">Gasolina/dia</label>
                            <input
                              type="number"
                              value={veiculo.valor_gasolina}
                              onChange={(e) => updateVeiculoOS(index, 'valor_gasolina', e.target.value)}
                              className="input-field"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="label text-xs">🧊 Gelo/dia</label>
                            <input
                              type="number"
                              value={veiculo.valor_gelo}
                              onChange={(e) => updateVeiculoOS(index, 'valor_gelo', e.target.value)}
                              className="input-field"
                              step="0.01"
                            />
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Total/dia: {formatCurrency((parseFloat(veiculo.valor_aluguel) || 0) + (parseFloat(veiculo.valor_gasolina) || 0) + (parseFloat(veiculo.valor_gelo) || 0))} × {veiculo.dias} dias = <strong className="text-purple-600">{formatCurrency(veiculo.valor_total)}</strong>
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <div className="mt-4 pt-4 border-t flex justify-end">
              <div className="text-right">
                <p className="text-sm text-gray-500">Total Veículos</p>
                <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalVeiculos)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Checklists */}
        {activeTab === 'checklists' && (
          <div className="space-y-6">
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Checklists da Obra</h2>

              {/* Início do Dia */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0 flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    Início do Dia
                  </label>
                  <button type="button" onClick={() => addChecklist('diario_inicio')} className="text-blue-600 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {checklistsSelecionados.map((c, idx) => ({ ...c, originalIndex: idx })).filter(c => c.tipo === 'diario_inicio').map((c) => (
                    <div key={c.originalIndex} className="flex items-center gap-2">
                      <select value={c.checklist_modelo_id} onChange={(e) => updateChecklist(c.originalIndex, e.target.value)} className="input-field flex-1">
                        <option value="">Selecione...</option>
                        {checklistModelos?.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                      </select>
                      <button type="button" onClick={() => removeChecklist(c.originalIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fim do Dia */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0 flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    Fim do Dia
                  </label>
                  <button type="button" onClick={() => addChecklist('diario_fim')} className="text-blue-600 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {checklistsSelecionados.map((c, idx) => ({ ...c, originalIndex: idx })).filter(c => c.tipo === 'diario_fim').map((c) => (
                    <div key={c.originalIndex} className="flex items-center gap-2">
                      <select value={c.checklist_modelo_id} onChange={(e) => updateChecklist(c.originalIndex, e.target.value)} className="input-field flex-1">
                        <option value="">Selecione...</option>
                        {checklistModelos?.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                      </select>
                      <button type="button" onClick={() => removeChecklist(c.originalIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Avulsos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0 flex items-center gap-2">
                    <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                    Avulsos
                  </label>
                  <button type="button" onClick={() => addChecklist('avulso')} className="text-blue-600 text-sm font-medium flex items-center gap-1">
                    <Plus className="w-4 h-4" /> Adicionar
                  </button>
                </div>
                <div className="space-y-2">
                  {checklistsSelecionados.map((c, idx) => ({ ...c, originalIndex: idx })).filter(c => c.tipo === 'avulso').map((c) => (
                    <div key={c.originalIndex} className="flex items-center gap-2">
                      <select value={c.checklist_modelo_id} onChange={(e) => updateChecklist(c.originalIndex, e.target.value)} className="input-field flex-1">
                        <option value="">Selecione...</option>
                        {checklistModelos?.map(m => (<option key={m.id} value={m.id}>{m.nome}</option>))}
                      </select>
                      <button type="button" onClick={() => removeChecklist(c.originalIndex)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Diário de Obra */}
        {activeTab === 'diario' && isEditing && (
          <DiarioObra 
            ordemServicoId={id}
            ordemServico={ordemServicoCompleta}
            colaboradoresPadrao={colaboradores}
            veiculoPadrao={veiculos?.find(v => v.id === formData.veiculo_id)}
          />
        )}

        {/* Resumo e Botões */}
        {activeTab !== 'diario' && (
          <div className="card bg-gray-50">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-gray-500">Serviços</p>
                  <p className="font-bold text-green-600">{formatCurrency(totalServicos)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mão de Obra</p>
                  <p className="font-bold text-blue-600">{formatCurrency(totalMaoObra)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Custos Extras</p>
                  <p className="font-bold text-red-600">{formatCurrency(totalCustosExtras)}</p>
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
        )}
      </form>

      {/* MODAL DE CONFIRMAÇÃO DE LANÇAMENTOS */}
      {showLancamentosModal && lancamentosPreview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b bg-green-50">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Concluir OS</h2>
                  <p className="text-sm text-gray-600">Os seguintes lançamentos serão gerados:</p>
                </div>
              </div>
              <button onClick={cancelarConclusao} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-6">
              {/* Receitas */}
              {lancamentosPreview.receitas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    <h3 className="font-semibold text-green-800">Receitas (Contas a Receber)</h3>
                  </div>
                  <div className="space-y-2">
                    {lancamentosPreview.receitas.map((r, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{r.descricao}</p>
                          <p className="text-xs text-gray-500">{r.categoria}</p>
                        </div>
                        <span className="font-bold text-green-600">{formatCurrency(r.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Despesas */}
              {lancamentosPreview.despesas.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <TrendingDown className="w-5 h-5 text-red-600" />
                    <h3 className="font-semibold text-red-800">Despesas (Contas a Pagar)</h3>
                  </div>
                  <div className="space-y-2">
                    {lancamentosPreview.despesas.map((d, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 bg-red-50 rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{d.descricao}</p>
                          <p className="text-xs text-gray-500">{d.categoria}</p>
                          {d.detalhe?.pix && (
                            <p className="text-xs text-blue-600 mt-1">PIX: {d.detalhe.pix}</p>
                          )}
                        </div>
                        <span className="font-bold text-red-600">{formatCurrency(d.valor)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resumo */}
              <div className="border-t pt-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500">Total Receitas</p>
                    <p className="text-xl font-bold text-green-600">{formatCurrency(lancamentosPreview.totalReceitas)}</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg">
                    <p className="text-xs text-gray-500">Total Despesas</p>
                    <p className="text-xl font-bold text-red-600">{formatCurrency(lancamentosPreview.totalDespesas)}</p>
                  </div>
                  <div className={`text-center p-3 rounded-lg ${lancamentosPreview.lucro >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
                    <p className="text-xs text-gray-500">Lucro</p>
                    <p className={`text-xl font-bold ${lancamentosPreview.lucro >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
                      {formatCurrency(lancamentosPreview.lucro)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Aviso */}
              <div className="flex items-start gap-3 p-4 bg-yellow-50 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">Atenção:</p>
                  <p>Os lançamentos serão criados com status "Pendente". Você poderá baixá-los individualmente no módulo Financeiro.</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50">
              <button onClick={cancelarConclusao} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button onClick={confirmarConclusao} className="btn-primary flex-1 bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-5 h-5" />
                Confirmar e Gerar Lançamentos
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdemServicoForm
