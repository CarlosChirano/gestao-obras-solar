import { useRef, useState, useEffect } from 'react'
import { X, Check, RotateCcw, Maximize2, Minimize2, AlertCircle, CheckCircle2, ArrowRight, User, CreditCard } from 'lucide-react'

// Validação de CPF
const validarCPF = (cpf) => {
  // Remove caracteres não numéricos
  cpf = cpf.replace(/[^\d]/g, '')

  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false

  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false

  // Validação do primeiro dígito verificador
  let soma = 0
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf.charAt(i)) * (10 - i)
  }
  let resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(9))) return false

  // Validação do segundo dígito verificador
  soma = 0
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf.charAt(i)) * (11 - i)
  }
  resto = (soma * 10) % 11
  if (resto === 10 || resto === 11) resto = 0
  if (resto !== parseInt(cpf.charAt(10))) return false

  return true
}

// Máscara de CPF
const formatarCPF = (valor) => {
  const numeros = valor.replace(/\D/g, '').slice(0, 11)
  
  if (numeros.length <= 3) return numeros
  if (numeros.length <= 6) return `${numeros.slice(0, 3)}.${numeros.slice(3)}`
  if (numeros.length <= 9) return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6)}`
  return `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`
}

const SignaturePad = ({ 
  onSave, 
  onClose, 
  title = 'Assinatura',
  subtitle = 'Preencha seus dados para assinar'
}) => {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  
  // Estado do formulário
  const [etapa, setEtapa] = useState(1) // 1 = dados, 2 = assinatura
  const [nome, setNome] = useState('')
  const [cpf, setCpf] = useState('')
  const [cpfValido, setCpfValido] = useState(null) // null, true, false
  
  // Estado do canvas
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Validar CPF ao digitar
  useEffect(() => {
    const cpfLimpo = cpf.replace(/\D/g, '')
    if (cpfLimpo.length === 11) {
      setCpfValido(validarCPF(cpf))
    } else {
      setCpfValido(null)
    }
  }, [cpf])

  // Configurar canvas
  useEffect(() => {
    if (etapa !== 2) return
    
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
      
      const ctx = canvas.getContext('2d')
      ctx.scale(dpr, dpr)
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      ctx.strokeStyle = '#1e293b'
      ctx.lineWidth = 2.5
      
      // Fundo branco
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, rect.width, rect.height)
    }

    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
    return () => window.removeEventListener('resize', resizeCanvas)
  }, [etapa, isFullscreen])

  // Funções de desenho
  const getCoordinates = (e) => {
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    if (e.touches) {
      return {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
      }
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const startDrawing = (e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)
    
    ctx.beginPath()
    ctx.moveTo(x, y)
    setIsDrawing(true)
    setHasSignature(true)
  }

  const draw = (e) => {
    if (!isDrawing) return
    e.preventDefault()
    
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { x, y } = getCoordinates(e)
    
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  const stopDrawing = () => {
    setIsDrawing(false)
  }

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const rect = canvas.getBoundingClientRect()
    
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
    setHasSignature(false)
  }

  // Avançar para assinatura
  const avancarParaAssinatura = () => {
    if (!nome.trim()) {
      return
    }
    if (!cpfValido) {
      return
    }
    setEtapa(2)
  }

  // Salvar assinatura
  const saveSignature = () => {
    if (!hasSignature) return
    
    const canvas = canvasRef.current
    const dataUrl = canvas.toDataURL('image/png')
    
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        onSave(blob, dataUrl, nome, cpf)
      })
  }

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen)
  }

  const modalClass = isFullscreen 
    ? 'fixed inset-0 z-50 bg-white flex flex-col'
    : 'modal-overlay'

  const contentClass = isFullscreen
    ? 'flex-1 flex flex-col p-4'
    : 'modal-content modal-lg'

  return (
    <div className={modalClass}>
      <div className={contentClass}>
        {/* Header */}
        <div className={`flex items-center justify-between ${isFullscreen ? 'mb-4' : 'modal-header'}`}>
          <div>
            <h2 className="modal-title">{title}</h2>
            <p className="text-sm text-gray-500">{subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {etapa === 2 && (
              <button 
                onClick={toggleFullscreen}
                className="btn-ghost p-2"
                title={isFullscreen ? 'Minimizar' : 'Tela cheia'}
              >
                {isFullscreen ? (
                  <Minimize2 className="w-5 h-5" />
                ) : (
                  <Maximize2 className="w-5 h-5" />
                )}
              </button>
            )}
            <button onClick={onClose} className="btn-ghost p-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Indicador de etapas */}
        <div className={`flex items-center justify-center gap-4 ${isFullscreen ? 'mb-4' : 'px-6 py-3 border-b border-gray-200'}`}>
          <div className={`flex items-center gap-2 ${etapa === 1 ? 'text-blue-600' : 'text-green-600'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              etapa === 1 ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'
            }`}>
              {etapa > 1 ? <CheckCircle2 className="w-5 h-5" /> : '1'}
            </div>
            <span className="font-medium text-sm">Identificação</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-2 ${etapa === 2 ? 'text-blue-600' : 'text-gray-400'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
              etapa === 2 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'
            }`}>
              2
            </div>
            <span className="font-medium text-sm">Assinatura</span>
          </div>
        </div>

        {/* ETAPA 1: Identificação */}
        {etapa === 1 && (
          <>
            <div className={`${isFullscreen ? '' : 'modal-body'} space-y-4`}>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-sm text-blue-800">
                  <strong>Importante:</strong> Para validar sua assinatura, informe seu CPF e nome completo. 
                  Esses dados serão registrados junto à assinatura para garantir autenticidade.
                </p>
              </div>

              {/* Nome */}
              <div>
                <label className="label flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Nome Completo *
                </label>
                <input
                  type="text"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  className="input-field"
                  placeholder="Digite seu nome completo"
                  autoFocus
                />
              </div>

              {/* CPF */}
              <div>
                <label className="label flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  CPF *
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => setCpf(formatarCPF(e.target.value))}
                    className={`input-field pr-10 ${
                      cpfValido === false ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 
                      cpfValido === true ? 'border-green-500 focus:ring-green-500 focus:border-green-500' : ''
                    }`}
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    {cpfValido === true && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {cpfValido === false && (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>
                </div>
                {cpfValido === false && (
                  <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    CPF inválido. Verifique os números digitados.
                  </p>
                )}
                {cpfValido === true && (
                  <p className="text-green-600 text-sm mt-1 flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" />
                    CPF válido!
                  </p>
                )}
              </div>
            </div>

            <div className={isFullscreen ? 'mt-4 flex justify-end gap-3' : 'modal-footer'}>
              <button type="button" onClick={onClose} className="btn-secondary">
                Cancelar
              </button>
              <button 
                onClick={avancarParaAssinatura}
                disabled={!nome.trim() || !cpfValido}
                className="btn-primary"
              >
                Continuar
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        {/* ETAPA 2: Assinatura */}
        {etapa === 2 && (
          <>
            {/* Info do assinante */}
            <div className={`${isFullscreen ? 'mb-4' : 'px-6 py-3 border-b border-gray-200'}`}>
              <div className="bg-gray-50 rounded-lg p-3 flex items-center gap-4">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{nome}</p>
                  <p className="text-sm text-gray-500">CPF: {cpf}</p>
                </div>
                <button 
                  onClick={() => setEtapa(1)}
                  className="ml-auto text-sm text-blue-600 hover:underline"
                >
                  Alterar
                </button>
              </div>
            </div>

            {/* Área de assinatura */}
            <div className={`flex-1 ${isFullscreen ? '' : 'modal-body'}`}>
              <div 
                ref={containerRef}
                className={`relative bg-white border-2 border-dashed border-gray-300 rounded-xl overflow-hidden ${
                  isFullscreen ? 'h-full min-h-[300px]' : 'h-64'
                }`}
              >
                <canvas
                  ref={canvasRef}
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onMouseDown={startDrawing}
                  onMouseMove={draw}
                  onMouseUp={stopDrawing}
                  onMouseLeave={stopDrawing}
                  onTouchStart={startDrawing}
                  onTouchMove={draw}
                  onTouchEnd={stopDrawing}
                />
                
                {/* Linha guia */}
                <div className="absolute bottom-16 left-8 right-8 border-b border-gray-300" />
                
                {/* Nome embaixo da linha */}
                <div className="absolute bottom-4 left-8 right-8 text-center">
                  <p className="text-sm text-gray-500">{nome}</p>
                  <p className="text-xs text-gray-400">CPF: {cpf}</p>
                </div>

                {/* Placeholder */}
                {!hasSignature && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none" style={{ marginBottom: '60px' }}>
                    <p className="text-gray-400 text-lg">Assine aqui</p>
                  </div>
                )}

                {/* X indicador */}
                <div className="absolute bottom-[70px] left-4 text-gray-400 text-2xl pointer-events-none">
                  ✕
                </div>
              </div>

              <p className="text-xs text-gray-500 mt-2 text-center">
                Use o dedo ou mouse para assinar
              </p>
            </div>

            {/* Footer */}
            <div className={isFullscreen ? 'mt-4 flex justify-end gap-3' : 'modal-footer'}>
              <button 
                onClick={clearSignature}
                className="btn-secondary"
                disabled={!hasSignature}
              >
                <RotateCcw className="w-4 h-4" />
                Limpar
              </button>
              <button 
                onClick={saveSignature}
                className="btn-primary"
                disabled={!hasSignature}
              >
                <Check className="w-4 h-4" />
                Confirmar Assinatura
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default SignaturePad
