import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { 
  ClipboardCheck, Plus, Eye, Clock, CheckCircle2, FileText,
  Camera, ChevronRight, Loader2, AlertCircle, ExternalLink
} from 'lucide-react'

const statusBadge = {
  rascunho: { label: 'Rascunho', bg: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' },
  assinado: { label: 'Assinado', bg: 'bg-blue-50 text-blue-700 ring-blue-200', dot: 'bg-blue-400' },
  finalizado: { label: 'Finalizado', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', dot: 'bg-emerald-400' },
}

const OSRelatorioObra = ({ ordemServicoId, ordemServico }) => {
  const navigate = useNavigate()

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ['os-relatorios-obra', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('relatorios_obra')
        .select('*, fotos:relatorio_fotos(id)')
        .eq('ordem_servico_id', ordemServicoId)
        .eq('ativo', true)
        .order('criado_em', { ascending: true })
      if (error) throw error
      return data
    },
    enabled: !!ordemServicoId
  })

  const preObra = relatorios?.find(r => r.tipo === 'pre_obra')
  const posObra = relatorios?.find(r => r.tipo === 'pos_obra')

  const goTo = (tipo) => {
    const existing = relatorios?.find(r => r.tipo === tipo)
    if (existing) {
      navigate(`/relatorio-obra/${existing.id}`)
    } else {
      navigate(`/relatorio-obra/novo?tipo=${tipo}&os_id=${ordemServicoId}`)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="w-5 h-5 text-blue-600" />
          Relatórios de Obra
        </h2>
        <button
          onClick={() => navigate('/relatorios-obra')}
          className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1"
        >
          Ver todos <ExternalLink className="w-3 h-3" />
        </button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-6">
          <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Card Pré-Obra */}
          <button
            onClick={() => goTo('pre_obra')}
            className={`relative text-left p-4 rounded-xl border-2 transition-all group ${
              preObra 
                ? 'border-orange-200 bg-orange-50/50 hover:border-orange-300 hover:shadow-md' 
                : 'border-dashed border-gray-300 hover:border-orange-400 hover:bg-orange-50/30'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">🏗️</span>
                <span className="font-semibold text-gray-900 text-sm">Pré-Obra</span>
              </div>
              {preObra ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${statusBadge[preObra.status]?.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge[preObra.status]?.dot}`} />
                  {statusBadge[preObra.status]?.label}
                </span>
              ) : (
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-orange-500 transition-colors" />
              )}
            </div>
            
            {preObra ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {new Date(preObra.criado_em).toLocaleDateString('pt-BR')} às {new Date(preObra.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {preObra.fotos?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" /> {preObra.fotos.length}
                    </span>
                  )}
                  {preObra.responsavel_tecnico && (
                    <span className="truncate">{preObra.responsavel_tecnico}</span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Registrar estado de chegada
              </p>
            )}
            
            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>

          {/* Card Pós-Obra */}
          <button
            onClick={() => goTo('pos_obra')}
            className={`relative text-left p-4 rounded-xl border-2 transition-all group ${
              posObra 
                ? 'border-emerald-200 bg-emerald-50/50 hover:border-emerald-300 hover:shadow-md' 
                : 'border-dashed border-gray-300 hover:border-emerald-400 hover:bg-emerald-50/30'
            }`}
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xl">✅</span>
                <span className="font-semibold text-gray-900 text-sm">Pós-Obra</span>
              </div>
              {posObra ? (
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1 ${statusBadge[posObra.status]?.bg}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${statusBadge[posObra.status]?.dot}`} />
                  {statusBadge[posObra.status]?.label}
                </span>
              ) : (
                <Plus className="w-4 h-4 text-gray-400 group-hover:text-emerald-500 transition-colors" />
              )}
            </div>
            
            {posObra ? (
              <div className="space-y-1">
                <p className="text-xs text-gray-500">
                  {new Date(posObra.criado_em).toLocaleDateString('pt-BR')} às {new Date(posObra.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </p>
                <div className="flex items-center gap-3 text-xs text-gray-500">
                  {posObra.resultado && (
                    <span className={`flex items-center gap-1 font-medium ${posObra.resultado === 'aprovado' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {posObra.resultado === 'aprovado' ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
                      {posObra.resultado === 'aprovado' ? 'Aprovado' : 'Reprovado'}
                    </span>
                  )}
                  {posObra.fotos?.length > 0 && (
                    <span className="flex items-center gap-1">
                      <Camera className="w-3 h-3" /> {posObra.fotos.length}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-xs text-gray-400">
                Checklist de entrega final
              </p>
            )}

            <ChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300 group-hover:text-gray-500 transition-colors" />
          </button>
        </div>
      )}
    </div>
  )
}

export default OSRelatorioObra
