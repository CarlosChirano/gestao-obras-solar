import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  PenTool, 
  Loader2, 
  Check,
  User,
  HardHat,
  Trash2,
  Clock,
  CreditCard
} from 'lucide-react'
import toast from 'react-hot-toast'
import SignaturePad from './SignaturePad'

const OSAssinaturas = ({ ordemServicoId }) => {
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signatureType, setSignatureType] = useState(null) // 'cliente' ou 'tecnico'
  
  const queryClient = useQueryClient()

  // Buscar assinaturas da OS
  const { data: assinaturas, isLoading } = useQuery({
    queryKey: ['os-assinaturas', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_assinaturas')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at', { ascending: true })
      if (error) throw error
      return data
    }
  })

  // Deletar assinatura
  const deleteMutation = useMutation({
    mutationFn: async (assinatura) => {
      // Deletar do storage
      if (assinatura.url) {
        const fileName = assinatura.url.split('/').pop()
        await supabase.storage.from('uploads').remove([`assinaturas/${ordemServicoId}/${fileName}`])
      }
      
      // Deletar do banco
      const { error } = await supabase
        .from('os_assinaturas')
        .delete()
        .eq('id', assinatura.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['os-assinaturas', ordemServicoId])
      toast.success('Assinatura removida!')
    },
    onError: () => toast.error('Erro ao remover assinatura')
  })

  // Abrir modal de assinatura
  const openSignaturePad = (type) => {
    setSignatureType(type)
    setShowSignaturePad(true)
  }

  // Salvar assinatura
  const handleSaveSignature = async (blob, dataUrl, nome, cpf) => {
    try {
      const fileName = `${signatureType}-${Date.now()}.png`
      const filePath = `assinaturas/${ordemServicoId}/${fileName}`

      // Upload para o Storage
      const { error: uploadError } = await supabase.storage
        .from('uploads')
        .upload(filePath, blob, { contentType: 'image/png' })

      if (uploadError) throw uploadError

      // Pegar URL pública
      const { data: urlData } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath)

      // Salvar no banco
      const { error: dbError } = await supabase
        .from('os_assinaturas')
        .insert([{
          ordem_servico_id: ordemServicoId,
          tipo: signatureType,
          nome: nome,
          cpf: cpf,
          url: urlData.publicUrl
        }])

      if (dbError) throw dbError

      queryClient.invalidateQueries(['os-assinaturas', ordemServicoId])
      queryClient.invalidateQueries(['os-historico', ordemServicoId])
      setShowSignaturePad(false)
      toast.success('Assinatura salva!')
    } catch (error) {
      console.error(error)
      toast.error('Erro ao salvar assinatura')
    }
  }

  // Verificar se já tem assinatura de cada tipo
  const assinaturaCliente = assinaturas?.find(a => a.tipo === 'cliente')
  const assinaturaTecnico = assinaturas?.find(a => a.tipo === 'tecnico')

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Ofuscar CPF para exibição (mostra só os 3 primeiros e 2 últimos)
  const ofuscarCPF = (cpf) => {
    if (!cpf) return ''
    return cpf.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, '$1.***.***-$4')
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <PenTool className="w-5 h-5 text-gray-500" />
          Assinaturas
        </h3>
      </div>

      {/* Cards de Assinatura */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Assinatura do Cliente */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <User className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Cliente</p>
              <p className="text-xs text-gray-500">Assinatura do cliente</p>
            </div>
          </div>

          {assinaturaCliente ? (
            <div className="space-y-2">
              {/* Info do assinante */}
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="font-medium text-gray-900 text-sm">{assinaturaCliente.nome}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  CPF: {ofuscarCPF(assinaturaCliente.cpf)}
                </p>
              </div>
              
              {/* Imagem da assinatura */}
              <div className="bg-white border rounded-lg p-2">
                <img 
                  src={assinaturaCliente.url} 
                  alt="Assinatura do cliente"
                  className="w-full h-20 object-contain"
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(assinaturaCliente.created_at)}
                </p>
                <button
                  onClick={() => {
                    if (confirm('Remover assinatura do cliente?')) {
                      deleteMutation.mutate(assinaturaCliente)
                    }
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Assinado</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openSignaturePad('cliente')}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            >
              <PenTool className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">Coletar Assinatura</p>
              <p className="text-xs">Toque para assinar</p>
            </button>
          )}
        </div>

        {/* Assinatura do Técnico */}
        <div className="border border-gray-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <HardHat className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Técnico</p>
              <p className="text-xs text-gray-500">Assinatura do responsável</p>
            </div>
          </div>

          {assinaturaTecnico ? (
            <div className="space-y-2">
              {/* Info do assinante */}
              <div className="bg-gray-50 rounded-lg p-2">
                <p className="font-medium text-gray-900 text-sm">{assinaturaTecnico.nome}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <CreditCard className="w-3 h-3" />
                  CPF: {ofuscarCPF(assinaturaTecnico.cpf)}
                </p>
              </div>
              
              {/* Imagem da assinatura */}
              <div className="bg-white border rounded-lg p-2">
                <img 
                  src={assinaturaTecnico.url} 
                  alt="Assinatura do técnico"
                  className="w-full h-20 object-contain"
                />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <p className="text-xs text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(assinaturaTecnico.created_at)}
                </p>
                <button
                  onClick={() => {
                    if (confirm('Remover assinatura do técnico?')) {
                      deleteMutation.mutate(assinaturaTecnico)
                    }
                  }}
                  className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center gap-1 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm font-medium">Assinado</span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => openSignaturePad('tecnico')}
              className="w-full py-8 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors"
            >
              <PenTool className="w-6 h-6 mx-auto mb-2" />
              <p className="font-medium">Coletar Assinatura</p>
              <p className="text-xs">Toque para assinar</p>
            </button>
          )}
        </div>
      </div>

      {/* Status geral */}
      {assinaturaCliente && assinaturaTecnico && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <p className="font-medium text-green-800">Todas as assinaturas coletadas</p>
            <p className="text-sm text-green-600">Cliente e técnico assinaram a ordem de serviço</p>
          </div>
        </div>
      )}

      {/* Modal de Assinatura */}
      {showSignaturePad && (
        <SignaturePad
          title={`Assinatura do ${signatureType === 'cliente' ? 'Cliente' : 'Técnico'}`}
          subtitle="Preencha os dados e assine para confirmar"
          onSave={handleSaveSignature}
          onClose={() => setShowSignaturePad(false)}
        />
      )}
    </div>
  )
}

export default OSAssinaturas
