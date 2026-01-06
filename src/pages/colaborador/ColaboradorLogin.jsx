import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { User, Lock, Loader2, Sun, HardHat } from 'lucide-react'
import toast from 'react-hot-toast'

const ColaboradorLogin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    
    if (!email || !senha) {
      toast.error('Preencha email e senha')
      return
    }

    setLoading(true)

    try {
      // Buscar colaborador pelo email
      const { data: colaborador, error } = await supabase
        .from('colaboradores')
        .select('id, nome, email, cpf, foto_url, ativo')
        .eq('email', email.toLowerCase().trim())
        .single()

      if (error || !colaborador) {
        throw new Error('Email não encontrado. Verifique com seu gestor.')
      }

      if (!colaborador.ativo) {
        throw new Error('Colaborador inativo. Entre em contato com seu gestor.')
      }

      // Verificar senha (CPF sem formatação)
      const cpfLimpo = colaborador.cpf?.replace(/\D/g, '') || ''
      const senhaLimpa = senha.replace(/\D/g, '')

      if (cpfLimpo !== senhaLimpa) {
        throw new Error('Senha incorreta. Use seu CPF como senha.')
      }

      // Login OK - salvar no localStorage
      localStorage.setItem('colaborador_logado', JSON.stringify({
        id: colaborador.id,
        nome: colaborador.nome,
        email: colaborador.email,
        foto_url: colaborador.foto_url
      }))

      toast.success(`Bem-vindo, ${colaborador.nome}!`)
      navigate('/colaborador/minhas-os')

    } catch (error) {
      console.error('Erro no login:', error)
      toast.error(error.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <Sun className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestão de Obras</h1>
          <p className="text-blue-200 mt-1">Acesso do Colaborador</p>
        </div>

        {/* Card de Login */}
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <HardHat className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Entrar</h2>
              <p className="text-xs text-gray-500">Use seu email cadastrado</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="seu@email.com"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Seu CPF (só números)"
                  inputMode="numeric"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Use seu CPF como senha (só números)</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Entrar'
              )}
            </button>
          </form>
        </div>

        {/* Link para gestor */}
        <div className="text-center mt-6">
          <button
            onClick={() => navigate('/login')}
            className="text-blue-200 hover:text-white text-sm"
          >
            Acesso do Gestor →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColaboradorLogin
