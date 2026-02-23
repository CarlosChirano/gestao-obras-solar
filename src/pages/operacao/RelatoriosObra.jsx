import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { 
  ClipboardCheck, Search, Plus, Eye, FileText, Camera,
  CheckCircle2, XCircle, Clock, Loader2, Filter
} from 'lucide-react'
import toast from 'react-hot-toast'

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  assinado: { label: 'Assinado', color: 'bg-blue-100 text-blue-800', icon: FileText },
  finalizado: { label: 'Finalizado', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
}

const tipoConfig = {
  pre_obra: { label: 'Pré-Obra', color: 'bg-orange-100 text-orange-800', emoji: '🏗️' },
  pos_obra: { label: 'Pós-Obra', color: 'bg-emerald-100 text-emerald-800', emoji: '✅' },
}

const RelatoriosObra = () => {
  const [search, setSearch] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const navigate = useNavigate()

  const { data: relatorios, isLoading } = useQuery({
    queryKey: ['relatorios-obra', filtroTipo, filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('relatorios_obra')
        .select(`
          *,
          ordem_servico:ordens_servico(numero_os, cliente_id, cliente:clientes(nome)),
          fotos:relatorio_fotos(id)
        `)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })

      if (filtroTipo) query = query.eq('tipo', filtroTipo)
      if (filtroStatus) query = query.eq('status', filtroStatus)

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  const filtered = relatorios?.filter(r => {
    if (!search) return true
    const termo = search.toLowerCase()
    return (
      r.cliente_nome?.toLowerCase().includes(termo) ||
      r.ordem_servico?.numero_os?.toLowerCase().includes(termo) ||
      r.responsavel_tecnico?.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-blue-600" />
            Relatórios de Obra
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Relatórios pré e pós-obra com fotos e assinaturas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => navigate('/relatorio-obra/novo?tipo=pre_obra')}
            className="px-4 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-xl hover:from-orange-600 hover:to-amber-600 flex items-center gap-2 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Pré-Obra
          </button>
          <button
            onClick={() => navigate('/relatorio-obra/novo?tipo=pos_obra')}
            className="px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl hover:from-emerald-600 hover:to-teal-600 flex items-center gap-2 text-sm font-medium shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            Pós-Obra
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por cliente, OS ou responsável..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
        >
          <option value="">Todos os tipos</option>
          <option value="pre_obra">Pré-Obra</option>
          <option value="pos_obra">Pós-Obra</option>
        </select>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-xl text-sm"
        >
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunho</option>
          <option value="assinado">Assinado</option>
          <option value="finalizado">Finalizado</option>
        </select>
      </div>

      {/* Cards */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500">Nenhum relatório encontrado</p>
          <p className="text-sm text-gray-400 mt-1">Crie um relatório pré-obra ou pós-obra</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered?.map(rel => {
            const tipo = tipoConfig[rel.tipo] || tipoConfig.pre_obra
            const status = statusConfig[rel.status] || statusConfig.rascunho
            const StatusIcon = status.icon
            const totalFotos = rel.fotos?.length || 0

            return (
              <div
                key={rel.id}
                onClick={() => navigate(`/relatorio-obra/${rel.id}`)}
                className="bg-white border border-gray-200 rounded-2xl p-4 hover:shadow-md hover:border-blue-300 transition-all cursor-pointer"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tipo.color}`}>
                        {tipo.emoji} {tipo.label}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${status.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {status.label}
                      </span>
                      {rel.ordem_servico?.numero_os && (
                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                          {rel.ordem_servico.numero_os}
                        </span>
                      )}
                    </div>
                    <h3 className="font-semibold text-gray-900">
                      {rel.cliente_nome || rel.ordem_servico?.cliente?.nome || 'Sem cliente'}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {rel.endereco || 'Sem endereço'} {rel.bairro ? `- ${rel.bairro}` : ''}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>{new Date(rel.criado_em).toLocaleDateString('pt-BR')} às {new Date(rel.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                      {rel.responsavel_tecnico && <span>Resp: {rel.responsavel_tecnico}</span>}
                      {totalFotos > 0 && (
                        <span className="flex items-center gap-1">
                          <Camera className="w-3 h-3" /> {totalFotos} fotos
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {rel.resultado === 'aprovado' && (
                      <CheckCircle2 className="w-6 h-6 text-green-500" />
                    )}
                    {rel.resultado === 'reprovado' && (
                      <XCircle className="w-6 h-6 text-red-500" />
                    )}
                    <Eye className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default RelatoriosObra
