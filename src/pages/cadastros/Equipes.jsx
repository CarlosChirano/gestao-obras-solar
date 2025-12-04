import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Plus, Search, Edit, Trash2, Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'

const Equipes = () => {
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const queryClient = useQueryClient()

  const { data: equipes, isLoading } = useQuery({
    queryKey: ['equipes'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('equipes')
        .select(`
          *,
          equipe_membros(
            id,
            colaborador:colaboradores(id, nome),
            funcao_na_equipe
          )
        `)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('equipes')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['equipes'])
      toast.success('Equipe excluída!')
      setDeleteId(null)
    },
    onError: () => toast.error('Erro ao excluir')
  })

  const filtered = equipes?.filter(e =>
    e.nome.toLowerCase().includes(search.toLowerCase()) ||
    e.descricao?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipes</h1>
          <p className="text-gray-600">Gerencie as equipes de trabalho</p>
        </div>
        <Link to="/equipes/nova" className="btn-primary">
          <Plus className="w-5 h-5" /> Nova Equipe
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
            <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">Nenhuma equipe encontrada</p>
            <Link to="/equipes/nova" className="btn-primary mt-4 inline-flex">
              <Plus className="w-5 h-5" /> Cadastrar
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered?.map((equipe) => (
              <div 
                key={equipe.id} 
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: equipe.cor + '20' }}
                    >
                      <Users className="w-5 h-5" style={{ color: equipe.cor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{equipe.nome}</h3>
                      <p className="text-sm text-gray-500">
                        {equipe.equipe_membros?.length || 0} membros
                      </p>
                    </div>
                  </div>
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: equipe.cor }}
                  />
                </div>

                {equipe.descricao && (
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                    {equipe.descricao}
                  </p>
                )}

                {equipe.equipe_membros?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-1">Membros:</p>
                    <div className="flex flex-wrap gap-1">
                      {equipe.equipe_membros.slice(0, 3).map((membro) => (
                        <span 
                          key={membro.id}
                          className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                        >
                          {membro.colaborador?.nome?.split(' ')[0]}
                        </span>
                      ))}
                      {equipe.equipe_membros.length > 3 && (
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">
                          +{equipe.equipe_membros.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                  <Link 
                    to={`/equipes/${equipe.id}`}
                    className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    <Edit className="w-4 h-4" />
                  </Link>
                  <button 
                    onClick={() => setDeleteId(equipe.id)}
                    className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal de Confirmação de Exclusão */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Confirmar Exclusão</h3>
            <p className="text-gray-600 mb-6">
              Tem certeza que deseja excluir esta equipe? Os membros serão desvinculados.
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

export default Equipes
