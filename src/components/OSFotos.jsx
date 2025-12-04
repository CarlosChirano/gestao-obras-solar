import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { 
  Camera, 
  Plus, 
  X, 
  Loader2, 
  Image as ImageIcon,
  Trash2,
  Download,
  ZoomIn,
  ChevronLeft,
  ChevronRight,
  Upload
} from 'lucide-react'
import toast from 'react-hot-toast'

const CATEGORIAS = [
  { value: 'antes', label: 'Antes', color: 'bg-orange-100 text-orange-700' },
  { value: 'durante', label: 'Durante', color: 'bg-blue-100 text-blue-700' },
  { value: 'depois', label: 'Depois', color: 'bg-green-100 text-green-700' },
  { value: 'problema', label: 'Problema', color: 'bg-red-100 text-red-700' },
  { value: 'material', label: 'Material', color: 'bg-purple-100 text-purple-700' },
  { value: 'geral', label: 'Geral', color: 'bg-gray-100 text-gray-700' },
]

const OSFotos = ({ ordemServicoId }) => {
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showViewer, setShowViewer] = useState(false)
  const [viewerIndex, setViewerIndex] = useState(0)
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  
  const queryClient = useQueryClient()

  // Buscar fotos da OS
  const { data: fotos, isLoading } = useQuery({
    queryKey: ['os-fotos', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_fotos')
        .select('*, colaborador:colaboradores(nome)')
        .eq('ordem_servico_id', ordemServicoId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (foto) => {
      // Deletar do storage
      const fileName = foto.url.split('/').pop()
      await supabase.storage.from('uploads').remove([`os-fotos/${ordemServicoId}/${fileName}`])
      
      // Deletar do banco
      const { error } = await supabase
        .from('os_fotos')
        .delete()
        .eq('id', foto.id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['os-fotos', ordemServicoId])
      toast.success('Foto removida!')
    },
    onError: () => toast.error('Erro ao remover foto')
  })

  const handleDelete = (foto) => {
    if (confirm('Deseja remover esta foto?')) {
      deleteMutation.mutate(foto)
    }
  }

  const openViewer = (index) => {
    setViewerIndex(index)
    setShowViewer(true)
  }

  const getCategoriaInfo = (categoria) => {
    return CATEGORIAS.find(c => c.value === categoria) || CATEGORIAS[5]
  }

  // Filtrar fotos
  const fotosFiltradas = fotos?.filter(f => 
    filtroCategoria === 'todas' || f.categoria === filtroCategoria
  ) || []

  // Agrupar por categoria
  const fotosPorCategoria = CATEGORIAS.reduce((acc, cat) => {
    acc[cat.value] = fotos?.filter(f => f.categoria === cat.value) || []
    return acc
  }, {})

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
        <h3 className="text-lg font-semibold text-gray-900">
          Fotos
          {fotos?.length > 0 && (
            <span className="ml-2 text-sm font-normal text-gray-500">
              ({fotos.length})
            </span>
          )}
        </h3>
        <button 
          onClick={() => setShowUploadModal(true)} 
          className="btn-primary btn-sm"
        >
          <Camera className="w-4 h-4" /> Adicionar
        </button>
      </div>

      {/* Filtros */}
      {fotos?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFiltroCategoria('todas')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtroCategoria === 'todas'
                ? 'bg-gray-900 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Todas ({fotos.length})
          </button>
          {CATEGORIAS.map(cat => {
            const count = fotosPorCategoria[cat.value]?.length || 0
            if (count === 0) return null
            return (
              <button
                key={cat.value}
                onClick={() => setFiltroCategoria(cat.value)}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filtroCategoria === cat.value
                    ? 'bg-gray-900 text-white'
                    : `${cat.color} hover:opacity-80`
                }`}
              >
                {cat.label} ({count})
              </button>
            )
          })}
        </div>
      )}

      {/* Galeria */}
      {fotosFiltradas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <ImageIcon className="w-12 h-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500 mb-4">Nenhuma foto adicionada</p>
          <button 
            onClick={() => setShowUploadModal(true)} 
            className="btn-primary btn-sm"
          >
            <Camera className="w-4 h-4" /> Adicionar Fotos
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {fotosFiltradas.map((foto, index) => {
            const catInfo = getCategoriaInfo(foto.categoria)
            return (
              <div 
                key={foto.id} 
                className="group relative aspect-square rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
                onClick={() => openViewer(index)}
              >
                <img
                  src={foto.url}
                  alt={foto.descricao || 'Foto'}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="absolute bottom-0 left-0 right-0 p-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${catInfo.color}`}>
                      {catInfo.label}
                    </span>
                    {foto.descricao && (
                      <p className="text-white text-xs mt-1 truncate">{foto.descricao}</p>
                    )}
                  </div>
                </div>

                {/* Badge de categoria (sempre visível) */}
                <div className="absolute top-2 left-2">
                  <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${catInfo.color}`}>
                    {catInfo.label}
                  </span>
                </div>

                {/* Botão de zoom */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-1.5 bg-white/90 rounded-lg shadow">
                    <ZoomIn className="w-4 h-4 text-gray-700" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Upload */}
      {showUploadModal && (
        <UploadModal
          ordemServicoId={ordemServicoId}
          onClose={() => setShowUploadModal(false)}
          onSuccess={() => {
            queryClient.invalidateQueries(['os-fotos', ordemServicoId])
            setShowUploadModal(false)
          }}
        />
      )}

      {/* Visualizador de Fotos */}
      {showViewer && (
        <PhotoViewer
          fotos={fotosFiltradas}
          initialIndex={viewerIndex}
          onClose={() => setShowViewer(false)}
          onDelete={handleDelete}
        />
      )}
    </div>
  )
}

// Modal de Upload
const UploadModal = ({ ordemServicoId, onClose, onSuccess }) => {
  const [uploading, setUploading] = useState(false)
  const [files, setFiles] = useState([])
  const [categoria, setCategoria] = useState('geral')
  const [descricao, setDescricao] = useState('')
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files)
    const newFiles = selectedFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file),
      name: file.name
    }))
    setFiles([...files, ...newFiles])
  }

  const removeFile = (index) => {
    const newFiles = [...files]
    URL.revokeObjectURL(newFiles[index].preview)
    newFiles.splice(index, 1)
    setFiles(newFiles)
  }

  const handleUpload = async () => {
    if (files.length === 0) {
      toast.error('Selecione pelo menos uma foto')
      return
    }

    setUploading(true)

    try {
      for (const fileObj of files) {
        const fileName = `${Date.now()}-${fileObj.file.name.replace(/[^a-zA-Z0-9.]/g, '_')}`
        const filePath = `os-fotos/${ordemServicoId}/${fileName}`

        // Upload para o Storage
        const { error: uploadError } = await supabase.storage
          .from('uploads')
          .upload(filePath, fileObj.file)

        if (uploadError) throw uploadError

        // Pegar URL pública
        const { data: urlData } = supabase.storage
          .from('uploads')
          .getPublicUrl(filePath)

        // Salvar no banco
        const { error: dbError } = await supabase
          .from('os_fotos')
          .insert([{
            ordem_servico_id: ordemServicoId,
            url: urlData.publicUrl,
            nome: fileObj.file.name,
            descricao: descricao || null,
            categoria: categoria
          }])

        if (dbError) throw dbError
      }

      toast.success(`${files.length} foto(s) enviada(s)!`)
      onSuccess()
    } catch (error) {
      console.error(error)
      toast.error('Erro ao enviar fotos')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-lg">
        <div className="modal-header">
          <h2 className="modal-title">Adicionar Fotos</h2>
          <button onClick={onClose} className="btn-ghost p-2">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body space-y-4">
          {/* Área de upload */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Upload className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-gray-600 font-medium">Clique para selecionar fotos</p>
            <p className="text-gray-400 text-sm mt-1">ou arraste e solte aqui</p>
          </div>

          {/* Preview das fotos */}
          {files.length > 0 && (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {files.map((fileObj, index) => (
                <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={fileObj.preview}
                    alt={fileObj.name}
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeFile(index)}
                    className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {/* Botão de adicionar mais */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
              >
                <Plus className="w-8 h-8 text-gray-400" />
              </div>
            </div>
          )}

          {/* Categoria e descrição */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="input-field"
              >
                {CATEGORIAS.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Descrição (opcional)</label>
              <input
                type="text"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                className="input-field"
                placeholder="Ex: Instalação dos módulos"
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button 
            onClick={handleUpload} 
            disabled={uploading || files.length === 0}
            className="btn-primary"
          >
            {uploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Enviar {files.length > 0 && `(${files.length})`}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

// Visualizador de Fotos em Tela Cheia
const PhotoViewer = ({ fotos, initialIndex, onClose, onDelete }) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const foto = fotos[currentIndex]

  const goNext = () => {
    setCurrentIndex((prev) => (prev + 1) % fotos.length)
  }

  const goPrev = () => {
    setCurrentIndex((prev) => (prev - 1 + fotos.length) % fotos.length)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight') goNext()
    if (e.key === 'ArrowLeft') goPrev()
    if (e.key === 'Escape') onClose()
  }

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = foto.url
    link.download = foto.nome || 'foto.jpg'
    link.click()
  }

  const catInfo = CATEGORIAS.find(c => c.value === foto.categoria) || CATEGORIAS[5]

  return (
    <div 
      className="fixed inset-0 bg-black/95 z-50 flex items-center justify-center"
      onClick={onClose}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${catInfo.color}`}>
            {catInfo.label}
          </span>
          <span className="text-white/70 text-sm">
            {currentIndex + 1} / {fotos.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => { e.stopPropagation(); handleDownload() }}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Download"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(foto); onClose() }}
            className="p-2 text-white/70 hover:text-red-500 hover:bg-white/10 rounded-lg transition-colors"
            title="Excluir"
          >
            <Trash2 className="w-5 h-5" />
          </button>
          <button
            onClick={onClose}
            className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Imagem */}
      <div 
        className="max-w-5xl max-h-[80vh] px-16"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={foto.url}
          alt={foto.descricao || 'Foto'}
          className="max-w-full max-h-[80vh] object-contain rounded-lg"
        />
      </div>

      {/* Descrição */}
      {foto.descricao && (
        <div className="absolute bottom-20 left-0 right-0 text-center">
          <p className="text-white/90 text-lg">{foto.descricao}</p>
        </div>
      )}

      {/* Navegação */}
      {fotos.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev() }}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext() }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-colors"
          >
            <ChevronRight className="w-6 h-6 text-white" />
          </button>
        </>
      )}

      {/* Thumbnails */}
      {fotos.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 px-4">
          {fotos.map((f, idx) => (
            <button
              key={f.id}
              onClick={(e) => { e.stopPropagation(); setCurrentIndex(idx) }}
              className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                idx === currentIndex ? 'border-white scale-110' : 'border-transparent opacity-50 hover:opacity-80'
              }`}
            >
              <img src={f.url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default OSFotos
