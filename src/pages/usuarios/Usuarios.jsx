import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { Link } from 'react-router-dom'
import { 
  Users, 
  Search, 
  Shield, 
  ShieldCheck,
  ShieldX,
  Mail,
  Phone,
  UserCheck,
  UserX,
  Loader2,
  Settings
} from 'lucide-react'
import toast from 'react-hot-toast'

const Usuarios = () => {
  const [busca, setBusca] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('todos')
  const queryClient = useQueryClient()

  // Buscar usuários com acesso ao sistema
  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios-sistema'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          perfil:perfis_acesso(id, nome, cor, is_admin),
          funcao:funcoes(nome)
        `)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Buscar perfis
  const { data: perfis } = useQuery({
    queryKey: ['perfis-acesso'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('perfis_acesso')
        .select('*')
        .eq('ativo', true)
        .order('nome')
      if (error) throw error
      return data
    }
  })

  // Alternar acesso ao sistema
  const toggleAcessoMutation = useMutation({
    mutationFn: async ({ id, pode_acessar }) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({ pode_acessar_sistema: pode_acessar })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Acesso atualizado!')
      queryClient.invalidateQueries(['usuarios-sistema'])
    },
    onError: () => {
      toast.error('Erro ao atualizar acesso')
    }
  })

  // Filtrar usuários
  const usuariosFiltrados = usuarios?.filter(u => {
    const matchBusca = u.nome?.toLowerCase().includes(busca.toLowerCase()) ||
                       u.email?.toLowerCase().includes(busca.toLowerCase())
    
    if (filtroStatus === 'com-acesso') return matchBusca && u.pode_acessar_sistema
    if (filtroStatus === 'sem-acesso') return matchBusca && !u.pode_acessar_sistema
    return matchBusca
  }) || []

  const usuariosComAcesso = usuarios?.filter(u => u.pode_acessar_sistema).length || 0
  const usuariosSemAcesso = usuarios?.filter(u => !u.pode_acessar_sistema).length || 0

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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Usuários do Sistema</h1>
          <p className="text-gray-600">Gerencie acessos e permissões</p>
        </div>
        <Link
          to="/usuarios/perfis"
          className="btn btn-primary flex items-center gap-2"
        >
          <Shield className="w-4 h-4" />
          Perfis de Acesso
        </Link>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total de Colaboradores</p>
              <p className="text-2xl font-bold text-gray-900">{usuarios?.length || 0}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Com Acesso ao Sistema</p>
              <p className="text-2xl font-bold text-green-600">{usuariosComAcesso}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Sem Acesso</p>
              <p className="text-2xl font-bold text-gray-600">{usuariosSemAcesso}</p>
            </div>
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
              <ShieldX className="w-6 h-6 text-gray-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="input pl-10"
            />
          </div>
          <select
            value={filtroStatus}
            onChange={(e) => setFiltroStatus(e.target.value)}
            className="input w-auto"
          >
            <option value="todos">Todos</option>
            <option value="com-acesso">Com acesso ao sistema</option>
            <option value="sem-acesso">Sem acesso</option>
          </select>
        </div>
      </div>

      {/* Lista de Usuários - Cards */}
      <div className="space-y-4">
        {usuariosFiltrados.map((usuario) => (
          <div key={usuario.id} className="card hover:shadow-md transition-shadow">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              {/* Avatar e Nome */}
              <div className="flex items-center gap-4 flex-1 min-w-0">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-700 font-semibold text-lg">
                    {usuario.nome?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{usuario.nome}</h3>
                  <p className="text-sm text-gray-500">{usuario.funcao?.nome || 'Sem função'}</p>
                </div>
              </div>

              {/* Contato */}
              <div className="flex flex-col gap-1 lg:w-64">
                {usuario.email && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4 flex-shrink-0" />
                    <span className="truncate">{usuario.email}</span>
                  </div>
                )}
                {usuario.telefone && (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4 flex-shrink-0" />
                    <span>{usuario.telefone}</span>
                  </div>
                )}
              </div>

              {/* Perfil de Acesso */}
              <div className="lg:w-40">
                {usuario.perfil ? (
                  <span 
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium"
                    style={{ 
                      backgroundColor: `${usuario.perfil.cor}20`, 
                      color: usuario.perfil.cor 
                    }}
                  >
                    {usuario.perfil.is_admin && <ShieldCheck className="w-4 h-4" />}
                    {usuario.perfil.nome}
                  </span>
                ) : (
                  <span className="text-gray-400 text-sm">Não definido</span>
                )}
              </div>

              {/* Status de Acesso */}
              <div className="lg:w-28">
                <button
                  onClick={() => toggleAcessoMutation.mutate({ 
                    id: usuario.id, 
                    pode_acessar: !usuario.pode_acessar_sistema 
                  })}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium transition-colors w-full justify-center ${
                    usuario.pode_acessar_sistema
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {usuario.pode_acessar_sistema ? (
                    <>
                      <UserCheck className="w-4 h-4" />
                      Ativo
                    </>
                  ) : (
                    <>
                      <UserX className="w-4 h-4" />
                      Inativo
                    </>
                  )}
                </button>
              </div>

              {/* Botão de Configurar */}
              <div className="lg:w-auto">
                <Link
                  to={`/usuarios/${usuario.id}`}
                  className="btn btn-secondary flex items-center gap-2 justify-center w-full lg:w-auto"
                >
                  <Settings className="w-4 h-4" />
                  Configurar Acesso
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {usuariosFiltrados.length === 0 && (
        <div className="card text-center py-12">
          <Users className="w-12 h-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">Nenhum usuário encontrado</p>
        </div>
      )}

      {/* Legenda */}
      <div className="card">
        <h4 className="font-medium text-gray-900 mb-3">Perfis de Acesso</h4>
        <div className="flex flex-wrap gap-3">
          {perfis?.map((perfil) => (
            <div 
              key={perfil.id}
              className="flex items-center gap-2 px-3 py-1 rounded-full text-sm"
              style={{ backgroundColor: `${perfil.cor}20`, color: perfil.cor }}
            >
              {perfil.is_admin && <ShieldCheck className="w-4 h-4" />}
              <span className="font-medium">{perfil.nome}</span>
              <span className="text-xs opacity-75">- {perfil.descricao}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Usuarios
