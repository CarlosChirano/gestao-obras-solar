import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Edit, Trash2, Briefcase, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

// Formata valor para moeda brasileira
const formatCurrency = (value) => {
  if (!value && value !== 0) return 'R$ 0,00'
  return parseFloat(value).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
}

const Funcoes = () => {
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const queryClient = useQueryClient()

  const { data: funcoes, isLoading } = useQuery({
    queryKey: ['funcoes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('funcoes')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('funcoes')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['funcoes'])
      toast.success('Função excluída!')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const filtered = funcoes?.filter(f =>
    f.nome.toLowerCase().includes(search.toLowerCase()) ||
    f.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Funções</h1>
          <p className="text-gray-600">Gerencie as funções e cargos dos colaboradores</p>
        </div>
        <Link to="/funcoes/novo" className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Função
        </Link>
      </div>

      <div className="card">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="input-field pl-10"
          />
        </div>
      </div>

      <div className="card">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-12">
            <Briefcase className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma função encontrada</p>
            <Link to="/funcoes/novo" className="btn-primary mt-4 inline-flex">
              <Plus className="w-5 h-5" /> Cadastrar
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Descrição</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Valor Diária</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtered?.map((funcao) => (
                  <tr key={funcao.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Briefcase className="w-4 h-4 text-blue-600" />
                        </div>
                        <span className="font-medium text-gray-900">{funcao.nome}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-600 text-sm truncate max-w-xs">
                        {funcao.descricao || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-green-600 font-medium">
                        {formatCurrency(funcao.valor_diaria)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link 
                          to={`/funcoes/${funcao.id}`} 
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button 
                          onClick={() => setDeleteId(funcao.id)} 
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta função? Colaboradores vinculados a ela não serão afetados.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)} className="btn-secondary">
                Cancelar
              </button>
              <button 
                onClick={() => deleteMutation.mutate(deleteId)} 
                className="btn-danger"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Excluir'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Funcoes
