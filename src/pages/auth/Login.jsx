import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, Loader2, Mail } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [sendingReset, setSendingReset] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signIn(email, password)
      toast.success('Login realizado com sucesso!')
      navigate('/')
    } catch (error) {
      console.error('Erro no login:', error)
      if (error.message.includes('Invalid login credentials')) {
        toast.error('E-mail ou senha incorretos')
      } else if (error.message.includes('Email not confirmed')) {
        toast.error('Confirme seu e-mail antes de fazer login')
      } else {
        toast.error('Erro ao fazer login. Tente novamente.')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async (e) => {
    e.preventDefault()
    if (!forgotEmail) {
      toast.error('Digite seu e-mail')
      return
    }
    
    setSendingReset(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/redefinir-senha`,
      })
      
      if (error) throw error
      
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.')
      setShowForgotPassword(false)
      setForgotEmail('')
    } catch (error) {
      console.error('Erro ao enviar e-mail:', error)
      toast.error('Erro ao enviar e-mail de recuperação')
    } finally {
      setSendingReset(false)
    }
  }

  // Modal de Esqueci Senha
  if (showForgotPassword) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">Recuperar Senha</h2>
              <p className="text-gray-600 mt-2">
                Digite seu e-mail e enviaremos um link para redefinir sua senha.
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="label">E-mail</label>
                <input
                  type="email"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="input-field"
                  placeholder="seu@email.com"
                  required
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={sendingReset}
                className="btn-primary w-full justify-center py-3"
              >
                {sendingReset ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Mail className="w-5 h-5" />
                    Enviar Link de Recuperação
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowForgotPassword(false)}
                className="w-full text-center text-gray-600 hover:text-gray-800 py-2"
              >
                Voltar para o login
              </button>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
              <span className="text-white text-2xl">☀️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">SolarSync</h1>
            <p className="text-gray-500 text-sm">Gestão de Obras Solares</p>
          </div>

          <h2 className="text-xl font-bold text-gray-900 mb-2">Bem-vindo!</h2>
          <p className="text-gray-600 mb-6">Entre com suas credenciais para acessar.</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div>
              <label className="label">Senha</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-10"
                  placeholder="••••••••"
                  required
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

            {/* Link Esqueci Senha */}
            <div className="text-right">
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                Esqueci minha senha
              </button>
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
                  <LogIn className="w-5 h-5" />
                  Entrar
                </>
              )}
            </button>
          </form>

          {/* Mensagem informativa */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-600 text-center">
              Não tem acesso? Solicite ao administrador do sistema.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-6">
          © 2024 SolarSync. Todos os direitos reservados.
        </p>
      </div>
    </div>
  )
}

export default Login
