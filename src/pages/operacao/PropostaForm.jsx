import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import {
  ArrowLeft,
  Building,
  Users,
  Wrench,
  DollarSign,
  Camera,
  FileText,
  Save,
  Eye,
  Download,
  MessageCircle,
  Mail,
  Loader2,
  Plus,
  Trash2,
  Upload,
  X,
  ChevronDown
} from 'lucide-react'
import toast from 'react-hot-toast'

// ============================================
// CONSTANTES
// ============================================

const TIPOS_SERVICO = [
  { value: 'padrao_entrada', label: 'Padrão de Entrada' },
  { value: 'instalacao_fotovoltaica', label: 'Instalação Fotovoltaica' },
  { value: 'estrutura_metalica', label: 'Estrutura Metálica' },
  { value: 'manutencao', label: 'Manutenção' },
  { value: 'outro', label: 'Outro' },
]

const TIPOS_ITEM = [
  { value: 'material', label: 'Material' },
  { value: 'mao_de_obra', label: 'Mão de Obra' },
  { value: 'servico', label: 'Serviço' },
  { value: 'outros', label: 'Outros' },
]

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatDate = (dateStr) => {
  if (!dateStr) return new Date().toLocaleDateString('pt-BR')
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const PropostaForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const pdfRef = useRef(null)
  const isEditing = !!id && id !== 'nova'

  const [activeTab, setActiveTab] = useState('destinatario')
  const [loading, setLoading] = useState(false)
  const [loadingPDF, setLoadingPDF] = useState(false)
  const [loadingData, setLoadingData] = useState(isEditing)

  const [formData, setFormData] = useState({
    empresa_id: '',
    destinatario_tipo: 'cliente_final',
    cliente_id: '',
    destinatario_nome: '',
    destinatario_cpf_cnpj: '',
    destinatario_telefone: '',
    destinatario_email: '',
    destinatario_endereco: '',
    destinatario_cidade: '',
    destinatario_estado: '',
    destinatario_cep: '',
    tipo_servico: '',
    endereco_obra: '',
    cidade_obra: '',
    estado_obra: '',
    potencia_kwp: '',
    quantidade_placas: '',
    prazo_execucao: '',
    condicoes_pagamento: '',
    texto_garantia: '',
    validade_dias: 15,
    observacoes: '',
    modelo_id: '',
    numero: '',
    status: 'rascunho',
  })

  const [itens, setItens] = useState([])
  const [fotos, setFotos] = useState([])
  const [propostaId, setPropostaId] = useState(id && id !== 'nova' ? id : null)

  // ============================================
  // QUERIES
  // ============================================

  const { data: empresas } = useQuery({
    queryKey: ['empresas-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('empresas_contratantes')
        .select('id, nome, cnpj, telefone, email, endereco, cidade, estado, cep, logo_url, formas_pagamento, texto_garantia, texto_condicoes_pagamento, responsavel, responsavel_cargo')
        .eq('ativo', true)
        .order('nome')
      return data || []
    }
  })

  // Auto-selecionar primeira empresa
  useEffect(() => {
    if (empresas?.length > 0 && !formData.empresa_id && !isEditing) {
      setFormData(prev => ({ ...prev, empresa_id: empresas[0].id }))
    }
  }, [empresas])

  const { data: clientes } = useQuery({
    queryKey: ['clientes-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('clientes')
        .select('id, nome, cpf_cnpj, telefone, email, endereco, cidade, estado, cep')
        .eq('ativo', true)
        .order('nome')
      return data || []
    }
  })

  const { data: modelos } = useQuery({
    queryKey: ['proposta-modelos-select'],
    queryFn: async () => {
      const { data } = await supabase
        .from('proposta_modelos')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      return data || []
    }
  })

  // Carregar proposta existente
  useEffect(() => {
    if (!isEditing) return
    const load = async () => {
      setLoadingData(true)
      try {
        const { data: proposta, error } = await supabase
          .from('propostas')
          .select(`
            *,
            itens:proposta_itens(*),
            fotos:proposta_fotos(*)
          `)
          .eq('id', id)
          .single()
        if (error) throw error

        setFormData({
          empresa_id: proposta.empresa_id || '',
          destinatario_tipo: proposta.destinatario_tipo || 'cliente_final',
          cliente_id: proposta.cliente_id || '',
          destinatario_nome: proposta.destinatario_nome || '',
          destinatario_cpf_cnpj: proposta.destinatario_cpf_cnpj || '',
          destinatario_telefone: proposta.destinatario_telefone || '',
          destinatario_email: proposta.destinatario_email || '',
          destinatario_endereco: proposta.destinatario_endereco || '',
          destinatario_cidade: proposta.destinatario_cidade || '',
          destinatario_estado: proposta.destinatario_estado || '',
          destinatario_cep: proposta.destinatario_cep || '',
          tipo_servico: proposta.tipo_servico || '',
          endereco_obra: proposta.endereco_obra || '',
          cidade_obra: proposta.cidade_obra || '',
          estado_obra: proposta.estado_obra || '',
          potencia_kwp: proposta.potencia_kwp || '',
          quantidade_placas: proposta.quantidade_placas || '',
          prazo_execucao: proposta.prazo_execucao || '',
          condicoes_pagamento: proposta.condicoes_pagamento || '',
          texto_garantia: proposta.texto_garantia || '',
          validade_dias: proposta.validade_dias || 15,
          observacoes: proposta.observacoes || '',
          modelo_id: proposta.modelo_id || '',
          numero: proposta.numero || '',
          status: proposta.status || 'rascunho',
        })

        setItens(proposta.itens?.sort((a, b) => a.ordem - b.ordem) || [])
        setFotos(proposta.fotos?.sort((a, b) => a.ordem - b.ordem) || [])
        setPropostaId(proposta.id)
      } catch (err) {
        toast.error('Erro ao carregar proposta')
        navigate('/propostas')
      } finally {
        setLoadingData(false)
      }
    }
    load()
  }, [id, isEditing, navigate])

  // ============================================
  // HELPERS
  // ============================================

  const selectedEmpresa = empresas?.find(e => e.id === formData.empresa_id)
  const selectedCliente = clientes?.find(c => c.id === formData.cliente_id)

  const valorTotal = itens.reduce((sum, item) => sum + (parseFloat(item.valor_total) || 0), 0)
  const valorMaterial = itens.filter(i => i.tipo === 'material').reduce((sum, i) => sum + (parseFloat(i.valor_total) || 0), 0)
  const valorMaoObra = itens.filter(i => i.tipo === 'mao_de_obra').reduce((sum, i) => sum + (parseFloat(i.valor_total) || 0), 0)
  const valorOutros = itens.filter(i => i.tipo !== 'material' && i.tipo !== 'mao_de_obra').reduce((sum, i) => sum + (parseFloat(i.valor_total) || 0), 0)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  // ============================================
  // MODELO (template)
  // ============================================

  const handleModeloChange = (modeloId) => {
    const modelo = modelos?.find(m => m.id === modeloId)
    if (!modelo) return
    setFormData(prev => ({
      ...prev,
      modelo_id: modeloId,
      condicoes_pagamento: modelo.condicoes_pagamento || prev.condicoes_pagamento,
      texto_garantia: modelo.texto_garantia || prev.texto_garantia,
      validade_dias: modelo.validade_dias || prev.validade_dias,
    }))
    toast.success('Modelo aplicado!')
  }

  // ============================================
  // CLIENTE SELECT
  // ============================================

  const handleClienteSelect = (clienteId) => {
    const cliente = clientes?.find(c => c.id === clienteId)
    if (!cliente) return
    setFormData(prev => ({
      ...prev,
      cliente_id: clienteId,
      destinatario_nome: cliente.nome || '',
      destinatario_cpf_cnpj: cliente.cpf_cnpj || '',
      destinatario_telefone: cliente.telefone || '',
      destinatario_email: cliente.email || '',
      destinatario_endereco: cliente.endereco || '',
      destinatario_cidade: cliente.cidade || '',
      destinatario_estado: cliente.estado || '',
      destinatario_cep: cliente.cep || '',
    }))
  }

  // ============================================
  // ITENS
  // ============================================

  const addItem = () => {
    setItens(prev => [...prev, {
      id: `new-${Date.now()}`,
      descricao: '',
      tipo: 'material',
      quantidade: 1,
      valor_unitario: 0,
      valor_total: 0,
    }])
  }

  const updateItem = (index, updates) => {
    setItens(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], ...updates }
      const qty = parseFloat(updated[index].quantidade) || 0
      const unit = parseFloat(updated[index].valor_unitario) || 0
      updated[index].valor_total = qty * unit
      return updated
    })
  }

  const removeItem = (index) => {
    setItens(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // FOTOS
  // ============================================

  const handleFotoUpload = async (files) => {
    if (!propostaId) {
      toast.error('Salve o rascunho antes de adicionar fotos')
      return
    }

    for (const file of files) {
      try {
        const ext = file.name.split('.').pop().toLowerCase()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
        const filePath = `propostas/${propostaId}/${fileName}`

        const { error: upErr } = await supabase.storage
          .from('propostas')
          .upload(filePath, file)
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('propostas')
          .getPublicUrl(filePath)

        setFotos(prev => [...prev, {
          id: `temp-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
          foto_url: publicUrl,
          legenda: '',
          ordem: prev.length,
        }])
      } catch (err) {
        toast.error('Erro ao fazer upload: ' + err.message)
      }
    }
  }

  const updateFotoLegenda = (index, legenda) => {
    setFotos(prev => {
      const updated = [...prev]
      updated[index] = { ...updated[index], legenda }
      return updated
    })
  }

  const removeFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index))
  }

  // ============================================
  // NÚMERO AUTOMÁTICO
  // ============================================

  const gerarNumero = async () => {
    const now = new Date()
    const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`
    const prefix = `PROP-${yyyymm}-`

    const { data } = await supabase
      .from('propostas')
      .select('numero')
      .like('numero', `${prefix}%`)
      .order('numero', { ascending: false })
      .limit(1)

    let seq = 1
    if (data && data.length > 0) {
      const lastSeq = parseInt(data[0].numero.split('-').pop())
      if (!isNaN(lastSeq)) seq = lastSeq + 1
    }

    return `${prefix}${String(seq).padStart(4, '0')}`
  }

  // ============================================
  // SALVAR
  // ============================================

  const handleSave = async (novoStatus = 'rascunho') => {
    if (!formData.empresa_id && empresas?.length > 0) {
      setFormData(prev => ({ ...prev, empresa_id: empresas[0].id }))
    }

    setLoading(true)
    try {
      const propostaData = {
        empresa_id: formData.empresa_id,
        destinatario_tipo: formData.destinatario_tipo,
        cliente_id: formData.cliente_id || null,
        destinatario_nome: formData.destinatario_nome,
        destinatario_cpf_cnpj: formData.destinatario_cpf_cnpj,
        destinatario_telefone: formData.destinatario_telefone,
        destinatario_email: formData.destinatario_email,
        destinatario_endereco: formData.destinatario_endereco,
        destinatario_cidade: formData.destinatario_cidade,
        destinatario_estado: formData.destinatario_estado,
        destinatario_cep: formData.destinatario_cep,
        tipo_servico: formData.tipo_servico,
        endereco_obra: formData.endereco_obra,
        cidade_obra: formData.cidade_obra,
        estado_obra: formData.estado_obra,
        potencia_kwp: parseFloat(formData.potencia_kwp) || null,
        quantidade_placas: parseInt(formData.quantidade_placas) || null,
        prazo_execucao: formData.prazo_execucao,
        condicoes_pagamento: formData.condicoes_pagamento,
        texto_garantia: formData.texto_garantia,
        validade_dias: parseInt(formData.validade_dias) || 15,
        observacoes: formData.observacoes,
        modelo_id: formData.modelo_id || null,
        status: novoStatus,
        valor_total: valorTotal,
        desconto: 0,
        atualizado_em: new Date().toISOString(),
      }

      if (novoStatus === 'enviada') propostaData.enviado_em = new Date().toISOString()
      if (novoStatus === 'aprovada') propostaData.aprovado_em = new Date().toISOString()
      if (novoStatus === 'recusada') propostaData.recusado_em = new Date().toISOString()

      let currentId = propostaId

      if (isEditing && currentId) {
        const { error } = await supabase
          .from('propostas')
          .update(propostaData)
          .eq('id', currentId)
        if (error) throw error
      } else {
        propostaData.numero = await gerarNumero()
        const { data, error } = await supabase
          .from('propostas')
          .insert(propostaData)
          .select('id, numero')
          .single()
        if (error) throw error
        currentId = data.id
        setPropostaId(data.id)
        setFormData(prev => ({ ...prev, numero: data.numero }))
      }

      // Salvar itens: deletar antigos e inserir novos
      await supabase.from('proposta_itens').delete().eq('proposta_id', currentId)

      if (itens.length > 0) {
        const itensData = itens.map((item, idx) => ({
          proposta_id: currentId,
          descricao: item.descricao,
          tipo: item.tipo,
          quantidade: parseFloat(item.quantidade) || 1,
          valor_unitario: parseFloat(item.valor_unitario) || 0,
          valor_total: parseFloat(item.valor_total) || 0,
          ordem: idx,
        }))
        const { error } = await supabase.from('proposta_itens').insert(itensData)
        if (error) throw error
      }

      // Salvar fotos novas
      const fotosNovas = fotos.filter(f => String(f.id).startsWith('temp-'))
      if (fotosNovas.length > 0) {
        const fotosData = fotosNovas.map((foto, idx) => ({
          proposta_id: currentId,
          foto_url: foto.foto_url,
          legenda: foto.legenda || '',
          ordem: idx,
        }))
        const { error } = await supabase.from('proposta_fotos').insert(fotosData)
        if (error) throw error
      }

      // Atualizar legendas de fotos existentes
      const fotosExistentes = fotos.filter(f => !String(f.id).startsWith('temp-'))
      for (const foto of fotosExistentes) {
        await supabase.from('proposta_fotos')
          .update({ legenda: foto.legenda, ordem: fotos.indexOf(foto) })
          .eq('id', foto.id)
      }

      queryClient.invalidateQueries(['propostas'])
      toast.success(novoStatus === 'rascunho' ? 'Rascunho salvo!' : 'Proposta salva!')

      if (!isEditing) {
        navigate(`/proposta/${currentId}`, { replace: true })
      }
    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ============================================
  // PDF
  // ============================================

  const gerarPDF = async (download = false) => {
    setLoadingPDF(true)
    try {
      const element = pdfRef.current
      if (!element) {
        toast.error('Erro ao gerar PDF')
        return
      }

      element.style.display = 'block'
      element.style.position = 'absolute'
      element.style.left = '-9999px'
      element.style.top = '0'
      element.style.width = '794px'

      // Aguardar imagens carregarem
      const images = element.querySelectorAll('img')
      await Promise.all(
        Array.from(images).map(img =>
          img.complete ? Promise.resolve() : new Promise(resolve => {
            img.onload = resolve
            img.onerror = resolve
          })
        )
      )

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
      })

      element.style.display = 'none'

      const imgData = canvas.toDataURL('image/jpeg', 0.95)
      const pdf = new jsPDF('p', 'mm', 'a4')

      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = pdf.internal.pageSize.getHeight()
      const imgWidth = pdfWidth
      const imgHeight = (canvas.height * pdfWidth) / canvas.width

      let heightLeft = imgHeight
      let position = 0

      pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
      heightLeft -= pdfHeight

      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'JPEG', 0, position, imgWidth, imgHeight)
        heightLeft -= pdfHeight
      }

      if (download) {
        pdf.save(`${formData.numero || 'proposta'}.pdf`)
        toast.success('PDF baixado!')
      } else {
        const pdfBlob = pdf.output('blob')
        const url = URL.createObjectURL(pdfBlob)
        window.open(url, '_blank')
      }
    } catch (err) {
      toast.error('Erro ao gerar PDF: ' + err.message)
    } finally {
      setLoadingPDF(false)
    }
  }

  // ============================================
  // WHATSAPP / EMAIL
  // ============================================

  const enviarWhatsApp = () => {
    const telefone = formData.destinatario_telefone?.replace(/\D/g, '')
    if (!telefone) {
      toast.error('Preencha o telefone do destinatário')
      setActiveTab('destinatario')
      return
    }
    const mensagem = encodeURIComponent(
      `Olá! Segue a proposta comercial ${formData.numero || ''} no valor de ${formatCurrency(valorTotal)}.\n\n` +
      `Proposta válida por ${formData.validade_dias || 15} dias.\n\n` +
      `Em caso de dúvidas, estamos à disposição.`
    )
    window.open(`https://wa.me/55${telefone}?text=${mensagem}`, '_blank')
  }

  const enviarEmail = () => {
    const email = formData.destinatario_email
    if (!email) {
      toast.error('Preencha o email do destinatário')
      setActiveTab('destinatario')
      return
    }
    const subject = encodeURIComponent(`Proposta Comercial ${formData.numero || ''}`)
    const body = encodeURIComponent(
      `Prezado(a) ${formData.destinatario_nome || ''},\n\n` +
      `Segue em anexo a proposta comercial ${formData.numero || ''} no valor de ${formatCurrency(valorTotal)}.\n\n` +
      `Proposta válida por ${formData.validade_dias || 15} dias.\n\n` +
      `Atenciosamente,\n` +
      `${selectedEmpresa?.nome || 'Equipe Técnica'}`
    )
    window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank')
  }

  // ============================================
  // TABS
  // ============================================

  const tabs = [
    { id: 'destinatario', label: 'Destinatário', icon: Users },
    { id: 'obra', label: 'Dados da Obra', icon: Wrench },
    { id: 'itens', label: 'Itens e Valores', icon: DollarSign },
    { id: 'fotos', label: 'Fotos/Orçamentos', icon: Camera },
    { id: 'condicoes', label: 'Condições', icon: FileText },
  ]

  if (loadingData) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/propostas')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">
            {isEditing ? `Editar Proposta` : 'Nova Proposta'}
          </h1>
          <p className="text-gray-500">
            {formData.numero && (
              <span className="font-mono text-blue-600 font-semibold">{formData.numero} - </span>
            )}
            Preencha os dados da proposta comercial
          </p>
        </div>
        {formData.status && formData.status !== 'rascunho' && (
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            formData.status === 'enviada' ? 'bg-blue-100 text-blue-800' :
            formData.status === 'aprovada' ? 'bg-green-100 text-green-800' :
            formData.status === 'recusada' ? 'bg-red-100 text-red-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {formData.status.charAt(0).toUpperCase() + formData.status.slice(1)}
          </span>
        )}
      </div>

      {/* Modelo selector */}
      <div className="card">
        <div className="flex items-center gap-3">
          <label className="label whitespace-nowrap mb-0">Modelo de proposta:</label>
          <select
            value={formData.modelo_id}
            onChange={(e) => e.target.value && handleModeloChange(e.target.value)}
            className="input-field flex-1"
          >
            <option value="">Selecionar modelo (opcional)...</option>
            {modelos?.map(m => (
              <option key={m.id} value={m.id}>{m.nome}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Barra informativa da empresa emissora */}
      {selectedEmpresa && (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 rounded-xl text-sm">
          {selectedEmpresa.logo_url && <img src={selectedEmpresa.logo_url} alt="Logo" className="h-8 rounded" />}
          <span className="font-medium text-gray-700">Emissora: <strong>{selectedEmpresa.nome}</strong></span>
          {selectedEmpresa.cnpj && <span className="text-gray-500">| {selectedEmpresa.cnpj}</span>}
        </div>
      )}

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

      {/* ========== TAB 2: DESTINATÁRIO ========== */}
      {activeTab === 'destinatario' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Destinatário</h2>

          {/* Toggle tipo */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, destinatario_tipo: 'criteria' }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                formData.destinatario_tipo === 'criteria'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Critéria / Empresa
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, destinatario_tipo: 'cliente_final' }))}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                formData.destinatario_tipo === 'cliente_final'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              Cliente Final
            </button>
          </div>

          {/* Select cliente */}
          <div>
            <label className="label">
              {formData.destinatario_tipo === 'criteria' ? 'Empresa' : 'Cliente cadastrado (opcional)'}
            </label>
            <select
              value={formData.cliente_id}
              onChange={(e) => e.target.value && handleClienteSelect(e.target.value)}
              className="input-field"
            >
              <option value="">Selecionar ou preencher manualmente...</option>
              {clientes?.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Nome *</label>
              <input
                type="text"
                name="destinatario_nome"
                value={formData.destinatario_nome}
                onChange={handleChange}
                className="input-field"
                placeholder="Nome do destinatário"
              />
            </div>
            <div>
              <label className="label">CPF/CNPJ</label>
              <input
                type="text"
                name="destinatario_cpf_cnpj"
                value={formData.destinatario_cpf_cnpj}
                onChange={handleChange}
                className="input-field"
                placeholder="000.000.000-00"
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                type="text"
                name="destinatario_telefone"
                value={formData.destinatario_telefone}
                onChange={handleChange}
                className="input-field"
                placeholder="(00) 00000-0000"
              />
            </div>
            <div>
              <label className="label">Email</label>
              <input
                type="email"
                name="destinatario_email"
                value={formData.destinatario_email}
                onChange={handleChange}
                className="input-field"
                placeholder="email@exemplo.com"
              />
            </div>
          </div>

          <div>
            <label className="label">Endereço</label>
            <input
              type="text"
              name="destinatario_endereco"
              value={formData.destinatario_endereco}
              onChange={handleChange}
              className="input-field"
              placeholder="Rua, número, complemento"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="label">Cidade</label>
              <input
                type="text"
                name="destinatario_cidade"
                value={formData.destinatario_cidade}
                onChange={handleChange}
                className="input-field"
              />
            </div>
            <div>
              <label className="label">Estado</label>
              <select name="destinatario_estado" value={formData.destinatario_estado} onChange={handleChange} className="input-field">
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="label">CEP</label>
              <input
                type="text"
                name="destinatario_cep"
                value={formData.destinatario_cep}
                onChange={handleChange}
                className="input-field"
                placeholder="00.000-000"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB 3: DADOS DA OBRA ========== */}
      {activeTab === 'obra' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Dados da Obra</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Tipo de Serviço</label>
              <select name="tipo_servico" value={formData.tipo_servico} onChange={handleChange} className="input-field">
                <option value="">Selecione...</option>
                {TIPOS_SERVICO.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Prazo de Execução</label>
              <input
                type="text"
                name="prazo_execucao"
                value={formData.prazo_execucao}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: 5 dias úteis"
              />
            </div>
          </div>

          <div>
            <label className="label">Endereço da Obra</label>
            <input
              type="text"
              name="endereco_obra"
              value={formData.endereco_obra}
              onChange={handleChange}
              className="input-field"
              placeholder="Endereço completo da obra"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Cidade</label>
              <input type="text" name="cidade_obra" value={formData.cidade_obra} onChange={handleChange} className="input-field" />
            </div>
            <div>
              <label className="label">Estado</label>
              <select name="estado_obra" value={formData.estado_obra} onChange={handleChange} className="input-field">
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Potência (kWp)</label>
              <input
                type="number"
                name="potencia_kwp"
                value={formData.potencia_kwp}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: 5.5"
                step="0.01"
              />
            </div>
            <div>
              <label className="label">Quantidade de Placas</label>
              <input
                type="number"
                name="quantidade_placas"
                value={formData.quantidade_placas}
                onChange={handleChange}
                className="input-field"
                placeholder="Ex: 10"
              />
            </div>
          </div>
        </div>
      )}

      {/* ========== TAB 4: ITENS E VALORES ========== */}
      {activeTab === 'itens' && (
        <div className="space-y-4">
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Itens da Proposta</h2>
              <button type="button" onClick={addItem} className="btn-primary text-sm">
                <Plus className="w-4 h-4" /> Adicionar Item
              </button>
            </div>

            {itens.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <p>Nenhum item adicionado</p>
                <button type="button" onClick={addItem} className="text-blue-600 text-sm mt-2 hover:underline">
                  + Adicionar primeiro item
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {itens.map((item, index) => (
                  <div key={item.id} className="border border-gray-200 rounded-xl p-4">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                      <div className="md:col-span-4">
                        <label className="label text-xs">Descrição</label>
                        <input
                          type="text"
                          value={item.descricao}
                          onChange={(e) => updateItem(index, { descricao: e.target.value })}
                          className="input-field"
                          placeholder="Descrição do item"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">Tipo</label>
                        <select
                          value={item.tipo}
                          onChange={(e) => updateItem(index, { tipo: e.target.value })}
                          className="input-field"
                        >
                          {TIPOS_ITEM.map(t => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-1">
                        <label className="label text-xs">Qtd</label>
                        <input
                          type="number"
                          value={item.quantidade}
                          onChange={(e) => updateItem(index, { quantidade: e.target.value })}
                          className="input-field"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">Valor Unit.</label>
                        <input
                          type="number"
                          value={item.valor_unitario}
                          onChange={(e) => updateItem(index, { valor_unitario: e.target.value })}
                          className="input-field"
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="label text-xs">Total</label>
                        <div className="input-field bg-gray-50 text-right font-semibold tabular-nums">
                          {formatCurrency(item.valor_total)}
                        </div>
                      </div>
                      <div className="md:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

          {/* Resumo de valores */}
          {itens.length > 0 && (
            <div className="card bg-gray-50">
              <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Resumo</h3>
              <div className="space-y-2 text-sm">
                {valorMaterial > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Material</span>
                    <span className="font-medium tabular-nums">{formatCurrency(valorMaterial)}</span>
                  </div>
                )}
                {valorMaoObra > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Mão de Obra</span>
                    <span className="font-medium tabular-nums">{formatCurrency(valorMaoObra)}</span>
                  </div>
                )}
                {valorOutros > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Serviços / Outros</span>
                    <span className="font-medium tabular-nums">{formatCurrency(valorOutros)}</span>
                  </div>
                )}
                <div className="flex justify-between pt-2 border-t border-gray-300">
                  <span className="font-bold text-gray-900 text-base">TOTAL</span>
                  <span className="font-bold text-gray-900 text-base tabular-nums">{formatCurrency(valorTotal)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== TAB 5: FOTOS/ORÇAMENTOS ========== */}
      {activeTab === 'fotos' && (
        <div className="card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Fotos e Orçamentos</h2>
            <label className="btn-primary text-sm cursor-pointer">
              <Upload className="w-4 h-4" /> Upload
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => handleFotoUpload(Array.from(e.target.files))}
              />
            </label>
          </div>

          {!propostaId && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-sm text-yellow-800">
              Salve o rascunho primeiro para poder adicionar fotos.
            </div>
          )}

          {fotos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p>Nenhuma foto adicionada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fotos.map((foto, index) => (
                <div key={foto.id} className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="relative">
                    <img
                      src={foto.foto_url}
                      alt={foto.legenda || 'Foto'}
                      className="w-full h-48 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removeFoto(index)}
                      className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="p-3">
                    <input
                      type="text"
                      value={foto.legenda}
                      onChange={(e) => updateFotoLegenda(index, e.target.value)}
                      className="input-field text-sm"
                      placeholder="Legenda (ex: Orçamento BA Elétrica - R$ 5.750,90)"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========== TAB 6: CONDIÇÕES ========== */}
      {activeTab === 'condicoes' && (
        <div className="card space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">Condições</h2>

          <div>
            <label className="label">Condições de Pagamento</label>
            <textarea
              name="condicoes_pagamento"
              value={formData.condicoes_pagamento}
              onChange={handleChange}
              className="input-field"
              rows={5}
              placeholder="Descreva as condições de pagamento..."
            />
          </div>

          <div>
            <label className="label">Garantia</label>
            <textarea
              name="texto_garantia"
              value={formData.texto_garantia}
              onChange={handleChange}
              className="input-field"
              rows={5}
              placeholder="Descreva a garantia oferecida..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="label">Validade da Proposta (dias)</label>
              <input
                type="number"
                name="validade_dias"
                value={formData.validade_dias}
                onChange={handleChange}
                className="input-field"
                min={1}
                max={365}
              />
            </div>
          </div>

          <div>
            <label className="label">Observações</label>
            <textarea
              name="observacoes"
              value={formData.observacoes}
              onChange={handleChange}
              className="input-field"
              rows={3}
              placeholder="Observações adicionais..."
            />
          </div>
        </div>
      )}

      {/* ========== BOTÕES FIXOS ========== */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 sm:p-4 z-50">
        <div className="max-w-7xl mx-auto flex flex-wrap gap-2 justify-end">
          <button
            type="button"
            onClick={() => navigate('/propostas')}
            className="btn-secondary text-sm"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSave('rascunho')}
            disabled={loading}
            className="btn-primary text-sm"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar Rascunho
          </button>
          <button
            type="button"
            onClick={() => gerarPDF(false)}
            disabled={loadingPDF}
            className="btn-secondary text-sm"
          >
            {loadingPDF ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            Visualizar PDF
          </button>
          <button
            type="button"
            onClick={() => gerarPDF(true)}
            disabled={loadingPDF}
            className="btn-secondary text-sm"
          >
            <Download className="w-4 h-4" /> Baixar PDF
          </button>
          <button
            type="button"
            onClick={enviarWhatsApp}
            className="btn-secondary text-sm !text-green-700 !border-green-300 hover:!bg-green-50"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp
          </button>
          <button
            type="button"
            onClick={enviarEmail}
            className="btn-secondary text-sm"
          >
            <Mail className="w-4 h-4" /> Email
          </button>
        </div>
      </div>

      {/* ========== PDF TEMPLATE (HIDDEN) ========== */}
      <div ref={pdfRef} style={{ display: 'none', fontFamily: 'Arial, Helvetica, sans-serif', width: '794px', padding: '40px', background: 'white', color: '#333' }}>
        {/* Header - Empresa */}
        <div style={{ textAlign: 'center', marginBottom: '25px', paddingBottom: '20px', borderBottom: '3px solid #2563eb' }}>
          <h1 style={{ fontSize: '24px', margin: '0 0 5px', color: '#1e40af' }}>
            {selectedEmpresa?.nome || 'Empresa'}
          </h1>
          {selectedEmpresa?.cnpj && (
            <p style={{ fontSize: '12px', color: '#666', margin: '2px 0' }}>CNPJ: {selectedEmpresa.cnpj}</p>
          )}
          {selectedEmpresa?.endereco && (
            <p style={{ fontSize: '11px', color: '#888', margin: '2px 0' }}>
              {selectedEmpresa.endereco}
              {selectedEmpresa.cidade && `, ${selectedEmpresa.cidade}`}
              {selectedEmpresa.estado && ` - ${selectedEmpresa.estado}`}
            </p>
          )}
          {(selectedEmpresa?.telefone || selectedEmpresa?.email) && (
            <p style={{ fontSize: '11px', color: '#888', margin: '2px 0' }}>
              {selectedEmpresa.telefone && `Tel: ${selectedEmpresa.telefone}`}
              {selectedEmpresa.telefone && selectedEmpresa.email && ' | '}
              {selectedEmpresa.email && `Email: ${selectedEmpresa.email}`}
            </p>
          )}
        </div>

        {/* Título */}
        <div style={{ background: '#f0f0f0', padding: '12px', textAlign: 'center', margin: '20px 0', borderRadius: '4px' }}>
          <h2 style={{ fontSize: '18px', margin: 0, color: '#333' }}>
            PROPOSTA {formData.tipo_servico ? `- ${TIPOS_SERVICO.find(t => t.value === formData.tipo_servico)?.label || formData.tipo_servico}` : 'COMERCIAL'}
          </h2>
          {formData.numero && (
            <p style={{ fontSize: '12px', color: '#666', margin: '5px 0 0' }}>{formData.numero}</p>
          )}
        </div>

        {/* Dados do destinatário */}
        <div style={{ margin: '20px 0', fontSize: '13px', lineHeight: '1.8' }}>
          <p><strong>Cliente:</strong> {formData.destinatario_nome || '-'}</p>
          {formData.destinatario_cpf_cnpj && <p><strong>CPF/CNPJ:</strong> {formData.destinatario_cpf_cnpj}</p>}
          <p><strong>Data:</strong> {formatDate(new Date().toISOString())}</p>
          {formData.endereco_obra && <p><strong>Endereço da obra:</strong> {formData.endereco_obra}{formData.cidade_obra ? `, ${formData.cidade_obra}` : ''}{formData.estado_obra ? ` - ${formData.estado_obra}` : ''}</p>}
          {formData.potencia_kwp && <p><strong>Potência:</strong> {formData.potencia_kwp} kWp</p>}
          {formData.quantidade_placas && <p><strong>Placas:</strong> {formData.quantidade_placas} unidades</p>}
          {formData.prazo_execucao && <p><strong>Prazo:</strong> {formData.prazo_execucao}</p>}
        </div>

        {/* Fotos */}
        {fotos.length > 0 && fotos.map((foto, idx) => (
          <div key={idx} style={{ margin: '20px 0', pageBreakInside: 'avoid' }}>
            {foto.legenda && (
              <p style={{ fontWeight: 'bold', fontSize: '13px', marginBottom: '8px' }}>{foto.legenda}</p>
            )}
            <img
              src={foto.foto_url}
              alt={foto.legenda || 'Foto'}
              style={{ maxWidth: '100%', border: '1px solid #ddd', borderRadius: '4px' }}
              crossOrigin="anonymous"
            />
          </div>
        ))}

        {/* Seção Proposta - Valores */}
        {itens.length > 0 && (
          <>
            <div style={{ background: '#f0f0f0', padding: '12px', textAlign: 'center', margin: '25px 0 15px', borderRadius: '4px' }}>
              <h2 style={{ fontSize: '16px', margin: 0 }}>PROPOSTA</h2>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', margin: '15px 0', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8f8f8' }}>
                  <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'left' }}>DESCRIÇÃO</th>
                  <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'center', width: '80px' }}>TIPO</th>
                  <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'center', width: '50px' }}>QTD</th>
                  <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'right', width: '110px' }}>UNIT.</th>
                  <th style={{ padding: '10px', border: '1px solid #333', textAlign: 'right', width: '110px' }}>TOTAL</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((item, idx) => (
                  <tr key={idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                    <td style={{ padding: '10px', border: '1px solid #333' }}>{item.descricao}</td>
                    <td style={{ padding: '10px', border: '1px solid #333', textAlign: 'center', fontSize: '11px' }}>
                      {TIPOS_ITEM.find(t => t.value === item.tipo)?.label || item.tipo}
                    </td>
                    <td style={{ padding: '10px', border: '1px solid #333', textAlign: 'center' }}>{item.quantidade}</td>
                    <td style={{ padding: '10px', border: '1px solid #333', textAlign: 'right' }}>{formatCurrency(item.valor_unitario)}</td>
                    <td style={{ padding: '10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(item.valor_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                {valorMaterial > 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '8px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>MATERIAL</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(valorMaterial)}</td>
                  </tr>
                )}
                {valorMaoObra > 0 && (
                  <tr>
                    <td colSpan={4} style={{ padding: '8px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold', fontSize: '12px' }}>MÃO DE OBRA</td>
                    <td style={{ padding: '8px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold' }}>{formatCurrency(valorMaoObra)}</td>
                  </tr>
                )}
                <tr style={{ background: '#f0f0f0' }}>
                  <td colSpan={4} style={{ padding: '12px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>TOTAL</td>
                  <td style={{ padding: '12px 10px', border: '1px solid #333', textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(valorTotal)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {/* Condições de Pagamento */}
        {formData.condicoes_pagamento && (
          <div style={{ margin: '25px 0' }}>
            <h3 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '10px' }}>Condições de Pagamento</h3>
            <p style={{ textAlign: 'justify', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{formData.condicoes_pagamento}</p>
          </div>
        )}

        {/* Garantia */}
        {formData.texto_garantia && (
          <div style={{ margin: '25px 0' }}>
            <h3 style={{ textAlign: 'center', fontSize: '14px', marginBottom: '10px' }}>Garantia</h3>
            <p style={{ textAlign: 'justify', fontSize: '12px', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{formData.texto_garantia}</p>
          </div>
        )}

        {/* Validade */}
        <div style={{ margin: '20px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '12px', color: '#666', fontStyle: 'italic' }}>
            Esta proposta é válida por {formData.validade_dias || 15} dias a partir da data de emissão.
          </p>
        </div>

        {/* Rodapé */}
        <div style={{ marginTop: '40px', borderTop: '1px solid #ddd', paddingTop: '15px', textAlign: 'center', fontSize: '11px', color: '#666' }}>
          <p style={{ margin: '2px 0' }}>
            {selectedEmpresa?.nome}
            {selectedEmpresa?.telefone && ` | ${selectedEmpresa.telefone}`}
            {selectedEmpresa?.email && ` | ${selectedEmpresa.email}`}
          </p>
          <p style={{ margin: '2px 0' }}>
            {selectedEmpresa?.endereco}
            {selectedEmpresa?.cidade && `, ${selectedEmpresa.cidade}`}
            {selectedEmpresa?.estado && ` - ${selectedEmpresa.estado}`}
          </p>
        </div>
      </div>
    </div>
  )
}

export default PropostaForm
