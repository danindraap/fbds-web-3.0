// src/context/AuthContext.jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [loading, setLoading] = useState(true) // true saat cek session awal

  useEffect(() => {
    // 1. Cek sesi awal dengan validasi ke server.
    // getUser() akan membaca dari localStorage DAN memverifikasinya.
    // Jika user sudah dihapus, ini akan langsung mengembalikan user null.
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setLoading(false)
    })

    // 2. Dengarkan perubahan state (login/logout dari tab lain, token refresh, dll)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false) // Pastikan loading selesai setelah event auth
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Auth actions ────────────────────────────────────────────────────────────

  async function signUp({ email, password, fullName, operatorId, role }) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, operator_id: operatorId, role: role || 'Operator' },
        // Arahkan user ke halaman login secara paksa setelah klik link dari email
        emailRedirectTo: `${window.location.origin}/login`,
      },
    })
    return { data, error }
  }

  async function signIn({ email, operatorId, identifier, password }) {
    // Ambil identifier apa pun yang dikirim dari form login
    let loginId = (email || operatorId || identifier || '').trim()

    // Jika input bukan format email (tidak mengandung @), anggap sebagai ID Operator
    if (!loginId.includes('@')) {
      // Cari email asli berdasarkan ID Operator melalui RPC
      const { data: foundEmail, error: rpcError } = await supabase.rpc('get_email_by_operator_id', { op_id: loginId })
      
      if (rpcError || !foundEmail) {
        return { error: { message: 'User not found' } }
      }
      // Ganti loginId dengan email yang ditemukan
      loginId = foundEmail
    }

    // Lakukan login menggunakan email (baik email inputan langsung atau hasil pencarian ID)
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginId, password })
    return { data, error }
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function resetPassword(email) {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    return { data, error }
  }

  async function updatePassword(newPassword) {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword })
    return { data, error }
  }

  const value = { user, loading, signUp, signIn, signOut, resetPassword, updatePassword }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
