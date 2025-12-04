import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { useNavigate } from 'react-router-dom'
import { 
  ArrowLeft,
  Shield,
  ShieldCheck,
  Plus,
  Edit,
  Trash2,
  Save,
  Loader2,
  X,
  Check,
  AlertTriangle,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'

const PerfisAcesso = () => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  
  const [perfilEditando, setPerfilEditando] = useState(null)
  const [novoPerfilAberto, setNovoPerfilAberto] = useState(false)
  const [novoPerfilData, setNovoPerfilData] = useState({
    nome: '',
    descricao: '',
    cor: '#3B82F6',
    is_admin: false
  })

  const cores = [
    '#DC2626', '#EA580C', '#D97706', '#CA8A04', '#65A30D',
    '#16A34A', '#059669', '#0D9488', '#0891B2', '#0284C7',
    '#2563EB', '#4F46E5', '#7C3AED', '#9333EA', '#C026D3',
    '#DB2777', '#E11D48', '#6B7280'
  ]

  const modulos = [
    { id: 'dashboard', nome: 'Dashboard' },
    { id: 'ordens_servico', nome: 'Ordens de Serviço' },
    { id: 'calendario', nome: 'Calendário' },
    { id: 'financeiro', nome: 'Financeiro' },
    { id: 'relatorios', nome: 'Relatórios' },
    { id: 'colaboradores', nome: 'Colaboradores' },
    { id: 'clientes', nome: 'Clientes' },
    { id: 'equipes', nome: 'Equipes' },
    { id: 'servicos', nome: 'Serviços' },
    { id: 'veiculos', nome: 'Veículos' },
    { id: 'empresas', nome: 'Empresas' },
    { id: 'usuarios', nome: 'Usuários' }
  ]

  // Buscar perfis
  const { data: perfis, isLoading } = useQuery({
    queryKey: ['perfis-acesso-completo'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis_acesso')
        .select(`
          *,
          permissoes(*)
        `)
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Contar usuários por perfil
  const { data: contadorUsuarios } = useQuery({
    queryKey: ['contador-usuarios-perfil'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select('perfil_id')
        .eq('pode_acessar_sistema', true)
      if (error) throw error
      
      const contador = {}
      data.forEach(c => {
        if (c.perfil_id) {
          contador[c.perfil_id] = (contador[c.perfil_id] || 0) + 1
        }
      })
      return contador
    }
  })

  // Criar novo perfil
  const criarPerfilMutation = useMutation({
    mutationFn: async (dados) => {
      // Criar perfil
      const { data: perfil, error: erroPerfil } = await supabase
        .from('perfis_acesso')
        .insert(dados)
        .select()
        .single()
      
      if (erroPerfil) throw erroPerfil

      // Criar permissões padrão (tudo desabilitado)
      const permissoes = modulos.map(m => ({
        perfil_id: perfil.id,
        modulo: m.id,
        visualizar: false,
        criar: false,
        editar: false,
        excluir: false,
        exportar: false
      }))

      const { error: erroPermissoes } = await supabase
        .from('permissoes')
        .insert(permissoes)

      if (erroPermissoes) throw erroPermissoes

      return perfil
    },
    onSuccess: () => {
      toast.success('Perfil criado!')
      setNovoPerfilAberto(false)
      setNovoPerfilData({ nome: '', descricao: '', cor: '#3B82F6', is_admin: false })
      queryClient.invalidateQueries(['perfis-acesso'])
    },
    onError: () => {
      toast.error('Erro ao criar perfil')
    }
  })

  // Atualizar permissão
  const atualizarPermissaoMutation = useMutation({
    mutationFn: async ({ perfilId, modulo, campo, valor }) => {
      const { error } = await supabase
        .from('permissoes')
        .update({ [campo]: valor })
        .eq('perfil_id', perfilId)
        .eq('modulo', modulo)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['perfis-acesso-completo'])
    },
    onError: () => {
      toast.error('Erro ao atualizar permissão')
    }
  })

  // Excluir perfil
  const excluirPerfilMutation = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from('perfis_acesso')
        .update({ ativo: false })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Perfil excluído!')
      queryClient.invalidateQueries(['perfis-acesso'])
    },
    onError: () => {
      toast.error('Erro ao excluir perfil')
    }
  })

  const getPermissaoModulo = (perfil, modulo) => {
    return perfil.permissoes?.find(p => p.modulo === modulo) || {}
  }

  const togglePermissao = (perfilId, modulo, campo, valorAtual) => {
    atualizarPermissaoMutation.mutate({
      perfilId,
      modulo,
      campo,
      valor: !valorAtual
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/usuarios')} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Perfis de Acesso</h1>
          <p className="text-gray-600">Configure as permissões de cada perfil</p>
        </div>
        <button
          onClick={() => setNovoPerfilAberto(true)}
          className="btn btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Novo Perfil
        </button>
      </div>

      {/* Modal Novo Perfil */}
      {novoPerfilAberto && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md m-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Novo Perfil de Acesso</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                <input
                  type="text"
                  value={novoPerfilData.nome}
                  onChange={(e) => setNovoPerfilData(prev => ({ ...prev, nome: e.target.value }))}
                  className="input"
                  placeholder="Ex: Coordenador"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  value={novoPerfilData.descricao}
                  onChange={(e) => setNovoPerfilData(prev => ({ ...prev, descricao: e.target.value }))}
                  className="input"
                  placeholder="Breve descrição do perfil"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {cores.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setNovoPerfilData(prev => ({ ...prev, cor }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        novoPerfilData.cor === cor ? 'border-gray-900 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: cor }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_admin"
                  checked={novoPerfilData.is_admin}
                  onChange={(e) => setNovoPerfilData(prev => ({ ...prev, is_admin: e.target.checked }))}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <label htmlFor="is_admin" className="text-sm font-medium text-gray-700">
                  Acesso total (Administrador)
                </label>
              </div>

              {novoPerfilData.is_admin && (
                <div className="p-3 bg-red-50 rounded-lg text-red-700 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Este perfil terá acesso a todas as funcionalidades
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setNovoPerfilAberto(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                onClick={() => criarPerfilMutation.mutate(novoPerfilData)}
                disabled={!novoPerfilData.nome || criarPerfilMutation.isPending}
                className="btn btn-primary"
              >
                {criarPerfilMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Criar Perfil'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lista de Perfis */}
      <div className="space-y-6">
        {perfis?.map((perfil) => (
          <div key={perfil.id} className="card">
            {/* Header do Perfil */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: perfil.cor }}
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold text-gray-900">{perfil.nome}</h3>
                    {perfil.is_admin && (
                      <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-medium rounded">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">{perfil.descricao}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Users className="w-4 h-4" />
                  {contadorUsuarios?.[perfil.id] || 0} usuários
                </div>
                {!perfil.is_admin && (
                  <button
                    onClick={() => {
                      if (confirm('Deseja excluir este perfil?')) {
                        excluirPerfilMutation.mutate(perfil.id)
                      }
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Permissões */}
            {perfil.is_admin ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700">
                <ShieldCheck className="w-5 h-5" />
                <p>Este perfil tem acesso total a todos os módulos do sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Visualizar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Criar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Editar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Excluir</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase w-24">Exportar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {modulos.map((modulo) => {
                      const perm = getPermissaoModulo(perfil, modulo.id)
                      return (
                        <tr key={modulo.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 font-medium text-gray-900">{modulo.nome}</td>
                          {['visualizar', 'criar', 'editar', 'excluir', 'exportar'].map((campo) => (
                            <td key={campo} className="px-4 py-2 text-center">
                              <button
                                onClick={() => togglePermissao(perfil.id, modulo.id, campo, perm[campo])}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                                  perm[campo]
                                    ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                    : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                }`}
                              >
                                {perm[campo] ? (
                                  <Check className="w-4 h-4" />
                                ) : (
                                  <X className="w-4 h-4" />
                                )}
                              </button>
                            </td>
                          ))}
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Legenda */}
      <div className="card">
        <h4 className="font-medium text-gray-900 mb-3">Legenda das Permissões</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700">Visualizar:</span>
            <span className="text-gray-500 ml-2">Pode ver os dados do módulo</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Criar:</span>
            <span className="text-gray-500 ml-2">Pode adicionar novos registros</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Editar:</span>
            <span className="text-gray-500 ml-2">Pode alterar registros existentes</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Excluir:</span>
            <span className="text-gray-500 ml-2">Pode remover registros</span>
          </div>
          <div>
            <span className="font-medium text-gray-700">Exportar:</span>
            <span className="text-gray-500 ml-2">Pode exportar relatórios/PDFs</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PerfisAcesso
