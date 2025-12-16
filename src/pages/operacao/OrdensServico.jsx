import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Filter, Loader2, ClipboardList, Calendar, MapPin, Users, Eye, ChevronDown, DollarSign, Car } from 'lucide-react'

const OrdensServico = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  const { data: ordens, isLoading } = useQuery({
    queryKey: ['ordens-servico', statusFilter],
    queryFn: async () => {
      let query = supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(id, nome),
          equipe:equipes(id, nome, cor),
          veiculo:veiculos(id, placa, modelo, valor_aluguel_dia, valor_gasolina_dia),
          os_colaboradores(
            id,
            valor_diaria,
            dias_trabalhados,
            valor_total,
            colaborador:colaboradores(nome)
          )
        `)
        .eq('ativo', true)
        .order('data_agendamento', { ascending: false })

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query
      if (error) throw error
      return data
    }
  })

  const filtered = ordens?.filter(os =>
    os.numero_os?.toLowerCase().includes(search.toLowerCase()) ||
    os.cliente?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    os.endereco?.toLowerCase().includes(search.toLowerCase()) ||
    os.cidade?.toLowerCase().includes(search.toLowerCase())
  )

  const getStatusConfig = (status) => {
    const configs = {
      agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700' },
      confirmada: { label: 'Confirmada', bg: 'bg-cyan-100', text: 'text-cyan-700' },
      em_execucao: { label: 'Em Execução', bg: 'bg-yellow-100', text: 'text-yellow-700' },
      pausada: { label: 'Pausada', bg: 'bg-orange-100', text: 'text-orange-700' },
      concluida: { label: 'Concluída', bg: 'bg-green-100', text: 'text-green-700' },
      cancelada: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700' },
      com_pendencia: { label: 'Com Pendência', bg: 'bg-purple-100', text: 'text-purple-700' }
    }
    return configs[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700' }
  }

  const getPrioridadeConfig = (prioridade) => {
    const configs = {
      baixa: { label: 'Baixa', color: 'text-green-600' },
      normal: { label: 'Normal', color: 'text-blue-600' },
      alta: { label: 'Alta', color: 'text-orange-600' },
      urgente: { label: 'Urgente', color: 'text-red-600' }
    }
    return configs[prioridade] || { label: prioridade, color: 'text-gray-600' }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    const dateStr = date.includes('T') ? date : `${date}T12:00:00`
    return new Date(dateStr).toLocaleDateString('pt-BR')
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0)
  }

  // Calcular custos da OS
  const calcularCustos = (os) => {
    // Custo de mão de obra (colaboradores)
    const custoMaoObra = os.os_colaboradores?.reduce((sum, c) => {
      return sum + (parseFloat(c.valor_total) || 0)
    }, 0) || 0

    // Custo do veículo
    const diasVeiculo = os.previsao_dias || 1
    const custoVeiculo = os.veiculo 
      ? ((parseFloat(os.veiculo.valor_aluguel_dia) || 0) + (parseFloat(os.veiculo.valor_gasolina_dia) || 0)) * diasVeiculo
      : 0

    // Custo total
    const custoTotal = custoMaoObra + custoVeiculo

    return { custoMaoObra, custoVeiculo, custoTotal }
  }

  // Contadores por status
  const statusCounts = ordens?.reduce((acc, os) => {
    acc[os.status] = (acc[os.status] || 0) + 1
    return acc
  }, {}) || {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Ordens de Serviço</h1>
          <p className="text-gray-600">Gerencie as ordens de serviço</p>
        </div>
        <Link to="/ordens-servico/nova" className="btn-primary">
          <Plus className="w-5 h-5" /> Nova OS
        </Link>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        {[
          { status: '', label: 'Todas', count: ordens?.length || 0 },
          { status: 'agendada', label: 'Agendadas', count: statusCounts.agendada || 0 },
          { status: 'confirmada', label: 'Confirmadas', count: statusCounts.confirmada || 0 },
          { status: 'em_execucao', label: 'Em Execução', count: statusCounts.em_execucao || 0 },
          { status: 'pausada', label: 'Pausadas', count: statusCounts.pausada || 0 },
          { status: 'concluida', label: 'Concluídas', count: statusCounts.concluida || 0 },
          { status: 'com_pendencia', label: 'Pendências', count: statusCounts.com_pendencia || 0 },
        ].map((item) => (
          <button
            key={item.status}
            onClick={() => setStatusFilter(item.status)}
            className={`p-3 rounded-xl border-2 transition-all ${
              statusFilter === item.status
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{item.count}</p>
            <p className="text-xs text-gray-600">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Busca e Filtros */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-gray-100' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filtros
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="label">Status</label>
                <select 
                  value={statusFilter} 
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input-field"
                >
                  <option value="">Todos</option>
                  <option value="agendada">Agendada</option>
                  <option value="confirmada">Confirmada</option>
                  <option value="em_execucao">Em Execução</option>
                  <option value="pausada">Pausada</option>
                  <option value="concluida">Concluída</option>
                  <option value="cancelada">Cancelada</option>
                  <option value="com_pendencia">Com Pendência</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Lista de OS */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma ordem de serviço encontrada</p>
            <Link to="/ordens-servico/nova" className="btn-primary mt-4 inline-flex">
              <Plus className="w-5 h-5" /> Criar OS
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered?.map((os) => {
              const statusConfig = getStatusConfig(os.status)
              const prioridadeConfig = getPrioridadeConfig(os.prioridade)
              const custos = calcularCustos(os)
              
              return (
                <div 
                  key={os.id} 
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono font-bold text-gray-900">
                          #{os.numero_os || os.id.slice(0, 8)}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
                          {statusConfig.label}
                        </span>
                        {os.prioridade && os.prioridade !== 'normal' && (
                          <span className={`text-xs font-medium ${prioridadeConfig.color}`}>
                            ● {prioridadeConfig.label}
                          </span>
                        )}
                      </div>

                      <h3 className="font-medium text-gray-900 mb-1">
                        {os.cliente?.nome || 'Cliente não informado'}
                      </h3>

                      <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {formatDate(os.data_agendamento)}
                          {os.previsao_dias > 1 && (
                            <span className="text-xs text-gray-500">({os.previsao_dias} dias)</span>
                          )}
                        </div>
                        {os.cidade && (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {os.cidade}{os.estado ? `/${os.estado}` : ''}
                          </div>
                        )}
                        {os.equipe && (
                          <div className="flex items-center gap-1">
                            <div 
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: os.equipe.cor }}
                            />
                            {os.equipe.nome}
                          </div>
                        )}
                        {os.os_colaboradores?.length > 0 && (
                          <div className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {os.os_colaboradores.length} colaborador{os.os_colaboradores.length > 1 ? 'es' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Custos e Valores */}
                    <div className="flex items-center gap-6">
                      {/* Custos */}
                      <div className="text-right space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="w-4 h-4 text-orange-500" />
                          <span className="text-gray-600">Mão de Obra:</span>
                          <span className="font-medium text-orange-600">{formatCurrency(custos.custoMaoObra)}</span>
                        </div>
                        {custos.custoVeiculo > 0 && (
                          <div className="flex items-center gap-2 text-sm">
                            <Car className="w-4 h-4 text-purple-500" />
                            <span className="text-gray-600">Veículo:</span>
                            <span className="font-medium text-purple-600">{formatCurrency(custos.custoVeiculo)}</span>
                          </div>
                        )}
                        <div className="flex items-center gap-2 text-sm border-t pt-1">
                          <DollarSign className="w-4 h-4 text-red-500" />
                          <span className="text-gray-600">Custo Total:</span>
                          <span className="font-bold text-red-600">{formatCurrency(custos.custoTotal)}</span>
                        </div>
                      </div>

                      {/* Valor Total (Faturamento) */}
                      <div className="text-right border-l pl-6">
                        <p className="text-xs text-gray-500">Valor Total</p>
                        <p className="font-bold text-lg text-green-600">
                          {formatCurrency(os.valor_total)}
                        </p>
                        {os.valor_total > 0 && custos.custoTotal > 0 && (
                          <p className={`text-xs font-medium ${os.valor_total > custos.custoTotal ? 'text-green-600' : 'text-red-600'}`}>
                            Margem: {formatCurrency(os.valor_total - custos.custoTotal)}
                          </p>
                        )}
                      </div>

                      <Link 
                        to={`/ordens-servico/${os.id}`}
                        className="btn-secondary"
                      >
                        <Eye className="w-4 h-4" />
                        Ver
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrdensServico
