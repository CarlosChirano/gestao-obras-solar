import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Trash2,
  RotateCcw,
  X,
  Eye,
  EyeOff
} from 'lucide-react'
import toast from 'react-hot-toast'

const Colaboradores = () => {
  const [search, setSearch] = useState('')
  const [mostrarDeletados, setMostrarDeletados] = useState(false)
  const [deleteModal, setDeleteModal] = useState({ open: false, colaborador: null })
  const queryClient = useQueryClient()

  const { data: colaboradores, isLoading } = useQuery({
    queryKey: ['colaboradores', mostrarDeletados],
    queryFn: async () => {
      let query = supabase
        .from('colaboradores')
        .select(`
          *,
          funcao:funcoes(nome)
        `)
        .order('nome')

      if (!mostrarDeletados) {
        query = query.or('deletado.is.null,deletado.eq.false')
      }

      // Sempre filtrar ativos (ativo é diferente de deletado)
      query = query.eq('ativo', true)

      const { data, error } = await query
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

      const { data: certificados } = await supabase
        .from('certificados')
        .select('colaborador_id, data_validade')
        .eq('ativo', true)
        .lte('data_validade', limite30Str)

      const { data: epis } = await supabase
        .from('epis')
        .select('colaborador_id, data_validade')
        .eq('ativo', true)
        .lte('data_validade', limite30Str)

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

  // Mutation para deletar (soft delete)
  const deleteMutation = useMutation({
    mutationFn: async (colaboradorId) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({ deletado: true })
        .eq('id', colaboradorId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores'])
      toast.success('Colaborador removido com sucesso')
      setDeleteModal({ open: false, colaborador: null })
    },
    onError: (error) => {
      toast.error('Erro ao remover: ' + error.message)
    }
  })

  // Mutation para restaurar
  const restoreMutation = useMutation({
    mutationFn: async (colaboradorId) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({ deletado: false })
        .eq('id', colaboradorId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['colaboradores'])
      toast.success('Colaborador restaurado com sucesso')
    },
    onError: (error) => {
      toast.error('Erro ao restaurar: ' + error.message)
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

  const totalColaboradores = colaboradores?.filter(c => !c.deletado)?.length || 0
  const totalDeletados = colaboradores?.filter(c => c.deletado)?.length || 0
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

      {/* Busca e Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, função, telefone ou email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="input-field pl-10"
            />
          </div>
          <button
            onClick={() => setMostrarDeletados(!mostrarDeletados)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
              mostrarDeletados 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
            }`}
          >
            {mostrarDeletados ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            {mostrarDeletados ? 'Ocultando deletados' : 'Mostrar deletados'}
            {totalDeletados > 0 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                {totalDeletados}
              </span>
            )}
          </button>
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
                  const isDeletado = colaborador.deletado
                  
                  return (
                    <tr key={colaborador.id} className={`hover:bg-gray-50 ${isDeletado ? 'bg-red-50 opacity-60' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isDeletado ? 'bg-red-100' : 'bg-blue-100'}`}>
                            <span className={`font-medium ${isDeletado ? 'text-red-700' : 'text-blue-700'}`}>
                              {colaborador.nome?.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <p className={`font-medium ${isDeletado ? 'text-red-900 line-through' : 'text-gray-900'}`}>
                              {colaborador.nome}
                            </p>
                            {colaborador.cpf && (
                              <p className="text-sm text-gray-500">CPF: {colaborador.cpf}</p>
                            )}
                            {isDeletado && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 rounded text-xs mt-1">
                                <Trash2 className="w-3 h-3" /> Removido
                              </span>
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
                        <div className="flex items-center justify-end gap-1">
                          {isDeletado ? (
                            <button
                              onClick={() => restoreMutation.mutate(colaborador.id)}
                              disabled={restoreMutation.isPending}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-green-600 hover:bg-green-50 rounded-lg"
                              title="Restaurar colaborador"
                            >
                              <RotateCcw className="w-4 h-4" />
                              Restaurar
                            </button>
                          ) : (
                            <>
                              <Link
                                to={`/colaboradores/${colaborador.id}`}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                              >
                                <Edit className="w-4 h-4" />
                                Editar
                              </Link>
                              <button
                                onClick={() => setDeleteModal({ open: true, colaborador })}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                title="Remover colaborador"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Trash2 className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-semibold text-gray-900">Remover Colaborador</h2>
              </div>
              <button onClick={() => setDeleteModal({ open: false, colaborador: null })} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-gray-600">
                Tem certeza que deseja remover o colaborador <strong>{deleteModal.colaborador?.nome}</strong>?
              </p>
              <p className="text-sm text-gray-500 mt-2">
                O colaborador não será excluído permanentemente e poderá ser restaurado depois.
              </p>
            </div>

            <div className="flex gap-3 p-6 border-t bg-gray-50 rounded-b-2xl">
              <button
                onClick={() => setDeleteModal({ open: false, colaborador: null })}
                className="btn-secondary flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate(deleteModal.colaborador?.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                Remover
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Colaboradores
