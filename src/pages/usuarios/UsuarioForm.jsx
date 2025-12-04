import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { 
  ArrowLeft, 
  Save, 
  Loader2,
  User,
  Shield,
  ShieldCheck,
  Key,
  Check,
  X,
  AlertTriangle
} from 'lucide-react'
import toast from 'react-hot-toast'

const UsuarioForm = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    email_login: '',
    telefone: '',
    perfil_id: '',
    pode_acessar_sistema: true
  })

  const [criarCredenciais, setCriarCredenciais] = useState(false)

  // Buscar colaborador existente
  const { data: colaborador, isLoading: loadingColaborador } = useQuery({
    queryKey: ['colaborador-usuario', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('colaboradores')
        .select(`
          *,
          perfil:perfis_acesso(*)
        `)
        .eq('id', id)
        .single()
      if (error) throw error
      return data
    },
    enabled: !!id
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

  // Buscar permissões do perfil selecionado
  const { data: permissoesPerfil } = useQuery({
    queryKey: ['permissoes-perfil', formData.perfil_id],
    queryFn: async () => {
      if (!formData.perfil_id) return []
      const { data, error } = await supabase
        .from('permissoes')
        .select('*')
        .eq('perfil_id', formData.perfil_id)
      if (error) throw error
      return data
    },
    enabled: !!formData.perfil_id
  })

  // Preencher form
  useEffect(() => {
    if (colaborador) {
      setFormData({
        nome: colaborador.nome || '',
        email: colaborador.email || '',
        email_login: colaborador.email_login || colaborador.email || '',
        telefone: colaborador.telefone || '',
        perfil_id: colaborador.perfil_id || '',
        pode_acessar_sistema: colaborador.pode_acessar_sistema ?? true
      })
    }
  }, [colaborador])

  // Mutation para salvar
  const salvarMutation = useMutation({
    mutationFn: async (dados) => {
      const { error } = await supabase
        .from('colaboradores')
        .update({
          email_login: dados.email_login,
          perfil_id: dados.perfil_id || null,
          pode_acessar_sistema: dados.pode_acessar_sistema
        })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      toast.success('Acesso configurado!')
      queryClient.invalidateQueries(['usuarios-sistema'])
      navigate('/usuarios')
    },
    onError: (error) => {
      console.error('Erro ao salvar:', error)
      toast.error('Erro ao salvar: ' + error.message)
    }
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!formData.perfil_id) {
      toast.error('Selecione um perfil de acesso')
      return
    }

    salvarMutation.mutate(formData)
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const perfilSelecionado = perfis?.find(p => p.id === formData.perfil_id)

  const modulosLabels = {
    dashboard: 'Dashboard',
    ordens_servico: 'Ordens de Serviço',
    calendario: 'Calendário',
    financeiro: 'Financeiro',
    relatorios: 'Relatórios',
    colaboradores: 'Colaboradores',
    clientes: 'Clientes',
    equipes: 'Equipes',
    servicos: 'Serviços',
    veiculos: 'Veículos',
    empresas: 'Empresas',
    usuarios: 'Usuários'
  }

  if (loadingColaborador) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!colaborador && id) {
    return (
      <div className="text-center py-20">
        <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-4" />
        <p className="text-gray-600">Colaborador não encontrado</p>
        <button 
          onClick={() => navigate('/usuarios')} 
          className="btn btn-primary mt-4"
        >
          Voltar
        </button>
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Configurar Acesso
          </h1>
          {colaborador && (
            <p className="text-gray-600">{colaborador.nome}</p>
          )}
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dados do Usuário */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Dados do Usuário
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome
              </label>
              <input
                type="text"
                value={formData.nome}
                className="input bg-gray-50"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">
                Edite os dados pessoais em Colaboradores
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email para Login *
              </label>
              <input
                type="email"
                name="email_login"
                value={formData.email_login}
                onChange={handleChange}
                className="input"
                placeholder="email@empresa.com"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Telefone
              </label>
              <input
                type="text"
                value={formData.telefone}
                className="input bg-gray-50"
                disabled
              />
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                name="pode_acessar_sistema"
                id="pode_acessar_sistema"
                checked={formData.pode_acessar_sistema}
                onChange={handleChange}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="pode_acessar_sistema" className="text-sm font-medium text-gray-700">
                Pode acessar o sistema
              </label>
            </div>
          </div>
        </div>

        {/* Perfil de Acesso */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Perfil de Acesso
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {perfis?.map((perfil) => (
              <label
                key={perfil.id}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-colors ${
                  formData.perfil_id === perfil.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="perfil_id"
                  value={perfil.id}
                  checked={formData.perfil_id === perfil.id}
                  onChange={handleChange}
                  className="sr-only"
                />
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: perfil.cor }}
                      />
                      <span className="font-medium text-gray-900">{perfil.nome}</span>
                      {perfil.is_admin && (
                        <ShieldCheck className="w-4 h-4 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{perfil.descricao}</p>
                  </div>
                  {formData.perfil_id === perfil.id && (
                    <Check className="w-5 h-5 text-blue-500" />
                  )}
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Permissões do Perfil */}
        {perfilSelecionado && (
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5" />
              Permissões do Perfil: {perfilSelecionado.nome}
              {perfilSelecionado.is_admin && (
                <span className="text-sm font-normal text-red-600 bg-red-50 px-2 py-1 rounded">
                  Acesso Total
                </span>
              )}
            </h3>

            {perfilSelecionado.is_admin ? (
              <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg text-red-700">
                <AlertTriangle className="w-5 h-5" />
                <p>Este perfil tem acesso total a todos os módulos do sistema.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Módulo</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Visualizar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Criar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Editar</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Excluir</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Exportar</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {permissoesPerfil?.map((perm) => (
                      <tr key={perm.modulo} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-medium text-gray-900">
                          {modulosLabels[perm.modulo] || perm.modulo}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {perm.visualizar ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {perm.criar ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {perm.editar ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {perm.excluir ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                        <td className="px-4 py-2 text-center">
                          {perm.exportar ? (
                            <Check className="w-5 h-5 text-green-500 mx-auto" />
                          ) : (
                            <X className="w-5 h-5 text-gray-300 mx-auto" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <p className="text-sm text-gray-500 mt-4">
              Para alterar as permissões deste perfil, acesse a página de{' '}
              <a href="/usuarios/perfis" className="text-blue-600 hover:underline">
                Perfis de Acesso
              </a>
            </p>
          </div>
        )}

        {/* Credenciais */}
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Key className="w-5 h-5" />
            Credenciais de Acesso
          </h3>

          <div className="p-4 bg-yellow-50 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-yellow-800 font-medium">Informação sobre login</p>
                <p className="text-yellow-700 text-sm mt-1">
                  O usuário usará o email de login configurado acima para acessar o sistema.
                  As credenciais são gerenciadas pelo Supabase Authentication.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="criar_credenciais"
                checked={criarCredenciais}
                onChange={(e) => setCriarCredenciais(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300"
              />
              <label htmlFor="criar_credenciais" className="text-sm font-medium text-gray-700">
                Enviar convite por email para criar senha
              </label>
            </div>

            {criarCredenciais && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-blue-800 text-sm">
                  Um email será enviado para <strong>{formData.email_login}</strong> com um link para criar a senha de acesso.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate('/usuarios')}
            className="btn btn-secondary"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={salvarMutation.isPending}
            className="btn btn-primary flex items-center gap-2"
          >
            {salvarMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            Salvar
          </button>
        </div>
      </form>
    </div>
  )
}

export default UsuarioForm
