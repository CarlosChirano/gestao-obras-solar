import { useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { ArrowLeft, Edit, Loader2, Calendar, MapPin, Users, Phone, Mail, Building, Car, Wrench, DollarSign, FileText, Clock, CheckCircle, XCircle, Play, Pause, AlertTriangle, ClipboardCheck, Camera, History, PenTool, Navigation, Paperclip } from 'lucide-react'
import toast from 'react-hot-toast'
import OSChecklist from '../../components/OSChecklist'
import OSFotos from '../../components/OSFotos'
import OSHistorico from '../../components/OSHistorico'
import OSAssinaturas from '../../components/OSAssinaturas'
import OSRelatorio from '../../components/OSRelatorio'
import OSAnexos from '../../components/OSAnexos'

const OrdemServicoDetalhes = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [novoStatus, setNovoStatus] = useState('')

  const { data: os, isLoading } = useQuery({
    queryKey: ['ordem-servico', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ordens_servico')
        .select(`
          *,
          cliente:clientes(*),
          equipe:equipes(*, equipe_membros(*, colaborador:colaboradores(nome))),
          empresa_contratante:empresas_contratantes(nome),
          veiculo:veiculos(placa, modelo, marca)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    }
  })

  const { data: servicos } = useQuery({
    queryKey: ['os-servicos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_servicos')
        .select('*, servico:servicos(nome)')
        .eq('ordem_servico_id', id)
      return data
    },
    enabled: !!id
  })

  const { data: colaboradores } = useQuery({
    queryKey: ['os-colaboradores', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_colaboradores')
        .select('*, colaborador:colaboradores(nome), funcao:funcoes(nome)')
        .eq('ordem_servico_id', id)
      return data
    },
    enabled: !!id
  })

  const { data: custosExtras } = useQuery({
    queryKey: ['os-custos-extras', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_custos_extras')
        .select('*')
        .eq('ordem_servico_id', id)
      return data
    },
    enabled: !!id
  })

  // Buscar veículos da OS (nova tabela)
  const { data: osVeiculos } = useQuery({
    queryKey: ['os-veiculos', id],
    queryFn: async () => {
      const { data } = await supabase
        .from('os_veiculos')
        .select('*, veiculo:veiculos(placa, modelo, marca)')
        .eq('ordem_servico_id', id)
      return data
    },
    enabled: !!id
  })

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const updateData = { status }
      
      // Se está iniciando, registrar data_inicio
      if (status === 'em_execucao' && !os.data_inicio) {
        updateData.data_inicio = new Date().toISOString()
      }
      
      // Se está concluindo, registrar data_fim
      if (status === 'concluida' && !os.data_fim) {
        updateData.data_fim = new Date().toISOString()
      }

      const { error } = await supabase
        .from('ordens_servico')
        .update(updateData)
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['ordem-servico', id])
      queryClient.invalidateQueries(['ordens-servico'])
      toast.success('Status atualizado!')
      setShowStatusModal(false)
    },
    onError: () => toast.error('Erro ao atualizar status')
  })

  const getStatusConfig = (status) => {
    const configs = {
      agendada: { label: 'Agendada', bg: 'bg-blue-100', text: 'text-blue-700', icon: Calendar },
      confirmada: { label: 'Confirmada', bg: 'bg-cyan-100', text: 'text-cyan-700', icon: CheckCircle },
      em_execucao: { label: 'Em Execução', bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Play },
      pausada: { label: 'Pausada', bg: 'bg-orange-100', text: 'text-orange-700', icon: Pause },
      concluida: { label: 'Concluída', bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      cancelada: { label: 'Cancelada', bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      com_pendencia: { label: 'Com Pendência', bg: 'bg-purple-100', text: 'text-purple-700', icon: AlertTriangle }
    }
    return configs[status] || { label: status, bg: 'bg-gray-100', text: 'text-gray-700', icon: FileText }
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('pt-BR')
  }

  const formatDateTime = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleString('pt-BR')
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const getTipoLabel = (tipo) => {
    const tipos = {
      material: 'Material',
      alimentacao: 'Alimentação',
      hospedagem: 'Hospedagem',
      combustivel: 'Combustível',
      pedagio: 'Pedágio',
      outros: 'Outros'
    }
    return tipos[tipo] || tipo
  }

  // Calcular totais
  const totalServicos = servicos?.reduce((sum, s) => sum + (parseFloat(s.valor_total) || 0), 0) || 0
  
  // Mão de obra APENAS diárias (sem café, almoço, etc)
  const totalDiarias = colaboradores?.reduce((sum, c) => {
    const diaria = parseFloat(c.valor_diaria) || 0
    const dias = parseFloat(c.dias_trabalhados) || 1
    return sum + (diaria * dias)
  }, 0) || 0
  
  const totalCustosExtras = custosExtras?.reduce((sum, c) => sum + (parseFloat(c.valor) || 0), 0) || 0
  
  // Custos extras dos colaboradores (café, almoço, transporte, outros)
  const totalCafeColab = colaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_cafe) || 0), 0) || 0
  const totalAlmocoColab = colaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_almoco) || 0), 0) || 0
  const totalTransporteColab = colaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_transporte) || 0), 0) || 0
  const totalOutrosColab = colaboradores?.reduce((sum, c) => sum + (parseFloat(c.valor_outros) || 0), 0) || 0
  const totalExtrasColab = totalCafeColab + totalAlmocoColab + totalTransporteColab + totalOutrosColab
  
  // Total mão de obra = diárias + extras
  const totalMaoObra = totalDiarias + totalExtrasColab
  
  // Custos de veículos (da nova tabela os_veiculos)
  const totalAluguelVeiculo = osVeiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_aluguel) || 0), 0) || 0
  const totalGasolina = osVeiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_gasolina) || 0), 0) || 0
  const totalGelo = osVeiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_gelo) || 0), 0) || 0
  const totalCafe = osVeiculos?.reduce((sum, v) => sum + (parseFloat(v.valor_cafe) || 0), 0) || 0
  const totalVeiculos = totalAluguelVeiculo + totalGasolina + totalGelo + totalCafe
  
  const custoTotal = totalMaoObra + (parseFloat(os?.valor_materiais) || 0) + totalVeiculos + totalCustosExtras
  const resultado = (parseFloat(os?.valor_total) || 0) - custoTotal

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!os) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600">Ordem de serviço não encontrada</p>
        <button onClick={() => navigate('/ordens-servico')} className="btn-primary mt-4">
          Voltar
        </button>
      </div>
    )
  }

  const statusConfig = getStatusConfig(os.status)
  const StatusIcon = statusConfig.icon

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/ordens-servico')} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">
                #{os.numero || os.id.slice(0, 8)}
              </h1>
              <button
                onClick={() => setShowStatusModal(true)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bg} ${statusConfig.text}`}
              >
                <StatusIcon className="w-4 h-4" />
                {statusConfig.label}
              </button>
            </div>
            <p className="text-gray-600">{os.cliente?.nome}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <OSRelatorio ordemServicoId={id} ordemServico={os} />
          <Link to={`/ordens-servico/${id}/editar`} className="btn-primary">
            <Edit className="w-5 h-5" /> Editar
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informações do Cliente */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Cliente</h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{os.cliente?.nome}</h3>
                {os.cliente?.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Phone className="w-4 h-4" />
                    {os.cliente.telefone}
                  </div>
                )}
                {os.cliente?.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                    <Mail className="w-4 h-4" />
                    {os.cliente.email}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Local do Serviço */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Local do Serviço</h2>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-green-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-900">{os.endereco || '-'}</p>
                <p className="text-gray-600">
                  {os.cidade && os.estado ? `${os.cidade}/${os.estado}` : os.cidade || os.estado || '-'}
                  {os.cep && ` - CEP: ${os.cep}`}
                </p>
              </div>
            </div>
            
            {/* Botão Me Leve para a Obra */}
            {(os.endereco || os.cidade || (os.latitude && os.longitude)) && (
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    // Prioriza coordenadas se disponíveis
                    const hasCoords = os.latitude && os.longitude
                    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
                    
                    if (hasCoords) {
                      // Usar coordenadas (mais preciso)
                      if (isMobile) {
                        const wazeUrl = `https://waze.com/ul?ll=${os.latitude},${os.longitude}&navigate=yes`
                        window.open(wazeUrl, '_blank')
                      } else {
                        const mapsUrl = `https://www.google.com/maps?q=${os.latitude},${os.longitude}`
                        window.open(mapsUrl, '_blank')
                      }
                    } else {
                      // Usar endereço
                      const endereco = encodeURIComponent(
                        `${os.endereco || ''}, ${os.cidade || ''}, ${os.estado || ''}, Brasil`
                      )
                      if (isMobile) {
                        const wazeUrl = `https://waze.com/ul?q=${endereco}&navigate=yes`
                        window.open(wazeUrl, '_blank')
                      } else {
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${endereco}`
                        window.open(mapsUrl, '_blank')
                      }
                    }
                  }}
                  className="flex-1 sm:flex-none btn-primary bg-green-600 hover:bg-green-700"
                >
                  <Navigation className="w-5 h-5" />
                  Me leve para a obra
                </button>
                
                <button
                  onClick={() => {
                    const hasCoords = os.latitude && os.longitude
                    if (hasCoords) {
                      const mapsUrl = `https://www.google.com/maps?q=${os.latitude},${os.longitude}`
                      window.open(mapsUrl, '_blank')
                    } else {
                      const endereco = encodeURIComponent(
                        `${os.endereco || ''}, ${os.cidade || ''}, ${os.estado || ''}, Brasil`
                      )
                      const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${endereco}`
                      window.open(mapsUrl, '_blank')
                    }
                  }}
                  className="flex-1 sm:flex-none btn-secondary"
                >
                  <MapPin className="w-5 h-5" />
                  Google Maps
                </button>
                
                <button
                  onClick={() => {
                    const hasCoords = os.latitude && os.longitude
                    if (hasCoords) {
                      const wazeUrl = `https://waze.com/ul?ll=${os.latitude},${os.longitude}&navigate=yes`
                      window.open(wazeUrl, '_blank')
                    } else {
                      const endereco = encodeURIComponent(
                        `${os.endereco || ''}, ${os.cidade || ''}, ${os.estado || ''}, Brasil`
                      )
                      const wazeUrl = `https://waze.com/ul?q=${endereco}&navigate=yes`
                      window.open(wazeUrl, '_blank')
                    }
                  }}
                  className="flex-1 sm:flex-none btn-secondary"
                >
                  <Navigation className="w-5 h-5" />
                  Waze
                </button>
              </div>
            )}
            
            {/* Mostrar coordenadas se disponíveis */}
            {os.latitude && os.longitude && (
              <p className="text-xs text-gray-500 mt-2">
                📍 Coordenadas: {os.latitude}, {os.longitude}
              </p>
            )}
          </div>

          {/* Serviços */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Serviços</h2>
            {servicos?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum serviço cadastrado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Serviço</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Qtd</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Unit.</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {servicos?.map((s) => (
                      <tr key={s.id}>
                        <td className="px-4 py-2">
                          <p className="font-medium text-gray-900">{s.servico?.nome || 'Serviço'}</p>
                          {s.descricao && <p className="text-sm text-gray-500">{s.descricao}</p>}
                        </td>
                        <td className="px-4 py-2 text-center text-gray-600">{s.quantidade}</td>
                        <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(s.valor_unitario)}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(s.valor_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="3" className="px-4 py-2 text-right font-medium text-gray-900">Total Serviços:</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(totalServicos)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Colaboradores */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipe</h2>
            {colaboradores?.length === 0 ? (
              <p className="text-gray-500 text-center py-4">Nenhum colaborador alocado</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Colaborador</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Função</th>
                      <th className="text-center px-4 py-2 text-xs font-medium text-gray-500">Dias</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Diária</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {colaboradores?.map((c) => {
                      const totalDiaria = (parseFloat(c.valor_diaria) || 0) * (parseFloat(c.dias_trabalhados) || 1)
                      const totalExtras = (parseFloat(c.valor_cafe) || 0) + (parseFloat(c.valor_almoco) || 0) + (parseFloat(c.valor_transporte) || 0) + (parseFloat(c.valor_outros) || 0)
                      return (
                      <>
                        <tr key={c.id}>
                          <td className="px-4 py-2 font-medium text-gray-900">{c.colaborador?.nome}</td>
                          <td className="px-4 py-2 text-gray-600">{c.funcao?.nome || '-'}</td>
                          <td className="px-4 py-2 text-center text-gray-600">{c.dias_trabalhados}</td>
                          <td className="px-4 py-2 text-right text-gray-600">{formatCurrency(c.valor_diaria)}</td>
                          <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(totalDiaria)}</td>
                        </tr>
                        {/* Linha extra com custos detalhados */}
                        {(c.valor_cafe > 0 || c.valor_almoco > 0 || c.valor_transporte > 0 || c.valor_outros > 0) && (
                          <tr key={`${c.id}-custos`} className="bg-gray-50">
                            <td colSpan="4" className="px-4 py-1">
                              <div className="flex flex-wrap gap-2 text-xs">
                                {c.valor_cafe > 0 && (
                                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                                    ☕ Café: {formatCurrency(c.valor_cafe)}
                                  </span>
                                )}
                                {c.valor_almoco > 0 && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded">
                                    🍽️ Almoço: {formatCurrency(c.valor_almoco)}
                                  </span>
                                )}
                                {c.valor_transporte > 0 && (
                                  <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                    🚌 Transporte: {formatCurrency(c.valor_transporte)}
                                  </span>
                                )}
                                {c.valor_outros > 0 && (
                                  <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                                    📦 Outros: {formatCurrency(c.valor_outros)}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-1 text-right text-xs text-gray-500">
                              +{formatCurrency(totalExtras)}
                            </td>
                          </tr>
                        )}
                      </>
                    )})}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="4" className="px-4 py-2 text-right text-sm text-gray-600">Total Diárias:</td>
                      <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(totalDiarias)}</td>
                    </tr>
                    {totalExtrasColab > 0 && (
                      <tr>
                        <td colSpan="4" className="px-4 py-1 text-right text-sm text-gray-500">
                          <span className="flex items-center justify-end gap-2">
                            Alimentação/Transporte:
                            <span className="text-xs">
                              (☕{formatCurrency(totalCafeColab)} + 🍽️{formatCurrency(totalAlmocoColab)} + 🚌{formatCurrency(totalTransporteColab)})
                            </span>
                          </span>
                        </td>
                        <td className="px-4 py-1 text-right text-sm text-gray-600">+{formatCurrency(totalExtrasColab)}</td>
                      </tr>
                    )}
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan="4" className="px-4 py-2 text-right font-medium text-gray-900">Total Mão de Obra:</td>
                      <td className="px-4 py-2 text-right font-bold text-blue-600">{formatCurrency(totalMaoObra)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>

          {/* Custos Extras */}
          {custosExtras && custosExtras.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Custos Extras</h2>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Tipo</th>
                      <th className="text-left px-4 py-2 text-xs font-medium text-gray-500">Descrição</th>
                      <th className="text-right px-4 py-2 text-xs font-medium text-gray-500">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {custosExtras.map((c) => (
                      <tr key={c.id}>
                        <td className="px-4 py-2">
                          <span className="badge badge-gray">{getTipoLabel(c.tipo)}</span>
                        </td>
                        <td className="px-4 py-2 text-gray-600">{c.descricao || '-'}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">{formatCurrency(c.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50">
                    <tr>
                      <td colSpan="2" className="px-4 py-2 text-right font-medium text-gray-900">Total Custos Extras:</td>
                      <td className="px-4 py-2 text-right font-bold text-gray-900">{formatCurrency(totalCustosExtras)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* Documentos e Instruções */}
          <div className="card">
            <OSAnexos ordemServicoId={id} />
          </div>

          {/* Checklist */}
          <div className="card">
            <OSChecklist ordemServicoId={id} />
          </div>

          {/* Fotos */}
          <div className="card">
            <OSFotos ordemServicoId={id} />
          </div>

          {/* Assinaturas */}
          <div className="card">
            <OSAssinaturas ordemServicoId={id} />
          </div>

          {/* Histórico */}
          <div className="card">
            <OSHistorico ordemServicoId={id} />
          </div>
        </div>

        {/* Coluna Lateral */}
        <div className="space-y-6">
          {/* Resumo Financeiro */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumo Financeiro</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Receita Total</span>
                <span className="font-medium text-gray-900">{formatCurrency(os.valor_total)}</span>
              </div>
              <hr />
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Mão de Obra (Diárias)</span>
                <span className="text-gray-600">- {formatCurrency(totalDiarias)}</span>
              </div>
              
              {/* Custos Extras dos Colaboradores */}
              {totalExtrasColab > 0 && (
                <>
                  <div className="text-xs text-gray-400 uppercase mt-2">Alimentação/Transporte</div>
                  {totalCafeColab > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">☕ Café</span>
                      <span className="text-gray-600">- {formatCurrency(totalCafeColab)}</span>
                    </div>
                  )}
                  {totalAlmocoColab > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">🍽️ Almoço</span>
                      <span className="text-gray-600">- {formatCurrency(totalAlmocoColab)}</span>
                    </div>
                  )}
                  {totalTransporteColab > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">🚌 Transporte</span>
                      <span className="text-gray-600">- {formatCurrency(totalTransporteColab)}</span>
                    </div>
                  )}
                  {totalOutrosColab > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">📦 Outros</span>
                      <span className="text-gray-600">- {formatCurrency(totalOutrosColab)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Materiais</span>
                <span className="text-gray-600">- {formatCurrency(os.valor_materiais)}</span>
              </div>
              
              {/* Custos de Veículos */}
              {totalVeiculos > 0 && (
                <>
                  <div className="text-xs text-gray-400 uppercase mt-2">Veículos</div>
                  {totalAluguelVeiculo > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">Aluguel/Diária</span>
                      <span className="text-gray-600">- {formatCurrency(totalAluguelVeiculo)}</span>
                    </div>
                  )}
                  {totalGasolina > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">Gasolina</span>
                      <span className="text-gray-600">- {formatCurrency(totalGasolina)}</span>
                    </div>
                  )}
                  {totalGelo > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">Gelo</span>
                      <span className="text-gray-600">- {formatCurrency(totalGelo)}</span>
                    </div>
                  )}
                  {totalCafe > 0 && (
                    <div className="flex justify-between text-sm pl-2">
                      <span className="text-gray-500">Café da Manhã</span>
                      <span className="text-gray-600">- {formatCurrency(totalCafe)}</span>
                    </div>
                  )}
                </>
              )}
              
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Custos Extras</span>
                <span className="text-gray-600">- {formatCurrency(totalCustosExtras)}</span>
              </div>
              <hr />
              <div className="flex justify-between">
                <span className="font-medium text-gray-900">Resultado</span>
                <span className={`font-bold ${resultado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(resultado)}
                </span>
              </div>
            </div>
          </div>

          {/* Datas */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Datas</h2>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-xs text-gray-500">Agendamento</p>
                  <p className="font-medium text-gray-900">{formatDate(os.data_agendamento)}</p>
                </div>
              </div>
              {os.data_inicio && (
                <div className="flex items-center gap-3">
                  <Play className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Início</p>
                    <p className="font-medium text-gray-900">{formatDateTime(os.data_inicio)}</p>
                  </div>
                </div>
              )}
              {os.data_fim && (
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Conclusão</p>
                    <p className="font-medium text-gray-900">{formatDateTime(os.data_fim)}</p>
                  </div>
                </div>
              )}
              {os.previsao_duracao && (
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-xs text-gray-500">Previsão</p>
                    <p className="font-medium text-gray-900">{os.previsao_duracao}h</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Equipe */}
          {os.equipe && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipe Designada</h2>
              <div className="flex items-center gap-3">
                <div 
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: os.equipe.cor + '20' }}
                >
                  <Users className="w-5 h-5" style={{ color: os.equipe.cor }} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{os.equipe.nome}</p>
                  <p className="text-sm text-gray-500">
                    {os.equipe.equipe_membros?.length || 0} membros
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Veículos */}
          {osVeiculos && osVeiculos.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Veículos</h2>
              <div className="space-y-4">
                {osVeiculos.map((v, idx) => (
                  <div key={idx} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Car className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{v.veiculo?.modelo || 'Veículo'}</p>
                        <p className="text-sm text-gray-500 font-mono">{v.veiculo?.placa}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm ml-13 pl-13">
                      {v.valor_aluguel > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Aluguel:</span>
                          <span className="text-gray-700">{formatCurrency(v.valor_aluguel)}</span>
                        </div>
                      )}
                      {v.valor_gasolina > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Gasolina:</span>
                          <span className="text-gray-700">{formatCurrency(v.valor_gasolina)}</span>
                        </div>
                      )}
                      {v.valor_gelo > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Gelo:</span>
                          <span className="text-gray-700">{formatCurrency(v.valor_gelo)}</span>
                        </div>
                      )}
                      {v.valor_cafe > 0 && (
                        <div className="flex justify-between">
                          <span className="text-gray-500">Café:</span>
                          <span className="text-gray-700">{formatCurrency(v.valor_cafe)}</span>
                        </div>
                      )}
                    </div>
                    {v.valor_total > 0 && (
                      <div className="flex justify-between mt-2 pt-2 border-t border-gray-100 text-sm font-medium">
                        <span className="text-gray-600">Total:</span>
                        <span className="text-blue-600">{formatCurrency(v.valor_total)}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Veículo Antigo (caso ainda tenha OS com veículo no campo antigo) */}
          {os.veiculo && (!osVeiculos || osVeiculos.length === 0) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Veículo</h2>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Car className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{os.veiculo.modelo}</p>
                  <p className="text-sm text-gray-500 font-mono">{os.veiculo.placa}</p>
                </div>
              </div>
              {os.km_inicial && (
                <p className="text-sm text-gray-600 mt-2">KM Inicial: {os.km_inicial}</p>
              )}
              {os.km_final && (
                <p className="text-sm text-gray-600">KM Final: {os.km_final}</p>
              )}
            </div>
          )}

          {/* Observações */}
          {(os.observacoes || os.observacoes_internas) && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Observações</h2>
              {os.observacoes && (
                <div className="mb-3">
                  <p className="text-xs text-gray-500 mb-1">Para o cliente:</p>
                  <p className="text-gray-600 text-sm">{os.observacoes}</p>
                </div>
              )}
              {os.observacoes_internas && (
                <div>
                  <p className="text-xs text-gray-500 mb-1">Internas:</p>
                  <p className="text-gray-600 text-sm bg-yellow-50 p-2 rounded">{os.observacoes_internas}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal de Alteração de Status */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Alterar Status</h3>
            <div className="space-y-2">
              {['agendada', 'confirmada', 'em_execucao', 'pausada', 'concluida', 'cancelada', 'com_pendencia'].map((status) => {
                const config = getStatusConfig(status)
                const Icon = config.icon
                return (
                  <button
                    key={status}
                    onClick={() => {
                      setNovoStatus(status)
                      updateStatusMutation.mutate(status)
                    }}
                    disabled={updateStatusMutation.isPending}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      os.status === status
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.bg}`}>
                      <Icon className={`w-4 h-4 ${config.text}`} />
                    </div>
                    <span className="font-medium text-gray-900">{config.label}</span>
                    {os.status === status && (
                      <span className="ml-auto text-xs text-blue-600">Atual</span>
                    )}
                  </button>
                )
              })}
            </div>
            <div className="flex justify-end mt-4">
              <button onClick={() => setShowStatusModal(false)} className="btn-secondary">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrdemServicoDetalhes
