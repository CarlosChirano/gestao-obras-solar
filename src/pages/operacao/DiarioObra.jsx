import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Calendar,
  Plus,
  Loader2,
  Sun,
  Cloud,
  CloudRain,
  CloudSun,
  CheckCircle2,
  PauseCircle,
  Clock,
  Users,
  Car,
  Camera,
  ClipboardCheck,
  Save,
  X,
  ChevronDown,
  ChevronUp,
  Trash2,
  Edit,
  AlertCircle,
  ImagePlus,
  FileText,
  Percent,
  Play
} from 'lucide-react'
import toast from 'react-hot-toast'

// Opções de clima
const CLIMAS = [
  { value: 'ensolarado', label: 'Ensolarado', icon: Sun, cor: '#F59E0B' },
  { value: 'parcialmente_nublado', label: 'Parcialmente Nublado', icon: CloudSun, cor: '#6B7280' },
  { value: 'nublado', label: 'Nublado', icon: Cloud, cor: '#9CA3AF' },
  { value: 'chuvoso', label: 'Chuvoso', icon: CloudRain, cor: '#3B82F6' },
]

// Componente principal
const DiarioObra = ({ ordemServicoId, ordemServico, colaboradoresPadrao = [], veiculoPadrao = null }) => {
  const [showModal, setShowModal] = useState(false)
  const [editingDia, setEditingDia] = useState(null)
  const [expandedDia, setExpandedDia] = useState(null)
  
  const queryClient = useQueryClient()

  // Buscar acompanhamentos diários
  const { data: acompanhamentos, isLoading } = useQuery({
    queryKey: ['os-acompanhamento', ordemServicoId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('os_acompanhamento_diario')
        .select(`
          *,
          motivo_pausa:motivos_pausa(id, nome, icone, cor),
          veiculo:veiculos(id, placa, modelo),
          equipe:os_acompanhamento_equipe(
            id,
            colaborador_id,
            tipo_diaria,
            valor_diaria,
            valor_alimentacao,
            colaborador:colaboradores(id, nome)
          ),
          fotos:os_acompanhamento_fotos(id, tipo, arquivo_url, descricao),
          checklists:os_acompanhamento_checklist(
            id, 
            tipo, 
            titulo, 
            concluido,
            checklist_modelo:checklist_modelos(id, nome)
          )
        `)
        .eq('ordem_servico_id', ordemServicoId)
        .order('data', { ascending: true })
      
      if (error) throw error
      return data
    },
    enabled: !!ordemServicoId
  })

  // Buscar motivos de pausa
  const { data: motivosPausa } = useQuery({
    queryKey: ['motivos-pausa'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('motivos_pausa')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar veículos disponíveis
  const { data: veiculosDisponiveis } = useQuery({
    queryKey: ['veiculos-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('veiculos')
        .select('id, placa, modelo, valor_aluguel_dia, valor_gasolina_dia')
        .eq('ativo', true)
        .order('modelo')
      if (error) throw error
      return data
    }
  })

  // Buscar colaboradores disponíveis
  const { data: colaboradoresDisponiveis } = useQuery({
    queryKey: ['colaboradores-disponiveis'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          id, nome, 
          funcao:funcoes(id, nome, valor_diaria),
          valor_cafe_dia, valor_almoco_dia, valor_transporte_dia, valor_outros_dia
        `)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Calcular próximo dia
  const getProximaData = () => {
    if (!acompanhamentos || acompanhamentos.length === 0) {
      return ordemServico?.data_agendamento || new Date().toISOString().split('T')[0]
    }
    const ultimaData = new Date(acompanhamentos[acompanhamentos.length - 1].data)
    ultimaData.setDate(ultimaData.getDate() + 1)
    return ultimaData.toISOString().split('T')[0]
  }

  // Calcular progresso geral
  const progressoAtual = acompanhamentos?.length > 0 
    ? Math.max(...acompanhamentos.map(a => a.progresso_percentual || 0))
    : 0

  const diasTrabalhados = acompanhamentos?.filter(a => a.status === 'trabalhado').length || 0
  const diasPausados = acompanhamentos?.filter(a => a.status === 'pausado').length || 0

  const handleOpenModal = (dia = null) => {
    setEditingDia(dia)
    setShowModal(true)
  }

  const handleCloseModal = () => {
    setShowModal(false)
    setEditingDia(null)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date + 'T00:00:00').toLocaleDateString('pt-BR', {
      weekday: 'short',
      day: '2-digit',
      month: 'short'
    })
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  const getClimaIcon = (clima) => {
    const found = CLIMAS.find(c => c.value === clima)
    return found?.icon || Sun
  }

  const getClimaCor = (clima) => {
    const found = CLIMAS.find(c => c.value === clima)
    return found?.cor || '#6B7280'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header com resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="card bg-blue-50 border-blue-200">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-blue-700">Previsão</p>
              <p className="text-xl font-bold text-blue-600">{ordemServico?.previsao_dias || 1} dias</p>
            </div>
          </div>
        </div>
        <div className="card bg-green-50 border-green-200">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-green-700">Trabalhados</p>
              <p className="text-xl font-bold text-green-600">{diasTrabalhados} dias</p>
            </div>
          </div>
        </div>
        <div className="card bg-yellow-50 border-yellow-200">
          <div className="flex items-center gap-3">
            <PauseCircle className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-xs text-yellow-700">Pausados</p>
              <p className="text-xl font-bold text-yellow-600">{diasPausados} dias</p>
            </div>
          </div>
        </div>
        <div className="card bg-purple-50 border-purple-200">
          <div className="flex items-center gap-3">
            <Percent className="w-8 h-8 text-purple-600" />
            <div>
              <p className="text-xs text-purple-700">Progresso</p>
              <p className="text-xl font-bold text-purple-600">{progressoAtual}%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Barra de progresso */}
      <div className="card">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Progresso da Obra</span>
          <span className="text-sm font-bold text-gray-900">{progressoAtual}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="h-3 rounded-full transition-all duration-500"
            style={{ 
              width: `${progressoAtual}%`,
              backgroundColor: progressoAtual >= 100 ? '#22C55E' : progressoAtual >= 50 ? '#3B82F6' : '#F59E0B'
            }}
          />
        </div>
      </div>

      {/* Botão adicionar dia */}
      <div className="flex justify-end">
        <button 
          onClick={() => handleOpenModal()}
          className="btn-primary"
        >
          <Plus className="w-5 h-5" />
          Registrar Dia
        </button>
      </div>

      {/* Lista de dias */}
      {acompanhamentos?.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum dia registrado</h3>
          <p className="text-gray-500 mb-4">Comece a registrar o acompanhamento diário da obra</p>
          <button onClick={() => handleOpenModal()} className="btn-primary">
            <Play className="w-5 h-5" />
            Iniciar Primeiro Dia
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {acompanhamentos?.map((dia, index) => {
            const isExpanded = expandedDia === dia.id
            const ClimaIcon = getClimaIcon(dia.clima)
            const custoEquipe = dia.equipe?.reduce((sum, e) => 
              sum + (parseFloat(e.valor_diaria) || 0) + (parseFloat(e.valor_alimentacao) || 0), 0
            ) || 0

            return (
              <div 
                key={dia.id} 
                className={`card transition-all ${
                  dia.status === 'pausado' ? 'border-l-4 border-l-yellow-500 bg-yellow-50/50' : 
                  dia.status === 'trabalhado' ? 'border-l-4 border-l-green-500' : ''
                }`}
              >
                {/* Cabeçalho do dia */}
                <div 
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setExpandedDia(isExpanded ? null : dia.id)}
                >
                  <div className="flex items-center gap-4">
                    {/* Número do dia */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-bold text-lg ${
                      dia.status === 'pausado' ? 'bg-yellow-100 text-yellow-700' :
                      dia.status === 'trabalhado' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {dia.dia_numero || index + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-900">{formatDate(dia.data)}</span>
                        {dia.status === 'pausado' && (
                          <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-medium">
                            Pausado
                          </span>
                        )}
                        {dia.status === 'trabalhado' && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                            Trabalhado
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                        {dia.clima && (
                          <span className="flex items-center gap-1">
                            <ClimaIcon className="w-4 h-4" style={{ color: getClimaCor(dia.clima) }} />
                          </span>
                        )}
                        {dia.equipe?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Users className="w-4 h-4" />
                            {dia.equipe.length}
                          </span>
                        )}
                        {dia.veiculo && (
                          <span className="flex items-center gap-1">
                            <Car className="w-4 h-4" />
                            {dia.veiculo.placa}
                          </span>
                        )}
                        {dia.fotos?.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Camera className="w-4 h-4" />
                            {dia.fotos.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {/* Progresso */}
                    <div className="text-right hidden sm:block">
                      <p className="text-xs text-gray-500">Progresso</p>
                      <p className="font-bold text-gray-900">{dia.progresso_percentual || 0}%</p>
                    </div>

                    {/* Custo do dia */}
                    {dia.status === 'trabalhado' && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-500">Custo</p>
                        <p className="font-bold text-red-600">{formatCurrency(custoEquipe)}</p>
                      </div>
                    )}

                    {/* Expand/Collapse */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleOpenModal(dia) }}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Detalhes expandidos */}
                {isExpanded && (
                  <div className="mt-4 pt-4 border-t space-y-4 animate-fade-in">
                    {/* Motivo da pausa */}
                    {dia.status === 'pausado' && dia.motivo_pausa && (
                      <div className="p-3 bg-yellow-100 rounded-xl">
                        <p className="text-sm font-medium text-yellow-800">
                          Motivo da Pausa: {dia.motivo_pausa.nome}
                        </p>
                        {dia.motivo_pausa_obs && (
                          <p className="text-sm text-yellow-700 mt-1">{dia.motivo_pausa_obs}</p>
                        )}
                      </div>
                    )}

                    {/* Atividades */}
                    {dia.atividades_realizadas && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Atividades Realizadas</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {dia.atividades_realizadas}
                        </p>
                      </div>
                    )}

                    {/* Equipe do dia */}
                    {dia.equipe?.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-2">Equipe do Dia</p>
                        <div className="flex flex-wrap gap-2">
                          {dia.equipe.map((eq) => (
                            <div 
                              key={eq.id}
                              className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg"
                            >
                              <Users className="w-4 h-4 text-blue-600" />
                              <span className="text-sm font-medium text-blue-900">
                                {eq.colaborador?.nome}
                              </span>
                              <span className="text-xs text-blue-600">
                                {eq.tipo_diaria === 'meia' ? '½' : '1'} diária
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Observações */}
                    {dia.observacoes && (
                      <div>
                        <p className="text-sm font-medium text-gray-700 mb-1">Observações</p>
                        <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                          {dia.observacoes}
                        </p>
                      </div>
                    )}

                    {/* Horários */}
                    {(dia.hora_inicio || dia.hora_fim) && (
                      <div className="flex gap-4 text-sm">
                        {dia.hora_inicio && (
                          <span className="text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Início: {dia.hora_inicio}
                          </span>
                        )}
                        {dia.hora_fim && (
                          <span className="text-gray-600">
                            <Clock className="w-4 h-4 inline mr-1" />
                            Fim: {dia.hora_fim}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Modal de Registro de Dia */}
      {showModal && (
        <ModalRegistroDia
          ordemServicoId={ordemServicoId}
          diaExistente={editingDia}
          proximaData={getProximaData()}
          proximoDiaNumero={(acompanhamentos?.length || 0) + 1}
          colaboradoresPadrao={colaboradoresPadrao}
          veiculoPadrao={veiculoPadrao}
          veiculosDisponiveis={veiculosDisponiveis}
          colaboradoresDisponiveis={colaboradoresDisponiveis}
          motivosPausa={motivosPausa}
          onClose={handleCloseModal}
          onSuccess={() => {
            queryClient.invalidateQueries(['os-acompanhamento', ordemServicoId])
            handleCloseModal()
          }}
        />
      )}
    </div>
  )
}

// Modal de Registro de Dia
const ModalRegistroDia = ({
  ordemServicoId,
  diaExistente,
  proximaData,
  proximoDiaNumero,
  colaboradoresPadrao,
  veiculoPadrao,
  veiculosDisponiveis,
  colaboradoresDisponiveis,
  motivosPausa,
  onClose,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    data: diaExistente?.data || proximaData,
    dia_numero: diaExistente?.dia_numero || proximoDiaNumero,
    status: diaExistente?.status || 'trabalhado',
    motivo_pausa_id: diaExistente?.motivo_pausa_id || '',
    motivo_pausa_obs: diaExistente?.motivo_pausa_obs || '',
    progresso_percentual: diaExistente?.progresso_percentual || 0,
    atividades_realizadas: diaExistente?.atividades_realizadas || '',
    observacoes: diaExistente?.observacoes || '',
    clima: diaExistente?.clima || 'ensolarado',
    hora_inicio: diaExistente?.hora_inicio || '',
    hora_fim: diaExistente?.hora_fim || '',
    veiculo_id: diaExistente?.veiculo_id || veiculoPadrao?.id || ''
  })

  // Equipe do dia
  const [equipe, setEquipe] = useState(() => {
    if (diaExistente?.equipe?.length > 0) {
      return diaExistente.equipe.map(e => ({
        colaborador_id: e.colaborador_id,
        tipo_diaria: e.tipo_diaria,
        valor_diaria: e.valor_diaria,
        valor_alimentacao: e.valor_alimentacao
      }))
    }
    // Usar equipe padrão da OS
    return colaboradoresPadrao.map(c => ({
      colaborador_id: c.colaborador_id,
      tipo_diaria: 'completa',
      valor_diaria: c.valor_diaria || 0,
      valor_alimentacao: calcularAlimentacao(c.colaborador_id)
    }))
  })

  // Calcular alimentação de um colaborador
  function calcularAlimentacao(colaboradorId) {
    const colab = colaboradoresDisponiveis?.find(c => c.id === colaboradorId)
    if (!colab) return 0
    return (parseFloat(colab.valor_cafe_dia) || 0) +
           (parseFloat(colab.valor_almoco_dia) || 0) +
           (parseFloat(colab.valor_transporte_dia) || 0) +
           (parseFloat(colab.valor_outros_dia) || 0)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const addColaborador = () => {
    setEquipe([...equipe, {
      colaborador_id: '',
      tipo_diaria: 'completa',
      valor_diaria: 0,
      valor_alimentacao: 0
    }])
  }

  const updateColaborador = (index, field, value) => {
    const updated = [...equipe]
    updated[index][field] = value

    // Se selecionou colaborador, preencher valores
    if (field === 'colaborador_id' && value) {
      const colab = colaboradoresDisponiveis?.find(c => c.id === value)
      if (colab) {
        updated[index].valor_diaria = colab.funcao?.valor_diaria || 0
        updated[index].valor_alimentacao = calcularAlimentacao(value)
      }
    }

    // Se mudou tipo de diária, ajustar valor
    if (field === 'tipo_diaria') {
      const colab = colaboradoresDisponiveis?.find(c => c.id === updated[index].colaborador_id)
      if (colab) {
        const valorBase = colab.funcao?.valor_diaria || 0
        updated[index].valor_diaria = value === 'meia' ? valorBase / 2 : valorBase
      }
    }

    setEquipe(updated)
  }

  const removeColaborador = (index) => {
    setEquipe(equipe.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Salvar acompanhamento diário
      const acompData = {
        ordem_servico_id: ordemServicoId,
        data: formData.data,
        dia_numero: formData.dia_numero,
        status: formData.status,
        motivo_pausa_id: formData.status === 'pausado' ? formData.motivo_pausa_id || null : null,
        motivo_pausa_obs: formData.status === 'pausado' ? formData.motivo_pausa_obs : null,
        progresso_percentual: parseInt(formData.progresso_percentual) || 0,
        atividades_realizadas: formData.atividades_realizadas,
        observacoes: formData.observacoes,
        clima: formData.clima,
        hora_inicio: formData.hora_inicio || null,
        hora_fim: formData.hora_fim || null,
        veiculo_id: formData.veiculo_id || null,
        atualizado_em: new Date().toISOString()
      }

      let acompanhamentoId

      if (diaExistente) {
        // Atualizar existente
        const { error } = await supabase
          .from('os_acompanhamento_diario')
          .update(acompData)
          .eq('id', diaExistente.id)
        
        if (error) throw error
        acompanhamentoId = diaExistente.id

        // Deletar equipe antiga
        await supabase
          .from('os_acompanhamento_equipe')
          .delete()
          .eq('acompanhamento_id', diaExistente.id)
      } else {
        // Inserir novo
        const { data: newAcomp, error } = await supabase
          .from('os_acompanhamento_diario')
          .insert([acompData])
          .select()
          .single()
        
        if (error) throw error
        acompanhamentoId = newAcomp.id
      }

      // Salvar equipe do dia (apenas se trabalhou)
      if (formData.status === 'trabalhado' && equipe.length > 0) {
        const equipeData = equipe
          .filter(e => e.colaborador_id)
          .map(e => ({
            acompanhamento_id: acompanhamentoId,
            colaborador_id: e.colaborador_id,
            tipo_diaria: e.tipo_diaria,
            valor_diaria: parseFloat(e.valor_diaria) || 0,
            valor_alimentacao: parseFloat(e.valor_alimentacao) || 0
          }))

        if (equipeData.length > 0) {
          const { error: equipeError } = await supabase
            .from('os_acompanhamento_equipe')
            .insert(equipeData)
          
          if (equipeError) throw equipeError
        }
      }

      toast.success(diaExistente ? 'Dia atualizado!' : 'Dia registrado!')
      onSuccess()
    } catch (error) {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar registro')
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value || 0)
  }

  // Calcular custo total do dia
  const custoTotalDia = equipe.reduce((sum, e) => 
    sum + (parseFloat(e.valor_diaria) || 0) + (parseFloat(e.valor_alimentacao) || 0), 0
  )

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-xl animate-fade-in">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            {diaExistente ? 'Editar Registro' : 'Registrar Dia de Trabalho'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="p-6 space-y-6">
            {/* Data e Status */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Data</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="input-field"
                >
                  <option value="trabalhado">✅ Trabalhado</option>
                  <option value="pausado">⏸️ Pausado</option>
                </select>
              </div>
            </div>

            {/* Motivo da Pausa */}
            {formData.status === 'pausado' && (
              <div className="p-4 bg-yellow-50 rounded-xl space-y-4">
                <div>
                  <label className="label">Motivo da Pausa</label>
                  <select
                    name="motivo_pausa_id"
                    value={formData.motivo_pausa_id}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Selecione o motivo...</option>
                    {motivosPausa?.map(m => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Observação sobre a pausa</label>
                  <input
                    type="text"
                    name="motivo_pausa_obs"
                    value={formData.motivo_pausa_obs}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Detalhes adicionais..."
                  />
                </div>
              </div>
            )}

            {/* Campos para dia trabalhado */}
            {formData.status === 'trabalhado' && (
              <>
                {/* Clima e Horários */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Clima</label>
                    <select
                      name="clima"
                      value={formData.clima}
                      onChange={handleChange}
                      className="input-field"
                    >
                      {CLIMAS.map(c => (
                        <option key={c.value} value={c.value}>{c.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Hora Início</label>
                    <input
                      type="time"
                      name="hora_inicio"
                      value={formData.hora_inicio}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Hora Fim</label>
                    <input
                      type="time"
                      name="hora_fim"
                      value={formData.hora_fim}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Progresso */}
                <div>
                  <label className="label">Progresso da Obra: {formData.progresso_percentual}%</label>
                  <input
                    type="range"
                    name="progresso_percentual"
                    value={formData.progresso_percentual}
                    onChange={handleChange}
                    min="0"
                    max="100"
                    step="5"
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>0%</span>
                    <span>25%</span>
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Veículo */}
                <div>
                  <label className="label">Veículo</label>
                  <select
                    name="veiculo_id"
                    value={formData.veiculo_id}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Sem veículo</option>
                    {veiculosDisponiveis?.map(v => (
                      <option key={v.id} value={v.id}>{v.modelo} - {v.placa}</option>
                    ))}
                  </select>
                </div>

                {/* Equipe do dia */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="label mb-0">Equipe do Dia</label>
                    <button
                      type="button"
                      onClick={addColaborador}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar
                    </button>
                  </div>
                  
                  <div className="space-y-2">
                    {equipe.map((e, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                        <select
                          value={e.colaborador_id}
                          onChange={(ev) => updateColaborador(index, 'colaborador_id', ev.target.value)}
                          className="input-field flex-1"
                        >
                          <option value="">Selecione...</option>
                          {colaboradoresDisponiveis?.map(c => (
                            <option key={c.id} value={c.id}>{c.nome}</option>
                          ))}
                        </select>
                        <select
                          value={e.tipo_diaria}
                          onChange={(ev) => updateColaborador(index, 'tipo_diaria', ev.target.value)}
                          className="input-field w-28"
                        >
                          <option value="completa">Completa</option>
                          <option value="meia">Meia</option>
                        </select>
                        <span className="text-sm text-gray-600 w-24 text-right">
                          {formatCurrency(e.valor_diaria + e.valor_alimentacao)}
                        </span>
                        <button
                          type="button"
                          onClick={() => removeColaborador(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {equipe.length > 0 && (
                    <div className="mt-2 p-3 bg-blue-50 rounded-lg flex justify-between items-center">
                      <span className="text-sm font-medium text-blue-800">Custo Total do Dia</span>
                      <span className="text-lg font-bold text-blue-600">{formatCurrency(custoTotalDia)}</span>
                    </div>
                  )}
                </div>

                {/* Atividades */}
                <div>
                  <label className="label">Atividades Realizadas</label>
                  <textarea
                    name="atividades_realizadas"
                    value={formData.atividades_realizadas}
                    onChange={handleChange}
                    className="input-field"
                    rows={3}
                    placeholder="Descreva o que foi feito hoje..."
                  />
                </div>
              </>
            )}

            {/* Observações */}
            <div>
              <label className="label">Observações</label>
              <textarea
                name="observacoes"
                value={formData.observacoes}
                onChange={handleChange}
                className="input-field"
                rows={2}
                placeholder="Observações gerais..."
              />
            </div>
          </div>

          {/* Footer */}
          <div className="flex gap-3 p-6 border-t bg-gray-50">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
              {loading ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default DiarioObra
