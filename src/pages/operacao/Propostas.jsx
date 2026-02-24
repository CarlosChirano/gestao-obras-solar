import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import {
  Plus,
  Search,
  Loader2,
  FileText,
  Clock,
  Send,
  CheckCircle2,
  XCircle,
  Building2,
  MapPin,
  Calendar,
  ImageIcon,
  Filter
} from 'lucide-react'

const statusConfig = {
  rascunho: { label: 'Rascunho', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  enviada: { label: 'Enviada', color: 'bg-blue-100 text-blue-800', icon: Send },
  aprovada: { label: 'Aprovada', color: 'bg-green-100 text-green-800', icon: CheckCircle2 },
  recusada: { label: 'Recusada', color: 'bg-red-100 text-red-800', icon: XCircle },
}

const tipoServicoLabels = {
  'padrao_entrada': 'Padrão de Entrada',
  'instalacao_fotovoltaica': 'Instalação Fotovoltaica',
  'estrutura_metalica': 'Estrutura Metálica',
  'manutencao': 'Manutenção',
  'outro': 'Outro',
}

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('pt-BR')
}

const Propostas = () => {
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const navigate = useNavigate()

  const { data: propostas, isLoading } = useQuery({
    queryKey: ['propostas', filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from('propostas')
        .select(`
          *,
          empresa:empresas_contratantes(nome),
          cliente:clientes(nome),
          itens:proposta_itens(id),
          fotos:proposta_fotos(id)
        `)
        .eq('ativo', true)
        .order('criado_em', { ascending: false })

      if (filtroStatus) query = query.eq('status', filtroStatus)

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  const filtered = propostas?.filter(p => {
    if (!search) return true
    const termo = search.toLowerCase()
    return (
      p.numero?.toLowerCase().includes(termo) ||
      p.destinatario_nome?.toLowerCase().includes(termo) ||
      p.cliente?.nome?.toLowerCase().includes(termo) ||
      p.empresa?.nome?.toLowerCase().includes(termo) ||
      p.endereco_obra?.toLowerCase().includes(termo)
    )
  })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Propostas Comerciais</h1>
          <p className="text-gray-500 mt-1">
            {propostas?.length || 0} proposta{propostas?.length !== 1 ? 's' : ''} cadastrada{propostas?.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => navigate('/proposta/nova')} className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Proposta
        </button>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por número, cliente, empresa..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input-field pl-9 pr-8 min-w-[160px]"
          >
            <option value="">Todos os status</option>
            {Object.entries(statusConfig).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhuma proposta encontrada</h3>
          <p className="text-gray-500 mb-4">Crie sua primeira proposta comercial</p>
          <button onClick={() => navigate('/proposta/nova')} className="btn-primary">
            <Plus className="w-5 h-5" /> Nova Proposta
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered?.map((proposta) => {
            const status = statusConfig[proposta.status] || statusConfig.rascunho
            const StatusIcon = status.icon
            const nomeDestinatario = proposta.destinatario_nome || proposta.cliente?.nome || '-'

            return (
              <div
                key={proposta.id}
                onClick={() => navigate(`/proposta/${proposta.id}`)}
                className="card hover:shadow-lg transition-all cursor-pointer group"
              >
                {/* Topo: número + status */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono text-sm font-semibold text-blue-600">
                    {proposta.numero}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${status.color}`}>
                    <StatusIcon className="w-3.5 h-3.5" />
                    {status.label}
                  </span>
                </div>

                {/* Destinatário */}
                <h3 className="font-semibold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">
                  {nomeDestinatario}
                </h3>

                {/* Empresa emissora */}
                {proposta.empresa?.nome && (
                  <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-2">
                    <Building2 className="w-3.5 h-3.5" />
                    {proposta.empresa.nome}
                  </div>
                )}

                {/* Tipo serviço + endereço */}
                <div className="space-y-1 mb-3">
                  {proposta.tipo_servico && (
                    <span className="inline-block text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {tipoServicoLabels[proposta.tipo_servico] || proposta.tipo_servico}
                    </span>
                  )}
                  {proposta.endereco_obra && (
                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span className="line-clamp-1">{proposta.endereco_obra}</span>
                    </div>
                  )}
                </div>

                {/* Footer: valor + data + contadores */}
                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <span className="text-lg font-bold text-gray-900 tabular-nums">
                    {formatCurrency(proposta.valor_total)}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    {proposta.fotos?.length > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {proposta.fotos.length}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(proposta.criado_em)}
                    </span>
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

export default Propostas
