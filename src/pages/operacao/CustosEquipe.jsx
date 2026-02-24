import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import {
  Users, Calendar, DollarSign, Loader2, Filter, X, Car,
  TrendingUp, TrendingDown, MapPin, Search, ChevronDown, ChevronUp
} from 'lucide-react'

const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)
}

const CustosEquipe = () => {
  const hoje = new Date()
  const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)

  const [dataInicio, setDataInicio] = useState(primeiroDiaMes.toISOString().split('T')[0])
  const [dataFim, setDataFim] = useState(hoje.toISOString().split('T')[0])
  const [filtroColaborador, setFiltroColaborador] = useState('')
  const [filtroObra, setFiltroObra] = useState('')
  const [busca, setBusca] = useState('')
  const [expandido, setExpandido] = useState(null)
  const [abaAtiva, setAbaAtiva] = useState('colaboradores') // colaboradores | veiculos | diario

  const setPeriodo = (tipo) => {
    const h = new Date()
    let inicio, fim
    switch (tipo) {
      case 'semana':
        inicio = new Date(h); inicio.setDate(h.getDate() - h.getDay())
        fim = new Date(inicio); fim.setDate(inicio.getDate() + 6)
        break
      case 'mes':
        inicio = new Date(h.getFullYear(), h.getMonth(), 1)
        fim = new Date(h.getFullYear(), h.getMonth() + 1, 0)
        break
      case 'trimestre':
        const t = Math.floor(h.getMonth() / 3)
        inicio = new Date(h.getFullYear(), t * 3, 1)
        fim = new Date(h.getFullYear(), (t + 1) * 3, 0)
        break
      case 'ano':
        inicio = new Date(h.getFullYear(), 0, 1)
        fim = new Date(h.getFullYear(), 11, 31)
        break
      default: return
    }
    setDataInicio(inicio.toISOString().split('T')[0])
    setDataFim(fim.toISOString().split('T')[0])
  }

  // ============================================
  // QUERIES
  // ============================================
  const { data: colaboradoresLista } = useQuery({
    queryKey: ['colab-lista'],
    queryFn: async () => {
      const { data } = await supabase.from('colaboradores').select('id, nome').eq('ativo', true).order('nome')
      return data || []
    }
  })

  const { data: dadosCustos, isLoading } = useQuery({
    queryKey: ['custos-equipe', dataInicio, dataFim],
    queryFn: async () => {
      // 1. Buscar OS do período
      const { data: ordens } = await supabase
        .from('ordens_servico')
        .select('id, numero_os, data_agendamento, status, valor_total, valor_cobrado, endereco, cidade, potencia_kwp, cliente_id, equipe_id')
        .gte('data_agendamento', dataInicio)
        .lte('data_agendamento', dataFim)
        .eq('ativo', true)
        .or('deletado.is.null,deletado.eq.false')
        .order('data_agendamento', { ascending: false })

      if (!ordens || ordens.length === 0) return { ordens: [], colaboradores: [], veiculos: [], clientes: {} }

      const osIds = ordens.map(o => o.id)
      const clienteIds = [...new Set(ordens.map(o => o.cliente_id).filter(Boolean))]

      // 2. Buscar clientes
      let clientesMap = {}
      if (clienteIds.length > 0) {
        const { data: clientes } = await supabase.from('clientes').select('id, nome').in('id', clienteIds)
        clientesMap = (clientes || []).reduce((acc, c) => { acc[c.id] = c.nome; return acc }, {})
      }

      // 3. Buscar colaboradores com detalhes
      const { data: colabs } = await supabase
        .from('os_colaboradores')
        .select('ordem_servico_id, colaborador_id, valor_diaria, dias_trabalhados, valor_total, valor_cafe, valor_almoco, valor_transporte, colaborador:colaboradores(id, nome)')
        .in('ordem_servico_id', osIds)

      // 4. Buscar veículos
      const { data: veiculos } = await supabase
        .from('os_veiculos')
        .select('ordem_servico_id, veiculo_id, valor_aluguel, valor_gasolina, valor_gelo, valor_cafe, dias, valor_total, veiculo:veiculos(id, nome, placa)')
        .in('ordem_servico_id', osIds)

      return { ordens, colaboradores: colabs || [], veiculos: veiculos || [], clientes: clientesMap }
    },
    enabled: !!dataInicio && !!dataFim
  })

  // ============================================
  // PROCESSAR DADOS
  // ============================================
  const processado = useMemo(() => {
    if (!dadosCustos || !dadosCustos.ordens.length) return { porColaborador: [], porVeiculo: [], porDia: [], totais: null }

    const { ordens, colaboradores, veiculos, clientes } = dadosCustos

    // === POR COLABORADOR ===
    const colabMap = {}
    colaboradores.forEach(c => {
      const os = ordens.find(o => o.id === c.ordem_servico_id)
      if (!os) return

      const id = c.colaborador_id
      const nome = c.colaborador?.nome || 'Desconhecido'

      if (!colabMap[id]) {
        colabMap[id] = {
          id, nome,
          total_diarias: 0,
          total_cafe: 0,
          total_almoco: 0,
          total_transporte: 0,
          total_geral: 0,
          dias_trabalhados: 0,
          total_os: 0,
          obras: [],
          detalhes: []
        }
      }

      const diaria = parseFloat(c.valor_total) || 0
      const cafe = parseFloat(c.valor_cafe) || 0
      const almoco = parseFloat(c.valor_almoco) || 0
      const transporte = parseFloat(c.valor_transporte) || 0

      colabMap[id].total_diarias += diaria
      colabMap[id].total_cafe += cafe
      colabMap[id].total_almoco += almoco
      colabMap[id].total_transporte += transporte
      colabMap[id].total_geral += diaria + cafe + almoco + transporte
      colabMap[id].dias_trabalhados += parseFloat(c.dias_trabalhados) || 0
      colabMap[id].total_os++
      colabMap[id].detalhes.push({
        data: os.data_agendamento,
        os_numero: os.numero_os,
        os_id: os.id,
        cliente: clientes[os.cliente_id] || 'Sem cliente',
        endereco: os.endereco,
        diaria,
        cafe,
        almoco,
        transporte,
        total: diaria + cafe + almoco + transporte,
        dias: parseFloat(c.dias_trabalhados) || 0
      })
    })

    const porColaborador = Object.values(colabMap).sort((a, b) => b.total_geral - a.total_geral)

    // === POR VEÍCULO ===
    const veicMap = {}
    veiculos.forEach(v => {
      const os = ordens.find(o => o.id === v.ordem_servico_id)
      if (!os) return

      const id = v.veiculo_id || v.ordem_servico_id
      const nome = v.veiculo?.nome || 'Veículo'
      const placa = v.veiculo?.placa || ''

      if (!veicMap[id]) {
        veicMap[id] = {
          id, nome, placa,
          total_aluguel: 0, total_gasolina: 0, total_gelo: 0, total_cafe: 0,
          total_geral: 0, total_os: 0, detalhes: []
        }
      }

      const aluguel = parseFloat(v.valor_aluguel) || 0
      const gasolina = parseFloat(v.valor_gasolina) || 0
      const gelo = parseFloat(v.valor_gelo) || 0
      const cafe = parseFloat(v.valor_cafe) || 0

      veicMap[id].total_aluguel += aluguel
      veicMap[id].total_gasolina += gasolina
      veicMap[id].total_gelo += gelo
      veicMap[id].total_cafe += cafe
      veicMap[id].total_geral += parseFloat(v.valor_total) || (aluguel + gasolina + gelo + cafe)
      veicMap[id].total_os++
      veicMap[id].detalhes.push({
        data: os.data_agendamento,
        os_numero: os.numero_os,
        cliente: clientes[os.cliente_id] || 'Sem cliente',
        aluguel, gasolina, gelo, cafe,
        total: parseFloat(v.valor_total) || (aluguel + gasolina + gelo + cafe)
      })
    })

    const porVeiculo = Object.values(veicMap).sort((a, b) => b.total_geral - a.total_geral)

    // === POR DIA ===
    const diaMap = {}
    ordens.forEach(os => {
      const data = os.data_agendamento
      if (!diaMap[data]) {
        diaMap[data] = { data, total_os: 0, custo_mao_obra: 0, custo_veiculo: 0, custo_total: 0, colaboradores_ids: new Set() }
      }
      diaMap[data].total_os++
    })
    colaboradores.forEach(c => {
      const os = ordens.find(o => o.id === c.ordem_servico_id)
      if (!os) return
      const data = os.data_agendamento
      if (diaMap[data]) {
        diaMap[data].custo_mao_obra += (parseFloat(c.valor_total) || 0) + (parseFloat(c.valor_cafe) || 0) + (parseFloat(c.valor_almoco) || 0) + (parseFloat(c.valor_transporte) || 0)
        diaMap[data].colaboradores_ids.add(c.colaborador_id)
      }
    })
    veiculos.forEach(v => {
      const os = ordens.find(o => o.id === v.ordem_servico_id)
      if (!os) return
      const data = os.data_agendamento
      if (diaMap[data]) {
        diaMap[data].custo_veiculo += parseFloat(v.valor_total) || 0
      }
    })
    Object.values(diaMap).forEach(d => {
      d.custo_total = d.custo_mao_obra + d.custo_veiculo
      d.total_colaboradores = d.colaboradores_ids.size
    })
    const porDia = Object.values(diaMap).sort((a, b) => b.data.localeCompare(a.data))

    // === TOTAIS ===
    const totais = {
      custoMaoObra: porColaborador.reduce((s, c) => s + c.total_geral, 0),
      custoVeiculo: porVeiculo.reduce((s, v) => s + v.total_geral, 0),
      totalColaboradores: porColaborador.length,
      totalVeiculos: porVeiculo.length,
      totalDias: porDia.length,
      totalOS: ordens.length
    }
    totais.custoTotal = totais.custoMaoObra + totais.custoVeiculo

    return { porColaborador, porVeiculo, porDia, totais }
  }, [dadosCustos])

  // Filtragem
  const dadosFiltrados = useMemo(() => {
    let colabs = processado.porColaborador
    if (filtroColaborador) colabs = colabs.filter(c => c.id === filtroColaborador)
    if (busca) {
      const termo = busca.toLowerCase()
      colabs = colabs.filter(c => c.nome.toLowerCase().includes(termo))
    }
    return colabs
  }, [processado.porColaborador, filtroColaborador, busca])

  // ============================================
  // RENDERIZAÇÃO
  // ============================================
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  const { totais } = processado

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Custos de Equipe</h1>
        <p className="text-gray-600">Análise detalhada de custos por colaborador, veículo e período</p>
      </div>

      {/* Filtros de Período */}
      <div className="card">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex gap-1">
            {['semana', 'mes', 'trimestre', 'ano'].map(p => (
              <button key={p} onClick={() => setPeriodo(p)} className={`px-4 py-2 text-sm font-medium rounded-xl transition-colors ${periodo === p ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {p === 'mes' ? 'Mês' : p === 'trimestre' ? 'Trimestre' : p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Data Início</label>
            <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} className="input-field !py-1.5 !text-sm w-40" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">Data Fim</label>
            <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} className="input-field !py-1.5 !text-sm w-40" />
          </div>
        </div>

        {/* Filtro de colaborador */}
        <div className="flex flex-wrap items-center gap-4 mt-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={busca}
              onChange={e => setBusca(e.target.value)}
              className="input-field pl-10 !py-1.5 !text-sm"
            />
            {busca && (
              <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded">
                <X className="w-4 h-4 text-gray-400" />
              </button>
            )}
          </div>
          <select
            value={filtroColaborador}
            onChange={e => setFiltroColaborador(e.target.value)}
            className="input-field !py-1.5 !text-sm w-60"
          >
            <option value="">Todos os colaboradores</option>
            {colaboradoresLista?.map(c => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {filtroColaborador && (
            <button onClick={() => setFiltroColaborador('')} className="text-xs text-blue-600 hover:text-blue-800">
              Limpar filtros
            </button>
          )}
        </div>
      </div>

      {/* Cards de Totais */}
      {totais && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="card !p-4 bg-gradient-to-br from-orange-50 to-white">
            <p className="text-xs text-gray-500">Mão de Obra</p>
            <p className="text-xl font-bold text-orange-600">{formatCurrency(totais.custoMaoObra)}</p>
            <p className="text-xs text-gray-400">{totais.totalColaboradores} colaborador{totais.totalColaboradores !== 1 ? 'es' : ''}</p>
          </div>
          <div className="card !p-4 bg-gradient-to-br from-purple-50 to-white">
            <p className="text-xs text-gray-500">Veículos</p>
            <p className="text-xl font-bold text-purple-600">{formatCurrency(totais.custoVeiculo)}</p>
            <p className="text-xs text-gray-400">{totais.totalVeiculos} veículo{totais.totalVeiculos !== 1 ? 's' : ''}</p>
          </div>
          <div className="card !p-4 bg-gradient-to-br from-red-50 to-white">
            <p className="text-xs text-gray-500">Custo Total</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totais.custoTotal)}</p>
            <p className="text-xs text-gray-400">{totais.totalOS} OS</p>
          </div>
          <div className="card !p-4 bg-gradient-to-br from-blue-50 to-white">
            <p className="text-xs text-gray-500">Dias com Obra</p>
            <p className="text-xl font-bold text-blue-600">{totais.totalDias}</p>
          </div>
          <div className="card !p-4 bg-gradient-to-br from-green-50 to-white">
            <p className="text-xs text-gray-500">Custo Médio/OS</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totais.totalOS > 0 ? totais.custoTotal / totais.totalOS : 0)}</p>
          </div>
        </div>
      )}

      {/* Abas */}
      <div className="card !p-0">
        <div className="flex border-b">
          {[
            { id: 'colaboradores', label: 'Por Colaborador', icon: Users },
            { id: 'veiculos', label: 'Por Veículo', icon: Car },
            { id: 'diario', label: 'Por Dia', icon: Calendar },
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id)}
              className={`flex items-center gap-2 px-5 py-3.5 border-b-2 text-sm font-medium ${
                abaAtiva === aba.id ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <aba.icon className="w-4 h-4" />
              {aba.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {/* === ABA: POR COLABORADOR === */}
          {abaAtiva === 'colaboradores' && (
            <div className="space-y-3">
              {dadosFiltrados.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nenhum colaborador encontrado no período</p>
              ) : (
                dadosFiltrados.map(colab => (
                  <div key={colab.id} className="border rounded-xl overflow-hidden">
                    {/* Header do colaborador */}
                    <div
                      onClick={() => setExpandido(expandido === colab.id ? null : colab.id)}
                      className="flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold text-blue-600">
                            {colab.nome.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{colab.nome}</h4>
                          <p className="text-xs text-gray-500">{colab.total_os} OS • {colab.dias_trabalhados} dia{colab.dias_trabalhados !== 1 ? 's' : ''}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Diárias</p>
                          <p className="font-semibold text-orange-600">{formatCurrency(colab.total_diarias)}</p>
                        </div>
                        {(colab.total_cafe + colab.total_almoco + colab.total_transporte) > 0 && (
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Extras</p>
                            <p className="font-semibold text-purple-600">{formatCurrency(colab.total_cafe + colab.total_almoco + colab.total_transporte)}</p>
                          </div>
                        )}
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-red-600 text-lg">{formatCurrency(colab.total_geral)}</p>
                        </div>
                        {expandido === colab.id ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {/* Detalhes expandidos */}
                    {expandido === colab.id && (
                      <div className="border-t bg-gray-50 p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase">
                              <th className="px-3 py-2">Data</th>
                              <th className="px-3 py-2">OS</th>
                              <th className="px-3 py-2">Cliente</th>
                              <th className="px-3 py-2 text-center">Dias</th>
                              <th className="px-3 py-2 text-right">Diária</th>
                              <th className="px-3 py-2 text-right">Café</th>
                              <th className="px-3 py-2 text-right">Almoço</th>
                              <th className="px-3 py-2 text-right">Transporte</th>
                              <th className="px-3 py-2 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {colab.detalhes.sort((a, b) => b.data.localeCompare(a.data)).map((d, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-2 text-gray-600">
                                  {new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td className="px-3 py-2 text-gray-600">#{d.os_numero}</td>
                                <td className="px-3 py-2 text-gray-900 font-medium truncate max-w-[200px]">{d.cliente}</td>
                                <td className="px-3 py-2 text-center text-gray-600">{d.dias}</td>
                                <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(d.diaria)}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{d.cafe > 0 ? formatCurrency(d.cafe) : '-'}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{d.almoco > 0 ? formatCurrency(d.almoco) : '-'}</td>
                                <td className="px-3 py-2 text-right text-gray-500">{d.transporte > 0 ? formatCurrency(d.transporte) : '-'}</td>
                                <td className="px-3 py-2 text-right font-bold text-red-600">{formatCurrency(d.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot className="border-t-2 border-gray-300">
                            <tr className="bg-blue-50 font-semibold">
                              <td colSpan={4} className="px-3 py-2 text-gray-700">Total</td>
                              <td className="px-3 py-2 text-right text-orange-600">{formatCurrency(colab.total_diarias)}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(colab.total_cafe)}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(colab.total_almoco)}</td>
                              <td className="px-3 py-2 text-right text-gray-600">{formatCurrency(colab.total_transporte)}</td>
                              <td className="px-3 py-2 text-right text-red-600 text-lg">{formatCurrency(colab.total_geral)}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* === ABA: POR VEÍCULO === */}
          {abaAtiva === 'veiculos' && (
            <div className="space-y-3">
              {processado.porVeiculo.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nenhum veículo encontrado no período</p>
              ) : (
                processado.porVeiculo.map(veic => (
                  <div key={veic.id} className="border rounded-xl overflow-hidden">
                    <div
                      onClick={() => setExpandido(expandido === `v-${veic.id}` ? null : `v-${veic.id}`)}
                      className="flex items-center justify-between px-5 py-4 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                          <Car className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-900">{veic.nome}</h4>
                          <p className="text-xs text-gray-500">{veic.placa || ''} • {veic.total_os} OS</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Aluguel</p>
                          <p className="font-semibold text-blue-600">{formatCurrency(veic.total_aluguel)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Gasolina</p>
                          <p className="font-semibold text-yellow-600">{formatCurrency(veic.total_gasolina)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">Total</p>
                          <p className="font-bold text-red-600 text-lg">{formatCurrency(veic.total_geral)}</p>
                        </div>
                        {expandido === `v-${veic.id}` ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                      </div>
                    </div>

                    {expandido === `v-${veic.id}` && (
                      <div className="border-t bg-gray-50 p-4">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-left text-xs text-gray-500 uppercase">
                              <th className="px-3 py-2">Data</th>
                              <th className="px-3 py-2">OS</th>
                              <th className="px-3 py-2">Cliente</th>
                              <th className="px-3 py-2 text-right">Aluguel</th>
                              <th className="px-3 py-2 text-right">Gasolina</th>
                              <th className="px-3 py-2 text-right">Gelo</th>
                              <th className="px-3 py-2 text-right font-bold">Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {veic.detalhes.sort((a, b) => b.data.localeCompare(a.data)).map((d, idx) => (
                              <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                <td className="px-3 py-2 text-gray-600">{new Date(d.data + 'T12:00:00').toLocaleDateString('pt-BR')}</td>
                                <td className="px-3 py-2 text-gray-600">#{d.os_numero}</td>
                                <td className="px-3 py-2 text-gray-900 font-medium">{d.cliente}</td>
                                <td className="px-3 py-2 text-right text-blue-600">{formatCurrency(d.aluguel)}</td>
                                <td className="px-3 py-2 text-right text-yellow-600">{formatCurrency(d.gasolina)}</td>
                                <td className="px-3 py-2 text-right text-cyan-600">{d.gelo > 0 ? formatCurrency(d.gelo) : '-'}</td>
                                <td className="px-3 py-2 text-right font-bold text-red-600">{formatCurrency(d.total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* === ABA: POR DIA === */}
          {abaAtiva === 'diario' && (
            <div>
              {processado.porDia.length === 0 ? (
                <p className="text-center py-8 text-gray-500">Nenhum dado no período</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr className="text-left text-xs text-gray-500 uppercase">
                      <th className="px-4 py-3">Data</th>
                      <th className="px-4 py-3 text-center">OS</th>
                      <th className="px-4 py-3 text-center">Colaboradores</th>
                      <th className="px-4 py-3 text-right">Mão de Obra</th>
                      <th className="px-4 py-3 text-right">Veículos</th>
                      <th className="px-4 py-3 text-right font-bold">Custo Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {processado.porDia.map((dia, idx) => (
                      <tr key={dia.data} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {new Date(dia.data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })}
                        </td>
                        <td className="px-4 py-3 text-center text-gray-600">{dia.total_os}</td>
                        <td className="px-4 py-3 text-center text-gray-600">{dia.total_colaboradores}</td>
                        <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(dia.custo_mao_obra)}</td>
                        <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(dia.custo_veiculo)}</td>
                        <td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(dia.custo_total)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2">
                    <tr className="bg-blue-50 font-semibold">
                      <td className="px-4 py-3 text-gray-700">Total</td>
                      <td className="px-4 py-3 text-center">{processado.porDia.reduce((s, d) => s + d.total_os, 0)}</td>
                      <td className="px-4 py-3 text-center">-</td>
                      <td className="px-4 py-3 text-right text-orange-600">{formatCurrency(processado.porDia.reduce((s, d) => s + d.custo_mao_obra, 0))}</td>
                      <td className="px-4 py-3 text-right text-purple-600">{formatCurrency(processado.porDia.reduce((s, d) => s + d.custo_veiculo, 0))}</td>
                      <td className="px-4 py-3 text-right text-red-600 text-lg">{formatCurrency(processado.porDia.reduce((s, d) => s + d.custo_total, 0))}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default CustosEquipe
