// PREPARADO PARA O CUTOVER — NÃO IMPORTADO/CONECTADO AINDA.
// Substituirá ColaboradorLogin.jsx no momento da virada (ver
// docs/remediacao-seguranca-2026-06-01.md). Diferenças vs o login antigo:
//  - NÃO baixa a lista de colaboradores/CPFs pro navegador.
//  - Usa sessão real do Supabase Auth (signInWithPassword), o que faz a RLS
//    finalmente proteger os dados.
//  - CPF vira só o identificador: o email de auth é derivado localmente do CPF
//    (colab.<digitos>@gestao-obras.local). Senha é uma senha real (inicial = CPF
//    no provisionamento; gestor troca depois no cadastro).
// Requer: colaboradores provisionados no Auth (scripts/provisionar-colaboradores.mjs)
// e colaboradores.auth_user_id preenchido.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { User, Lock, Loader2, Sun, HardHat } from 'lucide-react'
import toast from 'react-hot-toast'

// Mesmo esquema usado no provisionamento — manter idêntico nos dois lados.
export const emailDoColaborador = (cpf) =>
  `colab.${(cpf || '').replace(/\D/g, '')}@gestao-obras.local`

const ColaboradorLogin = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [cpf, setCpf] = useState('')
  const [senha, setSenha] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault()
    const cpfDigits = cpf.replace(/\D/g, '')
    if (!cpfDigits || !senha) {
      toast.error('Preencha CPF e senha')
      return
    }
    setLoading(true)
    try {
      const email = emailDoColaborador(cpfDigits)
      const { data: auth, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })
      if (error || !auth?.user) {
        throw new Error('CPF ou senha inválidos.')
      }

      // Carrega o próprio registro (RLS permite a própria linha via auth_user_id).
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('id, nome, email, foto_url')
        .eq('auth_user_id', auth.user.id)
        .maybeSingle()

      // Mantém o contrato que o MinhasOS já consome (localStorage).
      localStorage.setItem('colaborador_logado', JSON.stringify({
        id: colaborador?.id || null,
        nome: colaborador?.nome || null,
        email: colaborador?.email || null,
        foto_url: colaborador?.foto_url || null,
      }))

      toast.success(`Bem-vindo, ${colaborador?.nome || ''}!`)
      navigate('/colaborador/minhas-os')
    } catch (err) {
      toast.error(err.message || 'Erro ao fazer login')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-white rounded-2xl mx-auto flex items-center justify-center shadow-lg mb-4">
            <Sun className="w-12 h-12 text-yellow-500" />
          </div>
          <h1 className="text-2xl font-bold text-white">Gestão de Obras</h1>
          <p className="text-blue-200 mt-1">Acesso do Colaborador</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <HardHat className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900">Entrar</h2>
              <p className="text-xs text-gray-500">Use seu CPF e senha</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CPF</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Só números"
                  inputMode="numeric"
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
                  placeholder="Sua senha"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Na primeira vez, a senha é o seu CPF (só números).</p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (<><Loader2 className="w-5 h-5 animate-spin" />Entrando...</>) : 'Entrar'}
            </button>
          </form>
        </div>

        <div className="text-center mt-6">
          <button onClick={() => navigate('/login')} className="text-blue-200 hover:text-white text-sm">
            Acesso do Gestor →
          </button>
        </div>
      </div>
    </div>
  )
}

export default ColaboradorLogin
