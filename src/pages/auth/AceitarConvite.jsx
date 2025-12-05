import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Loader2, CheckCircle, XCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const AceitarConvite = () => {
  const [searchParams] = useSearchParams()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState(null)
  const [userEmail, setUserEmail] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica o token do convite
    const verifyInvite = async () => {
      try {
        // O Supabase redireciona com hash params para convites
        const hashParams = new URLSearchParams(window.location.hash.substring(1))
        const accessToken = hashParams.get('access_token')
        const type = hashParams.get('type')

        if (type === 'invite' || type === 'recovery' || type === 'signup') {
          if (accessToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: hashParams.get('refresh_token') || ''
            })

            if (error) throw error

            if (data.user) {
              setUserEmail(data.user.email || '')
              setVerifying(false)
              return
            }
          }
        }

        // Tenta pegar sessão existente
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setUserEmail(session.user.email || '')
          setVerifying(false)
          return
        }

        setError('Link de convite inválido ou expirado.')
        setVerifying(false)
      } catch (err) {
        console.error('Erro ao verificar convite:', err)
        setError('Link de convite inválido ou expirado.')
        setVerifying(false)
      }
    }

    verifyInvite()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres')
      return
    }

    if (password !== confirmPassword) {
      toast.error('As senhas não conferem')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error

      setSuccess(true)
      toast.success('Conta ativada com sucesso!')
      
      // Aguarda 2 segundos e redireciona
      setTimeout(() => {
        navigate('/')
      }, 2000)
    } catch (error) {
      console.error('Erro ao criar senha:', error)
      toast.error('Erro ao criar senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  // Loading
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando convite...</p>
        </div>
      </div>
    )
  }

  // Erro
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Convite Inválido</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="btn-primary"
            >
              Ir para Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Sucesso
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Conta Ativada!</h2>
            <p className="text-gray-600">
              Bem-vindo ao SolarSync! Redirecionando...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Formulário
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-2xl">☀️</span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Bem-vindo ao SolarSync!</h2>
            <p className="text-gray-600 mt-2">
              Crie sua senha para acessar o sistema.
            </p>
            {userEmail && (
              <p className="text-sm text-blue-600 mt-2 font-medium">
                {userEmail}
              </p>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Criar Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">Confirmar Senha</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Digite novamente"
                required
              />
            </div>

            {/* Indicador de força da senha */}
            <div className="space-y-2">
              <div className="flex gap-1">
                <div className={`h-1 flex-1 rounded ${password.length >= 2 ? 'bg-red-500' : 'bg-gray-200'}`} />
                <div className={`h-1 flex-1 rounded ${password.length >= 4 ? 'bg-yellow-500' : 'bg-gray-200'}`} />
                <div className={`h-1 flex-1 rounded ${password.length >= 6 ? 'bg-green-500' : 'bg-gray-200'}`} />
                <div className={`h-1 flex-1 rounded ${password.length >= 8 ? 'bg-green-600' : 'bg-gray-200'}`} />
              </div>
              <p className="text-xs text-gray-500">
                {password.length < 6 ? 'Senha fraca - mínimo 6 caracteres' : 
                 password.length < 8 ? 'Senha média' : 'Senha forte'}
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Ativar Minha Conta
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AceitarConvite
