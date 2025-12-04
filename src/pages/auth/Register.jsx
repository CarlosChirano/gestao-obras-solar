import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, Loader2 } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

const Register = () => {
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signUp } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await signUp(email, password, nome)
      toast.success('Conta criada! Verifique seu e-mail.')
      navigate('/login')
    } catch (error) {
      toast.error('Erro ao criar conta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Criar conta</h2>
      <p className="text-gray-600 mb-8">Preencha os dados para se cadastrar.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="label">Nome</label>
          <input type="text" value={nome} onChange={(e) => setNome(e.target.value)} className="input-field" placeholder="Seu nome" required />
        </div>
        <div>
          <label className="label">E-mail</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input-field" placeholder="seu@email.com" required />
        </div>
        <div>
          <label className="label">Senha</label>
          <div className="relative">
            <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="input-field pr-10" placeholder="••••••••" required />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <><UserPlus className="w-5 h-5" /> Criar conta</>}
        </button>
      </form>

      <p className="text-center text-gray-600 mt-6">
        Já tem conta? <Link to="/login" className="text-primary-600 font-medium">Fazer login</Link>
      </p>
    </div>
  )
}

export default Register
