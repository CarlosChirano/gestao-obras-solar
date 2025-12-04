import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  Plus, 
  Search, 
  Loader2, 
  Users, 
  Phone, 
  Mail, 
  Edit,
  AlertTriangle,
  CheckCircle,
  Award,
  Shield
} from 'lucide-react'

const Colaboradores = () => {
  const [search, setSearch] = useState('')

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ['colaboradores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          funcao:funcoes(nome)
        `)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar certificados e EPIs para alertas
  const { data: alertasData } = useQuery({
    queryKey: ['colaboradores-alertas'],
    queryFn: async () => {
      const hoje = new Date().toISOString().split('T')[0]
      const limite30 = new Date()
      limite30.setDate(limite30.getDate() + 30)
      const limite30Str = limite30.toISOString().split('T')[0]

      // Certificados vencidos ou vencendo
      const { data: certificados } = await supabase
        .from('certificados')
        .select('colaborador_id, data_validade')
        .eq('ativo', true)
        .lte('data_validade', limite30Str)

      // EPIs vencidos ou vencendo
      const { data: epis } = await supabase
        .from('epis')
        .select('colaborador_id, data_validade')
        .eq('ativo', true)
        .lte('data_validade', limite30Str)

      // Agrupar por colaborador
      const alertas = {}

      certificados?.forEach(cert => {
        if (!alertas[cert.colaborador_id]) {
          alertas[cert.colaborador_id] = { certificadosVencidos: 0, certificadosVencendo: 0, episVencidos: 0, episVencendo: 0 }
        }
        if (cert.data_validade < hoje) {
          alertas[cert.colaborador_id].certificadosVencidos++
        } else {
          alertas[cert.colaborador_id].certificadosVencendo++
        }
      })

      epis?.forEach(epi => {
        if (!alertas[epi.colaborador_id]) {
          alertas[epi.colaborador_id] = { certificadosVencidos: 0, certificadosVencendo: 0, episVencidos: 0, episVencendo: 0 }
        }
        if (epi.data_validade < hoje) {
          alertas[epi.colaborador_id].episVencidos++
        } else {
          alertas[epi.colaborador_id].episVencendo++
        }
      })

      return alertas
    }
  })

  const filtered = colaboradores?.filter(c =>
    c.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.funcao?.nome?.toLowerCase().includes(search.toLowerCase()) ||
    c.telefone?.includes(search) ||
    c.email?.toLowerCase().includes(search.toLowerCase())
  )

  const getAlertaStatus = (colaboradorId) => {
    const alerta = alertasData?.[colaboradorId]
    if (!alerta) return null

    const totalVencidos = alerta.certificadosVencidos + alerta.episVencidos
    const totalVencendo = alerta.certificadosVencendo + alerta.episVencendo

    if (totalVencidos > 0) {
      return { tipo: 'vencido', total: totalVencidos, color: 'text-red-600', bg: 'bg-red-100' }
    } else if (totalVencendo > 0) {
      return { tipo: 'vencendo', total: totalVencendo, color: 'text-orange-600', bg: 'bg-orange-100' }
    }
    return null
  }

  // Resumo geral
  const totalColaboradores = colaboradores?.length || 0
  const colaboradoresComAlerta = Object.keys(alertasData || {}).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Colaboradores</h1>
          <p className="text-gray-600">Gerencie sua equipe</p>
        </div>
        <Link to="/colaboradores/novo" className="btn-primary">
          <Plus className="w-5 h-5" /> Novo Colaborador
        </Link>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{totalColaboradores}</p>
              <p className="text-sm text-gray-500">Total de Colaboradores</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{totalColaboradores - colaboradoresComAlerta}</p>
              <p className="text-sm text-gray-500">Documentos em Dia</p>
            </div>
          </div>
        </div>
        <div className="card">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{colaboradoresComAlerta}</p>
              <p className="text-sm text-gray-500">Com Pendências</p>
            </div>
          </div>
        </div>
      </div>

      {/* Busca */}
      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome, função, telefone ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      {/* Lista */}
      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhum colaborador encontrado</p>
            <Link to="/colaboradores/novo" className="btn-primary mt-4 inline-flex">
              <Plus className="w-5 h-5" /> Adicionar Colaborador
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Colaborador</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Função</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contato</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase">Documentos</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((colaborador) => {
                  const alerta = getAlertaStatus(colaborador.id)
                  return (
                    <tr key={colaborador.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-blue-700 font-medium">
                              {colaborador.nome?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{colaborador.nome}</p>
                            {colaborador.cpf && (
                              <p className="text-sm text-gray-500">CPF: {colaborador.cpf}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {colaborador.funcao ? (
                          <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-sm">
                            {colaborador.funcao.nome}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          {colaborador.telefone && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Phone className="w-3 h-3" />
                              {colaborador.telefone}
                            </div>
                          )}
                          {colaborador.email && (
                            <div className="flex items-center gap-1 text-sm text-gray-600">
                              <Mail className="w-3 h-3" />
                              {colaborador.email}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {alerta ? (
                          <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${alerta.bg} ${alerta.color}`}>
                            <AlertTriangle className="w-3 h-3" />
                            {alerta.total} {alerta.tipo === 'vencido' ? 'vencido(s)' : 'vencendo'}
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                            <CheckCircle className="w-3 h-3" />
                            Em dia
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          to={`/colaboradores/${colaborador.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                          Editar
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export default Colaboradores
