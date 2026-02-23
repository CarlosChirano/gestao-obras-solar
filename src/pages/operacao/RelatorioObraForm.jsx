import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, Save, Camera, Trash2, Loader2, CheckCircle2, XCircle,
  ChevronDown, ChevronUp, Image, FileText, PenTool, AlertCircle,
  Zap, Home, Shield, Thermometer, Settings, Wrench, Eye, Download,
  Plus, X, RotateCcw, Check, Upload
} from 'lucide-react'
import toast from 'react-hot-toast'

// =============================================
// TEMPLATE DE SEÇÕES PRÉ-OBRA
// =============================================
const SECOES_PRE_OBRA = [
  {
    codigo: 'chegada_obra',
    titulo: '📍 Chegada na Obra',
    descricao: 'Registro do estado ao chegar no local',
    itens: [
      { codigo: 'foto_fachada_chegada', descricao: 'Foto da fachada ao chegar', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'placa_criteria_colocada', descricao: 'Placa Critéria posicionada', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'horario_chegada', descricao: 'Horário de chegada', tipo: 'texto' },
      { codigo: 'estado_geral_local', descricao: 'Estado geral do local', tipo: 'texto' },
    ]
  },
  {
    codigo: 'padrao_entrada',
    titulo: '⚡ Padrão de Entrada e Medição',
    descricao: 'Estado pré-existente da instalação elétrica',
    itens: [
      { codigo: 'fachada_padrao', descricao: 'Fachada do padrão (caixa do medidor)', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'padrao_aberto', descricao: 'Padrão aberto (interno)', tipo: 'checkbox' },
      { codigo: 'disjuntor_geral_amperes', descricao: 'Amperagem do disjuntor geral', tipo: 'texto' },
      { codigo: 'fiacao_entrada_bitola', descricao: 'Bitola dos cabos de entrada', tipo: 'texto' },
      { codigo: 'irregularidades_gatos', descricao: 'Irregularidades/"Gatos" encontrados', tipo: 'checkbox' },
      { codigo: 'irregularidades_detalhe', descricao: 'Detalhe das irregularidades', tipo: 'texto' },
      { codigo: 'medidor_aterrado', descricao: 'Medidor aterrado', tipo: 'checkbox' },
      { codigo: 'vidro_medidor', descricao: 'Vidro no medidor', tipo: 'texto' },
      { codigo: 'placa_geracao_propria', descricao: 'Placa de geração própria', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'quadro_geral',
    titulo: '🔌 Quadro Geral e Disjuntores',
    descricao: 'Estado atual do quadro de distribuição',
    itens: [
      { codigo: 'quadro_interno', descricao: 'Interno do quadro (tampa aberta)', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'disjuntores_existentes', descricao: 'Disjuntores existentes (especificações)', tipo: 'checkbox' },
      { codigo: 'haste_aterramento', descricao: 'Haste de aterramento existente', tipo: 'checkbox' },
      { codigo: 'barramento_terra', descricao: 'Barramento de terra no quadro', tipo: 'checkbox' },
      { codigo: 'estado_organizacao', descricao: 'Estado de organização dos cabos', tipo: 'texto' },
    ]
  },
  {
    codigo: 'infraestrutura',
    titulo: '🔧 Infraestrutura e Medições',
    descricao: 'Rota de passagem e medições iniciais',
    itens: [
      { codigo: 'rota_passagem', descricao: 'Rota de passagem dos cabos (eletrodutos, forro)', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'tensao_fase1', descricao: 'Tensão Fase 1 (V)', tipo: 'texto' },
      { codigo: 'tensao_fase2', descricao: 'Tensão Fase 2 (V)', tipo: 'texto' },
      { codigo: 'tensao_fase3', descricao: 'Tensão Fase 3 (V)', tipo: 'texto' },
      { codigo: 'local_inversor', descricao: 'Local definido para o inversor', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'telhado_pre',
    titulo: '🏠 Registro do Telhado e Estrutura',
    descricao: 'Estado pré-existente do telhado (IMPORTANTE para respaldo)',
    itens: [
      { codigo: 'area_instalacao_panoramica', descricao: 'Área de instalação (foto panorâmica)', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'telhas_quebradas', descricao: 'Telhas quebradas/trincadas encontradas', tipo: 'checkbox' },
      { codigo: 'telhas_quebradas_detalhe', descricao: 'Detalhe das telhas com defeito', tipo: 'texto' },
      { codigo: 'cumeeiras_rufos', descricao: 'Estado das cumeeiras e rufos', tipo: 'checkbox' },
      { codigo: 'tipo_telha', descricao: 'Tipo de telha', tipo: 'selecao', opcoes: 'Cerâmica,Fibrocimento,Metálica,Colonial PVC,Policarbonato,Outro' },
    ]
  },
  {
    codigo: 'interior_forro',
    titulo: '🏗️ Interior e Forro',
    descricao: 'Prevenção de responsabilidade por infiltração',
    itens: [
      { codigo: 'forro_comodos', descricao: 'Forro dos cômodos abaixo do telhado', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'marcas_infiltracao', descricao: 'Marcas de infiltração pré-existentes', tipo: 'checkbox' },
      { codigo: 'infiltracao_detalhe', descricao: 'Detalhe da infiltração encontrada', tipo: 'texto' },
      { codigo: 'mofo_umidade', descricao: 'Mofo ou umidade no gesso/madeira', tipo: 'checkbox' },
      { codigo: 'estrutura_interna', descricao: 'Estrutura interna (vigas/caibros do sótão)', tipo: 'checkbox' },
      { codigo: 'suporte_peso', descricao: 'Estrutura suporta o peso extra', tipo: 'checkbox' },
    ]
  },
]

// =============================================
// TEMPLATE DE SEÇÕES PÓS-OBRA
// =============================================
const SECOES_POS_OBRA = [
  {
    codigo: 'sistema_instalado',
    titulo: '☀️ Sistema Instalado',
    descricao: 'Verificação da instalação completa',
    itens: [
      { codigo: 'foto_sistema_completo', descricao: 'Foto completa do sistema instalado', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'estrutura_conforme_projeto', descricao: 'Estrutura instalada conforme projeto', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'fixacao_segura', descricao: 'Fixação adequada e segura', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'telhado_preservado', descricao: 'Telhado preservado (sem danos)', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'tipo_instalacao', descricao: 'Tipo de instalação', tipo: 'selecao', opcoes: 'Embutido,Tubo Metálico,Eletrocalha' },
      { codigo: 'quantidade_strings', descricao: 'Quantidade de strings', tipo: 'texto' },
      { codigo: 'numero_serie_inversor', descricao: 'Número de série do inversor', tipo: 'texto' },
    ]
  },
  {
    codigo: 'conexoes_cc',
    titulo: '🔴 Conexões CC (Corrente Contínua)',
    descricao: 'Verificação do lado DC',
    itens: [
      { codigo: 'conexoes_cc_corretas', descricao: 'Conexões CC realizadas corretamente', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'polaridade_mc4', descricao: 'Polaridade do MC4 correta', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'protecoes_cc', descricao: 'Proteções CC instaladas', tipo: 'checkbox' },
      { codigo: 'string1_tensao', descricao: 'String 1 - Tensão (V)', tipo: 'texto' },
      { codigo: 'string2_tensao', descricao: 'String 2 - Tensão (V)', tipo: 'texto' },
      { codigo: 'string3_tensao', descricao: 'String 3 - Tensão (V)', tipo: 'texto' },
      { codigo: 'string4_tensao', descricao: 'String 4 - Tensão (V)', tipo: 'texto' },
      { codigo: 'string1_terra_pos', descricao: 'String 1 - +/Terra', tipo: 'texto' },
      { codigo: 'string1_terra_neg', descricao: 'String 1 - -/Terra', tipo: 'texto' },
    ]
  },
  {
    codigo: 'conexoes_ca',
    titulo: '🔵 Conexões CA (Corrente Alternada)',
    descricao: 'Verificação do lado AC',
    itens: [
      { codigo: 'protecoes_ca', descricao: 'Proteções CA instaladas', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'montagem_conector_ac', descricao: 'Montagem do conector AC correta', tipo: 'checkbox' },
      { codigo: 'bornes_inversor_torqueados', descricao: 'Bornes AC do inversor torqueados', tipo: 'checkbox' },
      { codigo: 'inversor_compativel', descricao: 'Inversor compatível ao do projeto', tipo: 'checkbox' },
      { codigo: 'inversor_aterrado', descricao: 'Inversor aterrado', tipo: 'checkbox' },
      { codigo: 'inversor_parafusado', descricao: 'Inversor parafusado ao suporte', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'quadro_ac_sistema',
    titulo: '📦 Quadro AC do Sistema (QPCA)',
    descricao: 'Verificação do quadro de proteção',
    itens: [
      { codigo: 'qpca_foto', descricao: 'Foto do QPCA aberto', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'disjuntor_dps_compativel', descricao: 'Disjuntor e DPS compatíveis ao projeto', tipo: 'checkbox' },
      { codigo: 'bornes_torqueados', descricao: 'Bornes disjuntores e DPS torqueados', tipo: 'checkbox' },
      { codigo: 'etiqueta_qr', descricao: 'Etiqueta / QR Code', tipo: 'checkbox' },
      { codigo: 'quadro_vedado', descricao: 'Quadro embutido vedado', tipo: 'checkbox' },
      { codigo: 'tubulacao_metalica_vedada', descricao: 'Tubulação metálica AC vedada', tipo: 'checkbox' },
      { codigo: 'tubulacao_metalica_aterrada', descricao: 'Tubulação metálica AC aterrada', tipo: 'checkbox' },
      { codigo: 'medicao_terra_neutro', descricao: 'Medição Terra e Neutro', tipo: 'texto' },
      { codigo: 'medicao_neutro_fase1', descricao: 'Medição Neutro e Fase 1', tipo: 'texto' },
      { codigo: 'medicao_neutro_fase2', descricao: 'Medição Neutro e Fase 2', tipo: 'texto' },
    ]
  },
  {
    codigo: 'padrao_entrada_pos',
    titulo: '⚡ Padrão de Entrada (Pós)',
    descricao: 'Estado final do padrão',
    itens: [
      { codigo: 'disjuntor_cabo_conforme', descricao: 'Disjuntor e cabo conforme projeto', tipo: 'checkbox' },
      { codigo: 'disjuntor_fixado', descricao: 'Disjuntor fixado', tipo: 'checkbox' },
      { codigo: 'cabos_terminais_crimpados', descricao: 'Cabos com terminais crimpados', tipo: 'checkbox' },
      { codigo: 'bornes_disjuntor_torqueados', descricao: 'Bornes disjuntor torqueados', tipo: 'checkbox' },
      { codigo: 'adequacoes_padrao', descricao: 'Adequações no padrão executadas', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'aterramento',
    titulo: '🔩 Aterramento',
    descricao: 'Sistema de aterramento completo',
    itens: [
      { codigo: 'aterramento_sistema', descricao: 'Aterramento do sistema realizado', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'aterramento_padrao', descricao: 'Aterramento do padrão', tipo: 'checkbox' },
      { codigo: 'aterramento_perfis', descricao: 'Aterramento dos perfis/estrutura', tipo: 'checkbox' },
      { codigo: 'local_aterramento', descricao: 'Local de aterramento (foto)', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'testes_medicoes',
    titulo: '📊 Testes e Medições',
    descricao: 'Verificações elétricas finais',
    itens: [
      { codigo: 'teste_ac_contagem', descricao: 'Ligar AC e verificar contagem regressiva', tipo: 'checkbox' },
      { codigo: 'teste_dc_tensoes', descricao: 'Ligar DC e verificar tensões na tela', tipo: 'checkbox' },
      { codigo: 'potencia_maxima', descricao: 'Potência máxima registrada', tipo: 'texto' },
      { codigo: 'mppt1_tensao', descricao: 'MPPT 1 - Tensão', tipo: 'texto' },
      { codigo: 'mppt1_potencia', descricao: 'MPPT 1 - Potência', tipo: 'texto' },
      { codigo: 'mppt2_tensao', descricao: 'MPPT 2 - Tensão', tipo: 'texto' },
      { codigo: 'mppt2_potencia', descricao: 'MPPT 2 - Potência', tipo: 'texto' },
      { codigo: 'foto_inversor_funcionando', descricao: 'Foto do inversor em funcionamento', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'foto_medicao_padrao_fase1', descricao: 'Medição de tensão padrão Fase 1', tipo: 'texto' },
      { codigo: 'foto_medicao_padrao_fase2', descricao: 'Medição de tensão padrão Fase 2', tipo: 'texto' },
    ]
  },
  {
    codigo: 'monitoramento',
    titulo: '📱 Monitoramento e Configuração',
    descricao: 'Setup de monitoramento remoto',
    itens: [
      { codigo: 'planta_monitoramento_criada', descricao: 'Planta de monitoramento criada', tipo: 'checkbox' },
      { codigo: 'monitoramento_configurado', descricao: 'Monitoramento configurado', tipo: 'checkbox' },
      { codigo: 'internet_tipo', descricao: 'Tipo de internet', tipo: 'selecao', opcoes: 'Cabeada,Wi-fi Cliente,Wi-fi Criteria' },
      { codigo: 'serie_datalogger', descricao: 'Nº série datalogger', tipo: 'texto' },
      { codigo: 'login_monitoramento', descricao: 'Login monitoramento', tipo: 'texto' },
      { codigo: 'print_monitoramento', descricao: 'Print da planta de monitoramento', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'finalizacao',
    titulo: '✅ Finalização',
    descricao: 'Verificações finais e limpeza',
    itens: [
      { codigo: 'sistema_pronto_comissionamento', descricao: 'Sistema instalado e pronto para comissionamento', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'limpeza_instalacao', descricao: 'Limpeza da instalação realizada', tipo: 'checkbox', obrigatorio: true },
      { codigo: 'drone_realizado', descricao: 'Voo de drone realizado', tipo: 'checkbox' },
      { codigo: 'instalacao_conforme_pre_obra', descricao: 'Instalação conforme pré-obra', tipo: 'checkbox' },
      { codigo: 'disjuntor_identificado_geral', descricao: 'Disjuntor identificado: Geral', tipo: 'checkbox' },
      { codigo: 'disjuntor_identificado_solar', descricao: 'Disjuntor identificado: Solar', tipo: 'checkbox' },
    ]
  },
  {
    codigo: 'termografia',
    titulo: '🌡️ Termografia',
    descricao: 'Registro termográfico (quando aplicável)',
    itens: [
      { codigo: 'termografia_realizada', descricao: 'Termografia realizada', tipo: 'checkbox' },
      { codigo: 'termo_horario_off', descricao: 'Horário sistema OFF', tipo: 'texto' },
      { codigo: 'termo_horario_on', descricao: 'Horário sistema ON', tipo: 'texto' },
      { codigo: 'termo_potencia_registrada', descricao: 'Potência registrada', tipo: 'texto' },
      { codigo: 'termo_nao_realizado_motivo', descricao: 'Motivo de não realização', tipo: 'texto' },
    ]
  },
]

// =============================================
// COMPONENTE DE ASSINATURA
// =============================================
const SignaturePad = ({ value, onChange, label, cpfValue, onCpfChange, nomeValue, onNomeChange }) => {
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(!!value)

  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')
      const img = new window.Image()
      img.onload = () => {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height)
        ctx.drawImage(img, 0, 0)
      }
      img.src = value
    }
  }, [value])

  const startDrawing = (e) => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = '#000'
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    if (isDrawing && canvasRef.current) {
      onChange(canvasRef.current.toDataURL('image/png'))
    }
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
    onChange(null)
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
          <PenTool className="w-4 h-4" />
          {label}
        </h4>
        {hasSignature && (
          <button onClick={clearSignature} className="text-xs text-red-600 hover:text-red-700 flex items-center gap-1">
            <RotateCcw className="w-3 h-3" /> Limpar
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Nome completo *</label>
          <input
            type="text"
            value={nomeValue || ''}
            onChange={(e) => onNomeChange(e.target.value)}
            placeholder="Nome completo"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">CPF *</label>
          <input
            type="text"
            value={cpfValue || ''}
            onChange={(e) => {
              let v = e.target.value.replace(/\D/g, '')
              if (v.length > 11) v = v.slice(0, 11)
              if (v.length > 9) v = v.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, '$1.$2.$3-$4')
              else if (v.length > 6) v = v.replace(/(\d{3})(\d{3})(\d{1,3})/, '$1.$2.$3')
              else if (v.length > 3) v = v.replace(/(\d{3})(\d{1,3})/, '$1.$2')
              onCpfChange(v)
            }}
            placeholder="000.000.000-00"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>
      </div>
      <div className="border-2 border-dashed border-gray-300 rounded-lg bg-white relative">
        <canvas
          ref={canvasRef}
          width={500}
          height={150}
          className="w-full cursor-crosshair touch-none"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
        {!hasSignature && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <p className="text-gray-400 text-sm">Assine aqui</p>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================
// COMPONENTE DE UPLOAD DE FOTO POR ITEM
// =============================================
const FotoUpload = ({ relatorioId, secaoId, itemId, fotos, onUpload, onDelete }) => {
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop().toLowerCase()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${ext}`
        const filePath = `relatorios/${relatorioId}/${fileName}`

        const { error: upErr } = await supabase.storage
          .from('os-anexos')
          .upload(filePath, file)
        if (upErr) throw upErr

        const { data: { publicUrl } } = supabase.storage
          .from('os-anexos')
          .getPublicUrl(filePath)

        await onUpload({ foto_url: publicUrl, secao_id: secaoId, item_id: itemId })
      }
    } catch (err) {
      toast.error('Erro no upload: ' + err.message)
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const itemFotos = fotos?.filter(f => f.item_id === itemId) || []

  return (
    <div className="flex items-center gap-2 mt-1">
      {itemFotos.map(f => (
        <div key={f.id} className="relative group">
          <img src={f.foto_url} alt="" className="w-12 h-12 object-cover rounded-lg border" />
          <button
            onClick={() => onDelete(f.id)}
            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      ))}
      <button
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-12 h-12 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-blue-400 hover:bg-blue-50 transition-colors"
      >
        {uploading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <Camera className="w-4 h-4 text-gray-400" />}
      </button>
      <input ref={fileRef} type="file" accept="image/*" capture="environment" multiple className="hidden" onChange={handleUpload} />
    </div>
  )
}

// =============================================
// COMPONENTE PRINCIPAL
// =============================================
const RelatorioObraForm = () => {
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const isEditing = !!id && id !== 'novo'

  const tipoParam = searchParams.get('tipo') || 'pre_obra'
  const osIdParam = searchParams.get('os_id')

  const [tipo, setTipo] = useState(tipoParam)
  const [formData, setFormData] = useState({
    cliente_nome: '', endereco: '', bairro: '', cidade: '',
    sistema_kwp: '', quantidade_placas: '', marca_modulos: '',
    potencia_modulos_wp: '', marca_inversor: '', modelo_inversor: '',
    tipo_telhado: '', responsavel_tecnico: '', responsavel_tecnico_cpf: '',
    equipe_responsavel: '', observacoes_gerais: '', resultado: '',
    motivo_reprovacao: '', pendencias: '',
    assinatura_tecnico: null, assinatura_tecnico_cpf: '', assinatura_tecnico_nome: '',
    assinatura_cliente: null, assinatura_cliente_cpf: '', assinatura_cliente_nome: '',
  })
  const [itensRespostas, setItensRespostas] = useState({})
  const [fotos, setFotos] = useState([])
  const [expandedSections, setExpandedSections] = useState({})
  const [loading, setLoading] = useState(false)
  const [osSearch, setOsSearch] = useState('')
  const [selectedOS, setSelectedOS] = useState(null)

  const template = tipo === 'pre_obra' ? SECOES_PRE_OBRA : SECOES_POS_OBRA

  // Buscar OS para vincular
  const { data: ordens } = useQuery({
    queryKey: ['os-lista-simples'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, endereco, bairro, cidade, quantidade_placas, potencia_kwp, cliente:clientes(nome)')
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('numero_os', { ascending: false })
        .limit(200)
      return data
    }
  })

  // Carregar relatório existente
  useEffect(() => {
    if (!isEditing) return
    const load = async () => {
      setLoading(true)
      const { data: rel } = await supabase
        .from('relatorios_obra')
        .select('*')
        .eq('id', id)
        .single()
      if (rel) {
        setTipo(rel.tipo)
        setFormData({
          cliente_nome: rel.cliente_nome || '',
          endereco: rel.endereco || '',
          bairro: rel.bairro || '',
          cidade: rel.cidade || '',
          sistema_kwp: rel.sistema_kwp || '',
          quantidade_placas: rel.quantidade_placas || '',
          marca_modulos: rel.marca_modulos || '',
          potencia_modulos_wp: rel.potencia_modulos_wp || '',
          marca_inversor: rel.marca_inversor || '',
          modelo_inversor: rel.modelo_inversor || '',
          tipo_telhado: rel.tipo_telhado || '',
          responsavel_tecnico: rel.responsavel_tecnico || '',
          responsavel_tecnico_cpf: rel.responsavel_tecnico_cpf || '',
          equipe_responsavel: rel.equipe_responsavel || '',
          observacoes_gerais: rel.observacoes_gerais || '',
          resultado: rel.resultado || '',
          motivo_reprovacao: rel.motivo_reprovacao || '',
          pendencias: rel.pendencias || '',
          assinatura_tecnico: rel.assinatura_tecnico,
          assinatura_tecnico_cpf: rel.assinatura_tecnico_cpf || '',
          assinatura_tecnico_nome: rel.assinatura_tecnico_nome || '',
          assinatura_cliente: rel.assinatura_cliente,
          assinatura_cliente_cpf: rel.assinatura_cliente_cpf || '',
          assinatura_cliente_nome: rel.assinatura_cliente_nome || '',
        })
        // Carregar itens
        const { data: itens } = await supabase
          .from('relatorio_itens')
          .select('*')
          .eq('relatorio_id', id)
        if (itens) {
          const map = {}
          itens.forEach(i => {
            map[i.codigo] = {
              checkbox: i.valor_checkbox,
              texto: i.valor_texto || '',
              numero: i.valor_numero,
              selecao: i.valor_selecao || '',
              id: i.id
            }
          })
          setItensRespostas(map)
        }
        // Carregar fotos
        const { data: fotosData } = await supabase
          .from('relatorio_fotos')
          .select('*')
          .eq('relatorio_id', id)
        if (fotosData) setFotos(fotosData)
      }
      setLoading(false)
    }
    load()
  }, [id, isEditing])

  // Auto-preencher dados da OS selecionada
  const selectOS = (os) => {
    setSelectedOS(os)
    setFormData(prev => ({
      ...prev,
      cliente_nome: os.cliente?.nome || prev.cliente_nome,
      endereco: os.endereco || prev.endereco,
      bairro: os.bairro || prev.bairro,
      cidade: os.cidade || prev.cidade,
      sistema_kwp: os.potencia_kwp || prev.sistema_kwp,
      quantidade_placas: os.quantidade_placas || prev.quantidade_placas,
    }))
    setOsSearch('')
  }

  const toggleSection = (codigo) => {
    setExpandedSections(prev => ({ ...prev, [codigo]: !prev[codigo] }))
  }

  const updateItem = (codigo, campo, valor) => {
    setItensRespostas(prev => ({
      ...prev,
      [codigo]: { ...prev[codigo], [campo]: valor }
    }))
  }

  // Upload de foto
  const handleFotoUpload = async ({ foto_url, secao_id, item_id }) => {
    const novaFoto = {
      id: `temp-${Date.now()}`,
      foto_url,
      secao_id,
      item_id,
      relatorio_id: isEditing ? id : null
    }
    setFotos(prev => [...prev, novaFoto])
  }

  const handleFotoDelete = async (fotoId) => {
    setFotos(prev => prev.filter(f => f.id !== fotoId))
    if (!String(fotoId).startsWith('temp-')) {
      await supabase.from('relatorio_fotos').delete().eq('id', fotoId)
    }
  }

  // SALVAR
  const handleSubmit = async (finalizar = false) => {
    if (!formData.cliente_nome) {
      toast.error('Preencha o nome do cliente')
      return
    }

    if (finalizar) {
      if (!formData.assinatura_tecnico || !formData.assinatura_tecnico_cpf) {
        toast.error('Assinatura e CPF do técnico são obrigatórios para finalizar')
        return
      }
      if (!formData.assinatura_cliente || !formData.assinatura_cliente_cpf) {
        toast.error('Assinatura e CPF do cliente são obrigatórios para finalizar')
        return
      }
    }

    setLoading(true)
    try {
      const relData = {
        tipo,
        ordem_servico_id: selectedOS?.id || osIdParam || null,
        cliente_nome: formData.cliente_nome,
        endereco: formData.endereco,
        bairro: formData.bairro,
        cidade: formData.cidade,
        sistema_kwp: formData.sistema_kwp ? parseFloat(formData.sistema_kwp) : null,
        quantidade_placas: formData.quantidade_placas ? parseInt(formData.quantidade_placas) : null,
        marca_modulos: formData.marca_modulos,
        potencia_modulos_wp: formData.potencia_modulos_wp ? parseInt(formData.potencia_modulos_wp) : null,
        marca_inversor: formData.marca_inversor,
        modelo_inversor: formData.modelo_inversor,
        tipo_telhado: formData.tipo_telhado,
        responsavel_tecnico: formData.responsavel_tecnico,
        responsavel_tecnico_cpf: formData.responsavel_tecnico_cpf,
        equipe_responsavel: formData.equipe_responsavel,
        observacoes_gerais: formData.observacoes_gerais,
        resultado: formData.resultado || null,
        motivo_reprovacao: formData.motivo_reprovacao,
        pendencias: formData.pendencias,
        assinatura_tecnico: formData.assinatura_tecnico,
        assinatura_tecnico_cpf: formData.assinatura_tecnico_cpf,
        assinatura_tecnico_nome: formData.assinatura_tecnico_nome,
        assinatura_cliente: formData.assinatura_cliente,
        assinatura_cliente_cpf: formData.assinatura_cliente_cpf,
        assinatura_cliente_nome: formData.assinatura_cliente_nome,
        status: finalizar ? 'assinado' : 'rascunho',
        atualizado_em: new Date().toISOString(),
      }

      let relatorioId = id
      if (isEditing) {
        const { error } = await supabase.from('relatorios_obra').update(relData).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('relatorios_obra').insert(relData).select('id').single()
        if (error) throw error
        relatorioId = data.id
      }

      // Salvar seções e itens
      for (const secao of template) {
        // Upsert seção
        const { data: secaoData } = await supabase
          .from('relatorio_secoes')
          .upsert({
            relatorio_id: relatorioId,
            codigo: secao.codigo,
            titulo: secao.titulo,
            ordem: template.indexOf(secao),
          }, { onConflict: 'relatorio_id,codigo', ignoreDuplicates: false })
          .select('id')
          .single()

        const secaoId = secaoData?.id

        // Salvar itens da seção
        for (const item of secao.itens) {
          const resp = itensRespostas[item.codigo] || {}
          await supabase
            .from('relatorio_itens')
            .upsert({
              relatorio_id: relatorioId,
              secao_id: secaoId,
              codigo: item.codigo,
              descricao: item.descricao,
              tipo_resposta: item.tipo,
              obrigatorio: item.obrigatorio || false,
              valor_checkbox: resp.checkbox || false,
              valor_texto: resp.texto || null,
              valor_numero: resp.numero || null,
              valor_selecao: resp.selecao || null,
              ordem: secao.itens.indexOf(item),
            }, { onConflict: 'relatorio_id,codigo', ignoreDuplicates: false })
        }
      }

      // Salvar fotos novas
      const fotosNovas = fotos.filter(f => String(f.id).startsWith('temp-'))
      for (const foto of fotosNovas) {
        await supabase.from('relatorio_fotos').insert({
          relatorio_id: relatorioId,
          secao_id: foto.secao_id,
          item_id: foto.item_id,
          foto_url: foto.foto_url,
        })
      }

      queryClient.invalidateQueries(['relatorios-obra'])
      toast.success(finalizar ? 'Relatório assinado e salvo!' : 'Rascunho salvo!')
      navigate('/relatorios-obra')

    } catch (err) {
      toast.error('Erro ao salvar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // Contadores por seção
  const getSecaoProgress = (secao) => {
    let total = 0, preenchidos = 0
    secao.itens.forEach(item => {
      total++
      const resp = itensRespostas[item.codigo]
      if (resp) {
        if (item.tipo === 'checkbox' && resp.checkbox) preenchidos++
        else if (item.tipo === 'texto' && resp.texto) preenchidos++
        else if (item.tipo === 'selecao' && resp.selecao) preenchidos++
      }
    })
    return { total, preenchidos }
  }

  if (loading && isEditing) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-4xl mx-auto pb-32">
      {/* Header */}
      <div className={`rounded-2xl p-5 ${tipo === 'pre_obra' ? 'bg-gradient-to-r from-orange-500 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 hover:bg-white/20 rounded-lg text-white/80 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-white">
              {tipo === 'pre_obra' ? '🏗️ Relatório Pré-Obra' : '✅ Relatório Pós-Obra'}
            </h1>
            <p className="text-sm text-white/80 mt-0.5">
              {tipo === 'pre_obra' 
                ? 'Registro de chegada — estado pré-existente' 
                : 'Checklist completo de entrega'}
            </p>
          </div>
        </div>
        {/* Barra de progresso global */}
        {(() => {
          let totalG = 0, preenchidosG = 0
          template.forEach(s => { const p = getSecaoProgress(s); totalG += p.total; preenchidosG += p.preenchidos })
          const pct = totalG > 0 ? Math.round((preenchidosG / totalG) * 100) : 0
          return (
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs text-white/80 mb-1.5">
                <span>{preenchidosG} de {totalG} itens</span>
                <span className="font-semibold text-white">{pct}%</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })()}
      </div>

      {/* Vincular OS */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-gray-700 flex items-center gap-2">
          <FileText className="w-4 h-4" />
          Vincular à Ordem de Serviço
        </h3>
        {selectedOS ? (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div>
              <span className="font-medium text-blue-900">{selectedOS.numero_os}</span>
              <span className="text-sm text-blue-700 ml-2">— {selectedOS.cliente?.nome}</span>
            </div>
            <button onClick={() => setSelectedOS(null)} className="text-blue-600 hover:text-blue-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar OS pelo número ou cliente..."
              value={osSearch}
              onChange={(e) => setOsSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            {osSearch.length >= 2 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                {ordens?.filter(o => 
                  o.numero_os?.toLowerCase().includes(osSearch.toLowerCase()) ||
                  o.cliente?.nome?.toLowerCase().includes(osSearch.toLowerCase())
                ).slice(0, 10).map(o => (
                  <button
                    key={o.id}
                    onClick={() => selectOS(o)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-sm border-b last:border-0"
                  >
                    <span className="font-medium">{o.numero_os}</span>
                    <span className="text-gray-500 ml-2">{o.cliente?.nome}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dados do Cabeçalho */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h3 className="font-semibold text-gray-700">📋 Dados da Obra</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cliente *</label>
            <input type="text" value={formData.cliente_nome} onChange={e => setFormData(p => ({...p, cliente_nome: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Endereço</label>
            <input type="text" value={formData.endereco} onChange={e => setFormData(p => ({...p, endereco: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Bairro</label>
            <input type="text" value={formData.bairro} onChange={e => setFormData(p => ({...p, bairro: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Cidade</label>
            <input type="text" value={formData.cidade} onChange={e => setFormData(p => ({...p, cidade: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Sistema (kWp)</label>
            <input type="number" step="0.01" value={formData.sistema_kwp} onChange={e => setFormData(p => ({...p, sistema_kwp: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Qtd Placas</label>
            <input type="number" value={formData.quantidade_placas} onChange={e => setFormData(p => ({...p, quantidade_placas: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Marca Módulos</label>
            <input type="text" value={formData.marca_modulos} onChange={e => setFormData(p => ({...p, marca_modulos: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Potência Módulos (Wp)</label>
            <input type="number" value={formData.potencia_modulos_wp} onChange={e => setFormData(p => ({...p, potencia_modulos_wp: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Marca Inversor</label>
            <input type="text" value={formData.marca_inversor} onChange={e => setFormData(p => ({...p, marca_inversor: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Modelo Inversor</label>
            <input type="text" value={formData.modelo_inversor} onChange={e => setFormData(p => ({...p, modelo_inversor: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Responsável Técnico</label>
            <input type="text" value={formData.responsavel_tecnico} onChange={e => setFormData(p => ({...p, responsavel_tecnico: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Equipe</label>
            <input type="text" value={formData.equipe_responsavel} onChange={e => setFormData(p => ({...p, equipe_responsavel: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      </div>

      {/* Seções do Checklist */}
      {template.map((secao, secIdx) => {
        const progress = getSecaoProgress(secao)
        const isExpanded = expandedSections[secao.codigo] !== false
        const pct = progress.total > 0 ? Math.round((progress.preenchidos / progress.total) * 100) : 0
        const isDone = progress.preenchidos === progress.total && progress.total > 0

        return (
          <div key={secao.codigo} className={`bg-white border rounded-2xl overflow-hidden transition-shadow ${isDone ? 'border-green-200' : 'border-gray-200'} ${isExpanded ? 'shadow-sm' : ''}`}>
            <button
              onClick={() => toggleSection(secao.codigo)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${isDone ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <span className="text-gray-400 font-bold text-xs">{secIdx + 1}</span>}
                </div>
                <div className="min-w-0 flex-1 text-left">
                  <h3 className="font-semibold text-gray-800 text-sm truncate">{secao.titulo}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[120px]">
                      <div className={`h-full rounded-full transition-all duration-300 ${isDone ? 'bg-green-500' : pct > 0 ? 'bg-blue-500' : 'bg-gray-200'}`} style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[11px] text-gray-400 tabular-nums">{progress.preenchidos}/{progress.total}</span>
                  </div>
                </div>
              </div>
              {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
            </button>

            {isExpanded && (
              <div className="border-t border-gray-100 p-4 space-y-2">
                {secao.descricao && <p className="text-xs text-gray-400 mb-3 italic">{secao.descricao}</p>}
                
                {secao.itens.map(item => {
                  const resp = itensRespostas[item.codigo] || {}
                  
                  return (
                    <div key={item.codigo} className={`flex items-start gap-3 py-2.5 px-3 rounded-xl transition-colors ${
                      item.tipo === 'checkbox' && resp.checkbox ? 'bg-green-50/50' : 'hover:bg-gray-50/50'
                    }`}>
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        {item.tipo === 'checkbox' && (
                          <label className="flex items-start gap-3 flex-1 cursor-pointer">
                            <div className={`w-5 h-5 mt-0.5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                              resp.checkbox 
                                ? 'bg-green-500 border-green-500' 
                                : 'border-gray-300 hover:border-blue-400'
                            }`}>
                              {resp.checkbox && <Check className="w-3.5 h-3.5 text-white" strokeWidth={3} />}
                            </div>
                            <input
                              type="checkbox"
                              checked={resp.checkbox || false}
                              onChange={e => updateItem(item.codigo, 'checkbox', e.target.checked)}
                              className="hidden"
                            />
                            <span className={`text-sm leading-snug ${resp.checkbox ? 'text-gray-700' : 'text-gray-600'} ${item.obrigatorio ? 'font-medium' : ''}`}>
                              {item.descricao}
                              {item.obrigatorio && <span className="text-red-400 ml-0.5 text-xs">●</span>}
                            </span>
                          </label>
                        )}
                        
                        {item.tipo === 'texto' && (
                          <div className="flex-1">
                            <label className="text-sm text-gray-600 mb-1 block">
                              {item.descricao}
                              {item.obrigatorio && <span className="text-red-400 ml-0.5 text-xs">●</span>}
                            </label>
                            <input
                              type="text"
                              value={resp.texto || ''}
                              onChange={e => updateItem(item.codigo, 'texto', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50 transition-all"
                              placeholder="Preencher..."
                            />
                          </div>
                        )}
                        
                        {item.tipo === 'selecao' && (
                          <div className="flex-1">
                            <label className="text-sm text-gray-600 mb-1 block">{item.descricao}</label>
                            <select
                              value={resp.selecao || ''}
                              onChange={e => updateItem(item.codigo, 'selecao', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50/50"
                            >
                              <option value="">Selecionar...</option>
                              {item.opcoes?.split(',').map(op => (
                                <option key={op} value={op.trim()}>{op.trim()}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {/* Botão de foto */}
                      <div className="flex-shrink-0">
                        <FotoUpload
                          relatorioId={isEditing ? id : 'temp'}
                          secaoId={null}
                          itemId={item.codigo}
                          fotos={fotos.filter(f => f.item_id === item.codigo)}
                          onUpload={handleFotoUpload}
                          onDelete={handleFotoDelete}
                        />
                      </div>
                    </div>
                  )
                })}

                {/* Observações da seção */}
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <label className="text-xs text-gray-500 mb-1 block">Observações desta seção</label>
                  <textarea
                    rows={2}
                    value={itensRespostas[`obs_${secao.codigo}`]?.texto || ''}
                    onChange={e => updateItem(`obs_${secao.codigo}`, 'texto', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
                    placeholder="Observações..."
                  />
                </div>
              </div>
            )}
          </div>
        )
      })}

      {/* Resultado (apenas pós-obra) */}
      {tipo === 'pos_obra' && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
          <h3 className="font-semibold text-gray-700">🏆 Resultado do Comissionamento</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setFormData(p => ({...p, resultado: 'aprovado'}))}
              className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                formData.resultado === 'aprovado'
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-green-300'
              }`}
            >
              <CheckCircle2 className="w-5 h-5" /> Aprovado
            </button>
            <button
              onClick={() => setFormData(p => ({...p, resultado: 'reprovado'}))}
              className={`flex-1 py-3 rounded-xl border-2 flex items-center justify-center gap-2 font-medium transition-all ${
                formData.resultado === 'reprovado'
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:border-red-300'
              }`}
            >
              <XCircle className="w-5 h-5" /> Reprovado
            </button>
          </div>
          {formData.resultado === 'reprovado' && (
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Motivo da reprovação</label>
              <textarea rows={3} value={formData.motivo_reprovacao} onChange={e => setFormData(p => ({...p, motivo_reprovacao: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            </div>
          )}
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Pendências</label>
            <textarea rows={2} value={formData.pendencias} onChange={e => setFormData(p => ({...p, pendencias: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
        </div>
      )}

      {/* Observações gerais */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">📝 Observações Gerais</label>
        <textarea rows={3} value={formData.observacoes_gerais} onChange={e => setFormData(p => ({...p, observacoes_gerais: e.target.value}))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Observações gerais sobre a obra..." />
      </div>

      {/* Assinaturas */}
      <div className="space-y-4">
        <h3 className="font-semibold text-gray-700 text-lg">✍️ Assinaturas</h3>
        <SignaturePad
          label="Assinatura do Responsável Técnico"
          value={formData.assinatura_tecnico}
          onChange={v => setFormData(p => ({...p, assinatura_tecnico: v}))}
          cpfValue={formData.assinatura_tecnico_cpf}
          onCpfChange={v => setFormData(p => ({...p, assinatura_tecnico_cpf: v}))}
          nomeValue={formData.assinatura_tecnico_nome}
          onNomeChange={v => setFormData(p => ({...p, assinatura_tecnico_nome: v}))}
        />
        <SignaturePad
          label="Assinatura do Cliente"
          value={formData.assinatura_cliente}
          onChange={v => setFormData(p => ({...p, assinatura_cliente: v}))}
          cpfValue={formData.assinatura_cliente_cpf}
          onCpfChange={v => setFormData(p => ({...p, assinatura_cliente_cpf: v}))}
          nomeValue={formData.assinatura_cliente_nome}
          onNomeChange={v => setFormData(p => ({...p, assinatura_cliente_nome: v}))}
        />
      </div>

      {/* Botões de ação fixos */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 p-3 sm:p-4 flex gap-2 sm:gap-3 justify-end z-50">
        <button
          onClick={() => navigate(-1)}
          className="px-3 sm:px-4 py-2.5 border border-gray-300 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={() => handleSubmit(false)}
          disabled={loading}
          className="px-3 sm:px-4 py-2.5 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-800 flex items-center gap-2 transition-colors"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span className="hidden sm:inline">Salvar</span> Rascunho
        </button>
        <button
          onClick={() => handleSubmit(true)}
          disabled={loading}
          className={`px-4 sm:px-6 py-2.5 text-white rounded-xl text-sm flex items-center gap-2 font-medium transition-colors ${
            tipo === 'pre_obra' 
              ? 'bg-orange-600 hover:bg-orange-700' 
              : 'bg-emerald-600 hover:bg-emerald-700'
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          Assinar e Finalizar
        </button>
      </div>
    </div>
  )
}

export default RelatorioObraForm
