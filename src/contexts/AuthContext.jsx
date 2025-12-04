import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [userProfile, setUserProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true

    const getSession = async () => {
      try {
        // Timeout de 5 segundos para não ficar carregando infinitamente
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )

        const sessionPromise = supabase.auth.getSession()

        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        
        if (mounted) {
          setUser(session?.user ?? null)
          
          // Carrega perfil em background, não bloqueia o loading
          if (session?.user) {
            loadUserProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
      } finally {
        // SEMPRE seta loading false, independente de erro
        if (mounted) {
          setLoading(false)
        }
      }
    }

    getSession()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state changed:', event)
      
      if (mounted) {
        setUser(session?.user ?? null)
        
        if (session?.user) {
          loadUserProfile(session.user.id)
        } else {
          setUserProfile(null)
        }
        
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const loadUserProfile = async (authId) => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, perfil:perfis(*)')
        .eq('auth_id', authId)
        .maybeSingle()
      
      if (error) {
        console.warn('Tabela usuarios não encontrada ou erro:', error.message)
        // Se não tem tabela usuarios, usa os dados do auth
        return
      }
      
      setUserProfile(data)
    } catch (err) {
      console.warn('Erro ao carregar perfil (ignorado):', err)
      // Não bloqueia se der erro - perfil é opcional
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  }

  const signUp = async (email, password, nome) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome } },
    })
    if (error) throw error

    // Tenta criar registro na tabela usuarios (se existir)
    if (data.user) {
      try {
        const { data: perfis } = await supabase
          .from('perfis')
          .select('id')
          .eq('nome', 'Administrador')
          .maybeSingle()

        if (perfis) {
          await supabase.from('usuarios').insert({
            auth_id: data.user.id,
            email: email,
            nome: nome,
            perfil_id: perfis.id,
          })
        }
      } catch (err) {
        console.warn('Não foi possível criar perfil de usuário:', err)
        // Continua mesmo sem criar - o login ainda funciona
      }
    }
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setUser(null)
    setUserProfile(null)
  }

  const resetPassword = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email)
    if (error) throw error
  }

  const value = {
    user,
    userProfile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    loadUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
