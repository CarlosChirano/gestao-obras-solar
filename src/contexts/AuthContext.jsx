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
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), 5000)
        )
        const sessionPromise = supabase.auth.getSession()
        const { data: { session } } = await Promise.race([sessionPromise, timeoutPromise])
        
        if (mounted) {
          setUser(session?.user ?? null)
          if (session?.user) {
            loadUserProfile(session.user.id)
          }
        }
      } catch (error) {
        console.error('Erro ao verificar sessão:', error)
      } finally {
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
      // Tentar buscar de 'usuarios' primeiro (tabela original)
      const { data, error } = await supabase
        .from('usuarios')
        .select('*, perfil:perfis(*)')
        .eq('auth_id', authId)
        .maybeSingle()
      
      if (error) {
        console.warn('Tabela usuarios não encontrada ou erro:', error.message)
      }

      // Buscar também o colaborador vinculado para pegar o perfil_acesso com is_admin
      const { data: colaborador } = await supabase
        .from('colaboradores')
        .select('id, nome, perfil_id, perfil:perfis_acesso(id, nome, is_admin)')
        .eq('email', (await supabase.auth.getUser()).data?.user?.email)
        .maybeSingle()

      const profile = {
        ...(data || {}),
        nome: data?.nome || colaborador?.nome || null,
        colaborador_id: colaborador?.id || null,
        is_admin: colaborador?.perfil?.is_admin || false,
        perfil_acesso: colaborador?.perfil || null
      }

      setUserProfile(profile)
    } catch (err) {
      console.warn('Erro ao carregar perfil (ignorado):', err)
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

  // Helper: verificar se é superadmin
  const isSuperAdmin = userProfile?.is_admin === true

  const value = {
    user,
    userProfile,
    loading,
    isSuperAdmin,
    signIn,
    signUp,
    signOut,
    resetPassword,
    loadUserProfile,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
