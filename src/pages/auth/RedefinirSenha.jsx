import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Lock, Loader2, CheckCircle } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import toast from 'react-hot-toast'

const RedefinirSenha = () => {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    // Verifica se há uma sessão de recuperação de senha
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        toast.error('Link inválido ou expirado')
        navigate('/login')
      }
    }
    checkSession()
  }, [navigate])

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
      toast.success('Senha redefinida com sucesso!')
      
      // Aguarda 2 segundos e redireciona
      setTimeout(() => {
        navigate('/login')
      }, 2000)
    } catch (error) {
      console.error('Erro ao redefinir senha:', error)
      toast.error('Erro ao redefinir senha. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Senha Redefinida!</h2>
            <p className="text-gray-600">
              Sua senha foi alterada com sucesso. Redirecionando para o login...
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Nova Senha</h2>
            <p className="text-gray-600 mt-2">
              Digite sua nova senha abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Nova Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="Mínimo 6 caracteres"
                  required
                  minLength={6}
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
                  <Lock className="w-5 h-5" />
                  Redefinir Senha
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default RedefinirSenha
