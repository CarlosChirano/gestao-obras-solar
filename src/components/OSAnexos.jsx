import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  FileText, 
  Image, 
  Video, 
  Upload, 
  Trash2, 
  Loader2, 
  Download,
  Eye,
  File,
  Plus,
  X,
  AlertCircle
} from 'lucide-react'
import toast from 'react-hot-toast'

const OSAnexos = ({ ordemServicoId, readOnly = false }) => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [previewFile, setPreviewFile] = useState(null)
  
  const queryClient = useQueryClient()

  // Buscar anexos
  const { data: anexos, isLoading } = useQuery({
    queryKey: ['os-anexos', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_anexos')
        .select('*')
        .eq('ordem_servico_id', ordemServicoId)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })
      if (error) throw error
      return data
    },
    enabled: !!ordemServicoId
  })

  // Mutation para deletar
  const deleteMutation = useMutation({
    mutationFn: async (anexo) => {
      // Deletar do storage
      const fileName = anexo.arquivo_url.split('/').pop()
      await supabase.storage
        .from('os-anexos')
        .remove([`${ordemServicoId}/${fileName}`])
      
      // Marcar como inativo no banco
      const { error } = await supabase
        .from('os_anexos')
        .update({ ativo: false })
        .eq('id', anexo.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['os-anexos', ordemServicoId])
      toast.success('Anexo removido!')
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message)
    }
  })

  // Upload de arquivo
  const handleUpload = async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    setUploadProgress(0)

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileExt = file.name.split('.').pop().toLowerCase()
        const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
        const filePath = `${ordemServicoId}/${fileName}`

        // Determinar tipo
        let tipo = 'outro'
        if (['pdf'].includes(fileExt)) tipo = 'pdf'
        else if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) tipo = 'imagem'
        else if (['mp4', 'mov', 'avi', 'webm'].includes(fileExt)) tipo = 'video'

        // Validar tamanho (máx 50MB)
        if (file.size > 50 * 1024 * 1024) {
          toast.error(`${file.name} é muito grande (máx 50MB)`)
          continue
        }

        // Upload para o storage
        const { error: uploadError } = await supabase.storage
          .from('os-anexos')
          .upload(filePath, file)

        if (uploadError) throw uploadError

        // Pegar URL pública
        const { data: { publicUrl } } = supabase.storage
          .from('os-anexos')
          .getPublicUrl(filePath)

        // Salvar no banco
        const { error: dbError } = await supabase
          .from('os_anexos')
          .insert({
            ordem_servico_id: ordemServicoId,
            nome: file.name.replace(`.${fileExt}`, ''),
            tipo,
            arquivo_url: publicUrl,
            arquivo_nome: file.name,
            arquivo_tamanho: file.size
          })

        if (dbError) throw dbError

        setUploadProgress(((i + 1) / files.length) * 100)
      }

      queryClient.invalidateQueries(['os-anexos', ordemServicoId])
      toast.success(`${files.length} arquivo(s) enviado(s)!`)
      setShowUploadModal(false)
    } catch (error) {
      console.error('Erro no upload:', error)
      toast.error('Erro ao enviar arquivo: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress(0)
    }
  }

  // Ícone por tipo
  const getIcon = (tipo) => {
    switch (tipo) {
      case 'pdf': return <FileText className="w-8 h-8 text-red-500" />
      case 'imagem': return <Image className="w-8 h-8 text-blue-500" />
      case 'video': return <Video className="w-8 h-8 text-purple-500" />
      default: return <File className="w-8 h-8 text-gray-500" />
    }
  }

  // Cor do badge por tipo
  const getBadgeColor = (tipo) => {
    switch (tipo) {
      case 'pdf': return 'bg-red-100 text-red-700'
      case 'imagem': return 'bg-blue-100 text-blue-700'
      case 'video': return 'bg-purple-100 text-purple-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Formatar tamanho
  const formatSize = (bytes) => {
    if (!bytes) return '-'
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  // Abrir arquivo
  const openFile = (anexo) => {
    if (anexo.tipo === 'imagem') {
      setPreviewFile(anexo)
    } else {
      window.open(anexo.arquivo_url, '_blank')
    }
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
          <FileText className="w-5 h-5 text-blue-600" />
          Documentos e Instruções
        </h3>
        {!readOnly && (
          <button
            onClick={() => setShowUploadModal(true)}
            className="btn-primary text-sm"
          >
            <Plus className="w-4 h-4" />
            Adicionar
          </button>
        )}
      </div>

      {/* Lista de anexos */}
      {anexos?.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
          <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Nenhum documento anexado</p>
          {!readOnly && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="mt-3 text-blue-600 hover:text-blue-700 font-medium text-sm"
            >
              Adicionar documento
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {anexos?.map((anexo) => (
            <div
              key={anexo.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  {anexo.tipo === 'imagem' ? (
                    <img
                      src={anexo.arquivo_url}
                      alt={anexo.nome}
                      className="w-12 h-12 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                      {getIcon(anexo.tipo)}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 truncate" title={anexo.nome}>
                    {anexo.nome}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getBadgeColor(anexo.tipo)}`}>
                      {anexo.tipo.toUpperCase()}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatSize(anexo.arquivo_tamanho)}
                    </span>
                  </div>
                </div>
              </div>
              
              {/* Ações */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => openFile(anexo)}
                  className="flex-1 btn-secondary text-xs py-1.5"
                >
                  <Eye className="w-4 h-4" />
                  Visualizar
                </button>
                <a
                  href={anexo.arquivo_url}
                  download={anexo.arquivo_nome}
                  className="flex-1 btn-secondary text-xs py-1.5 text-center"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Download className="w-4 h-4" />
                  Baixar
                </a>
                {!readOnly && (
                  <button
                    onClick={() => {
                      if (confirm('Remover este anexo?')) {
                        deleteMutation.mutate(anexo)
                      }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 rounded"
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Adicionar Documentos</h3>
              <button
                onClick={() => setShowUploadModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {/* Área de upload */}
              <label className="block">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
                  {uploading ? (
                    <div className="space-y-3">
                      <Loader2 className="w-10 h-10 mx-auto text-blue-600 animate-spin" />
                      <p className="text-gray-600">Enviando...</p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
                      <p className="text-gray-600 font-medium">
                        Clique para selecionar arquivos
                      </p>
                      <p className="text-gray-500 text-sm mt-1">
                        ou arraste e solte aqui
                      </p>
                    </>
                  )}
                </div>
                <input
                  type="file"
                  className="hidden"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.mov,.avi,.webm"
                  onChange={handleUpload}
                  disabled={uploading}
                />
              </label>

              {/* Tipos aceitos */}
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Tipos de arquivo aceitos:</p>
                <div className="flex flex-wrap gap-2">
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">PDF</span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">JPG, PNG, GIF</span>
                  <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded">MP4, MOV, AVI</span>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Tamanho máximo: 50MB por arquivo
                </p>
              </div>

              {/* Dica */}
              <div className="flex items-start gap-2 text-sm text-gray-600 bg-blue-50 p-3 rounded-lg">
                <AlertCircle className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                <p>
                  Adicione manuais, datasheets, diagramas ou vídeos de instrução 
                  que ajudarão a equipe na execução do serviço.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Preview de Imagem */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <button
            onClick={() => setPreviewFile(null)}
            className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 rounded-full text-white"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={previewFile.arquivo_url}
            alt={previewFile.nome}
            className="max-w-full max-h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  )
}

export default OSAnexos
