import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../contexts/AuthContext'
import { Plus, Search, Filter, Loader2, ClipboardList, Calendar, MapPin, Users, Eye, ChevronDown, DollarSign, Car, Snowflake, Coffee, Trash2, RotateCcw, X, EyeOff, ShieldCheck } from 'lucide-react'
import toast from 'react-hot-toast'

const OrdensServico = () => {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  const [mostrarDeletados, setMostrarDeletados] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, os: null })
  const [motivoExclusao, setMotivoExclusao] = useState('')
  const [dataInicio, setDataInicio] = useState('')
  const [dataFim, setDataFim] = useState('')

  const { user, userProfile, isSuperAdmin } = useAuth()
  const usuarioNome = userProfile?.nome || user?.email || 'Usuário'
  const usuarioId = user?.id || null
  const queryClient = useQueryClient()

  const { data: ordens, isLoading, error: queryError } = useQuery({
    queryKey: ['ordens-servico', statusFilter, mostrarDeletados, dataInicio, dataFim],
    queryFn: async () => {
      // Buscar OS básica primeiro
      let query = supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(id, nome),
          equipe:equipes(id, nome, cor)
        `)
        .eq('ativo', true)
        .order('data_agendamento', { ascending: false })

      // Filtrar deletados
      if (!mostrarDeletados) {
        query = query.or('deletado.is.null,deletado.eq.false')
      }

      if (statusFilter) {
        query = query.eq('status', statusFilter)
      }

      // Filtro de data início
      if (dataInicio) {
        query = query.gte('data_agendamento', dataInicio)
      }

      // Filtro de data fim
      if (dataFim) {
        query = query.lte('data_agendamento', dataFim)
      }

      const { data, error } = await query
      if (error) {
        console.error('Erro ao buscar OS:', error)
        throw error
      }

      // Buscar colaboradores e veículos de cada OS
      if (data && data.length > 0) {
        const osIds = data.map(os => os.id)
        
        // Buscar colaboradores
        const { data: colaboradoresData } = await supabase
          .from('os_colaboradores')
          .select('ordem_servico_id, valor_diaria, dias_trabalhados, valor_total')
          .in('ordem_servico_id', osIds)

        // Buscar veículos da nova tabela
        const { data: veiculosData } = await supabase
          .from('os_veiculos')
          .select('ordem_servico_id, valor_aluguel, valor_gasolina, valor_gelo, valor_cafe, dias, valor_total')
          .in('ordem_servico_id', osIds)

        // Agrupar colaboradores por OS
        const colaboradoresPorOS = {}
        colaboradoresData?.forEach(c => {
          if (!colaboradoresPorOS[c.ordem_servico_id]) {
            colaboradoresPorOS[c.ordem_servico_id] = []
          }
          colaboradoresPorOS[c.ordem_servico_id].push(c)
        })

        // Agrupar veículos por OS
        const veiculosPorOS = {}
        veiculosData?.forEach(v => {
          if (!veiculosPorOS[v.ordem_servico_id]) {
            veiculosPorOS[v.ordem_servico_id] = []
          }
          veiculosPorOS[v.ordem_servico_id].push(v)
        })

        // Adicionar aos dados
        data.forEach(os => {
          os.os_colaboradores = colaboradoresPorOS[os.id] || []
          os.os_veiculos = veiculosPorOS[os.id] || []
        })
      }

      return data
    }
  })

  // Mutation para deletar (soft delete) - SuperAdmin executa direto, outros solicitam
  const deleteMutation = useMutation({
    mutationFn: async (os) => {
      if (isSuperAdmin) {
        // SuperAdmin: exclui direto
        const { error } = await supabase
          .from('ordens_servico')
          .update({ 
            deletado: true,
            atualizado_por: usuarioId,
            atualizado_por_nome: `Excluída por ${usuarioNome}`,
            atualizado_em: new Date().toISOString()
          })
          .eq('id', os.id)
        if (error) throw error

        await supabase.from('os_historico').insert({
          ordem_servico_id: os.id,
          tipo: 'status',
          titulo: `OS excluída por ${usuarioNome} (SuperAdmin)`,
          descricao: motivoExclusao || 'Exclusão direta por superadministrador',
          usuario_nome: usuarioNome,
          usuario_id: usuarioId
        }).catch(() => {})

        return { direto: true }
      } else {
        // Usuário comum: cria solicitação de exclusão
        const { error } = await supabase
          .from('os_aprovacoes')
          .insert({
            ordem_servico_id: os.id,
            tipo: 'exclusao',
            solicitante_id: usuarioId,
            solicitante_nome: usuarioNome,
            motivo: motivoExclusao || 'Solicitação de exclusão',
            numero_os: os.numero_os || os.id?.slice(0, 8),
            cliente_nome: os.cliente?.nome || 'N/A'
          })
        if (error) throw error

        return { direto: false }
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['ordens-servico'])
      queryClient.invalidateQueries(['aprovacoes-contadores'])
      if (result.direto) {
        toast.success('OS removida com sucesso')
      } else {
        toast.success('Solicitação de exclusão enviada para aprovação!')
      }
      setDeleteModal({ open: false, os: null })
      setMotivoExclusao('')
    },
    onError: (error) => {
      toast.error('Erro: ' + error.message)
    }
  })

  // Mutation para restaurar
  const restoreMutation = useMutation({
    mutationFn: async (osId) => {
      const { error } = await supabase
        .from('ordens_servico')
        .update({ deletado: false })
        .eq('id', osId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ordens-servico'])
      toast.success('OS restaurada com sucesso')
    },
    onError: (error) => {
      toast.error('Erro ao restaurar: ' + error.message)
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
    const custoMaoObra = os.os_colaboradores?.reduce((sum, c) => {
      return sum + (parseFloat(c.valor_total) || 0)
    }, 0) || 0

    const custoAluguel = os.os_veiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_aluguel) || 0), 0) || 0
    const custoGasolina = os.os_veiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_gasolina) || 0), 0) || 0
    const custoGelo = os.os_veiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_gelo) || 0), 0) || 0
    const custoCafe = os.os_veiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_cafe) || 0), 0) || 0
    const custoVeiculo = custoAluguel + custoGasolina + custoGelo + custoCafe

    const custoTotal = custoMaoObra + custoVeiculo

    return { custoMaoObra, custoVeiculo, custoAluguel, custoGasolina, custoGelo, custoCafe, custoTotal }
  }

  // Contadores por status (excluindo deletados da contagem se não estiver mostrando)
  const ordensParaContagem = mostrarDeletados ? ordens : ordens?.filter(os => !os.deletado)
  const statusCounts = ordensParaContagem?.reduce((acc, os) => {
    acc[os.status] = (acc[os.status] || 0) + 1
    return acc
  }, {}) || {}

  const totalDeletados = ordens?.filter(os => os.deletado)?.length || 0

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
          { status: '', label: 'Todas', count: ordensParaContagem?.length || 0 },
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
            <p className="text-xs text-gray-500 truncate">{item.label}</p>
          </button>
        ))}
      </div>

      {/* Busca e Filtros */}
      <div className="card space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Buscar por número, cliente, endereço..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-12"
            />
          </div>
          <button 
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary relative ${(dataInicio || dataFim || statusFilter) ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}`}
          >
            <Filter className="w-5 h-5" />
            Filtros
            {(dataInicio || dataFim || statusFilter) && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full"></span>
            )}
            <ChevronDown className={`w-4 h-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => setMostrarDeletados(!mostrarDeletados)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              mostrarDeletados 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {mostrarDeletados ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {mostrarDeletados ? 'Mostrando deletadas' : 'Ver deletadas'}
            {totalDeletados > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                {totalDeletados}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <div>
                <label className="label">Data Início</label>
                <input 
                  type="date" 
                  value={dataInicio} 
                  onChange={(e) => setDataInicio(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label">Data Fim</label>
                <input 
                  type="date" 
                  value={dataFim} 
                  onChange={(e) => setDataFim(e.target.value)}
                  className="input-field"
                />
              </div>
              <div className="flex items-end">
                {(dataInicio || dataFim || statusFilter) && (
                  <button 
                    onClick={() => {
                      setDataInicio('')
                      setDataFim('')
                      setStatusFilter('')
                    }}
                    className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <X className="w-4 h-4" /> Limpar Filtros
                  </button>
                )}
              </div>
            </div>
            
            {/* Atalhos de período */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-gray-200">
              <span className="text-sm text-gray-500 mr-2">Período:</span>
              <button 
                onClick={() => {
                  const hoje = new Date().toISOString().split('T')[0]
                  setDataInicio(hoje)
                  setDataFim(hoje)
                }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-100"
              >
                Hoje
              </button>
              <button 
                onClick={() => {
                  const hoje = new Date()
                  const inicioSemana = new Date(hoje)
                  inicioSemana.setDate(hoje.getDate() - hoje.getDay())
                  const fimSemana = new Date(inicioSemana)
                  fimSemana.setDate(inicioSemana.getDate() + 6)
                  setDataInicio(inicioSemana.toISOString().split('T')[0])
                  setDataFim(fimSemana.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-100"
              >
                Esta Semana
              </button>
              <button 
                onClick={() => {
                  const hoje = new Date()
                  const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                  const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
                  setDataInicio(inicioMes.toISOString().split('T')[0])
                  setDataFim(fimMes.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-100"
              >
                Este Mês
              </button>
              <button 
                onClick={() => {
                  const hoje = new Date()
                  const inicioMesPassado = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1)
                  const fimMesPassado = new Date(hoje.getFullYear(), hoje.getMonth(), 0)
                  setDataInicio(inicioMesPassado.toISOString().split('T')[0])
                  setDataFim(fimMesPassado.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-100"
              >
                Mês Passado
              </button>
              <button 
                onClick={() => {
                  const hoje = new Date()
                  const inicioAno = new Date(hoje.getFullYear(), 0, 1)
                  const fimAno = new Date(hoje.getFullYear(), 11, 31)
                  setDataInicio(inicioAno.toISOString().split('T')[0])
                  setDataFim(fimAno.toISOString().split('T')[0])
                }}
                className="px-3 py-1 text-xs rounded-full border border-gray-300 hover:bg-gray-100"
              >
                Este Ano
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de OS */}
      <div className="card">
        {queryError ? (
          <div className="text-center py-12 text-red-600">
            <p className="font-medium">Erro ao carregar OS</p>
            <p className="text-sm">{queryError.message}</p>
          </div>
        ) : isLoading ? (
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
              const isDeletado = os.deletado
              
              return (
                <div 
                  key={os.id} 
                  className={`border rounded-lg p-4 transition-shadow ${
                    isDeletado 
                      ? 'border-red-200 bg-red-50 opacity-60' 
                      : 'border-gray-200 hover:shadow-md'
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    {/* Info Principal */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`font-mono font-bold ${isDeletado ? 'text-red-900 line-through' : 'text-gray-900'}`}>
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
                        {isDeletado && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs">
                            <Trash2 className="w-3 h-3" /> Removida
                          </span>
                        )}
                      </div>

                      <h3 className={`font-medium mb-1 ${isDeletado ? 'text-red-900' : 'text-gray-900'}`}>
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
                        {(custos.custoGelo > 0 || custos.custoCafe > 0) && (
                          <div className="flex items-center gap-3 text-xs text-gray-500 pl-6">
                            {custos.custoGelo > 0 && (
                              <span className="flex items-center gap-1">
                                <Snowflake className="w-3 h-3 text-cyan-500" />
                                Gelo: {formatCurrency(custos.custoGelo)}
                              </span>
                            )}
                            {custos.custoCafe > 0 && (
                              <span className="flex items-center gap-1">
                                <Coffee className="w-3 h-3 text-amber-600" />
                                Café: {formatCurrency(custos.custoCafe)}
                              </span>
                            )}
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

                      {/* Ações */}
                      <div className="flex items-center gap-2">
                        {isDeletado ? (
                          <button
                            onClick={() => restoreMutation.mutate(os.id)}
                            disabled={restoreMutation.isPending}
                            className="inline-flex items-center gap-1 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg border border-green-200"
                            title="Restaurar OS"
                          >
                            <RotateCcw className="w-4 h-4" />
                            Restaurar
                          </button>
                        ) : (
                          <>
                            <Link 
                              to={`/ordens-servico/${os.id}`}
                              className="btn-secondary"
                            >
                              <Eye className="w-4 h-4" />
                              Ver
                            </Link>
                            <button
                              onClick={() => setDeleteModal({ open: true, os })}
                              className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                              title="Remover OS"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${isSuperAdmin ? 'bg-red-100' : 'bg-amber-100'} rounded-full flex items-center justify-center`}>
                  {isSuperAdmin 
                    ? <Trash2 className="w-5 h-5 text-red-600" />
                    : <ShieldCheck className="w-5 h-5 text-amber-600" />
                  }
                </div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {isSuperAdmin ? 'Remover OS' : 'Solicitar Exclusão'}
                </h2>
              </div>
              <button onClick={() => { setDeleteModal({ open: false, os: null }); setMotivoExclusao('') }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-gray-600">
                {isSuperAdmin 
                  ? <>Tem certeza que deseja remover a OS <strong>#{deleteModal.os?.numero_os || deleteModal.os?.id?.slice(0, 8)}</strong>?</>
                  : <>Solicitar exclusão da OS <strong>#{deleteModal.os?.numero_os || deleteModal.os?.id?.slice(0, 8)}</strong>?</>
                }
              </p>
              <p className="text-sm text-gray-500">
                Cliente: <strong>{deleteModal.os?.cliente?.nome}</strong>
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo {!isSuperAdmin && <span className="text-red-500">*</span>}
                </label>
                <input
                  type="text"
                  value={motivoExclusao}
                  onChange={(e) => setMotivoExclusao(e.target.value)}
                  placeholder="Informe o motivo da exclusão..."
                  className="input-field w-full"
                />
              </div>

              {isSuperAdmin ? (
                <p className="text-sm text-gray-500 p-3 bg-yellow-50 rounded-lg">
                  ⚠️ Como superadmin, a OS será excluída imediatamente (soft delete, pode restaurar).
                </p>
              ) : (
                <p className="text-sm text-gray-500 p-3 bg-blue-50 rounded-lg">
                  🔒 A solicitação será enviada para aprovação de um superadministrador.
                </p>
              )}
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => { setDeleteModal({ open: false, os: null }); setMotivoExclusao('') }}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModal.os)}
                disabled={deleteMutation.isPending || (!isSuperAdmin && !motivoExclusao.trim())}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 flex items-center justify-center gap-2 ${
                  isSuperAdmin ? 'bg-red-600 hover:bg-red-700' : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : isSuperAdmin ? (
                  <Trash2 className="w-4 h-4" />
                ) : (
                  <ShieldCheck className="w-4 h-4" />
                )}
                {isSuperAdmin ? 'Remover' : 'Solicitar Exclusão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdensServico
