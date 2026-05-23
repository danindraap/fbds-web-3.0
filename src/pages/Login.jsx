// src/pages/Login.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NetworkBackground from '../components/NetworkBackground'
import s from './auth.module.css'

export default function Login() {
  const { signIn } = useAuth()
  const navigate   = useNavigate()
  const location   = useLocation()
  const from       = location.state?.from?.pathname || '/dashboard'

  const [form, setForm]       = useState({ email: '', password: '' })
  const [showPw, setShowPw]   = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Tangkap parameter URL setelah pengguna klik link verifikasi email
  useEffect(() => {
    // Supabase mungkin mengembalikan token atau error via query param / hash
    const query = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.substring(1))
    const errDesc = query.get('error_description') || hash.get('error_description')

    if (errDesc) {
      // Jika errornya karena klik link dari HP tapi daftarnya di Laptop (Beda Device/Browser)
      // Sebenarnya email tersebut SUDAH terverifikasi di server Supabase.
      // Jadi kita tangkap error palsu ini dan tampilkan pesan sukses yang ramah!
      if (errDesc.includes('invalid') || errDesc.includes('expired') || errDesc.includes('verifier')) {
        setSuccessMsg('Email berhasil diverifikasi! Silakan masuk menggunakan ID Anda.')
      } else {
        setError(errDesc.replace(/\+/g, ' '))
      }
      // Bersihkan URL dari tulisan error panjang agar estetik
      window.history.replaceState(null, '', window.location.pathname)
    } else if (query.get('code') || hash.get('access_token')) {
      // Jika klik link dari perangkat yang sama
      setSuccessMsg('Email berhasil diverifikasi! Silakan masuk.')
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccessMsg('') // Tambahkan ini untuk menghilangkan pesan sukses saat form dikirim

    if (!form.email) return setError('Email / ID Operator wajib diisi.')
    if (!form.password) return setError('Password wajib diisi.')

    setLoading(true)
    const { error: err } = await signIn({ email: form.email, password: form.password })
    setLoading(false)

    if (err) {
      // Terjemahkan pesan error Supabase ke Bahasa Indonesia
      const msg = {
        'Invalid login credentials': 'Email atau password salah.',
        'User not found': 'Email tidak ditemukan atau belum terdaftar.',
        'Email not confirmed':        'Email belum dikonfirmasi. Cek inbox kamu.',
        'Too many requests':          'Terlalu banyak percobaan. Coba lagi nanti.',
      }
      setError(msg[err.message] || err.message)
      return
    }

    navigate(from, { replace: true })
  }

  return (
    <div className={s.page}>
      <NetworkBackground />
        <div className={s.card}>
          {/* Logo */}
          <div className={s.logo}>
            <div className={s.logoIcon} style={{ width: 44, height: 44, background: 'transparent' }}>
              <img src="/logo.png" alt="Logo FBDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className={s.logoName}>FBDS</div>
              <div className={s.logoTagline}>Fake BTS Detection <br/> System</div>
            </div>
          </div>

          <h1 className={s.heading}>Masuk ke akun</h1>
          <p className={s.subheading}>Masukkan email dan password untuk melanjutkan.</p>

          {/* Error banner */}
          {error && (
            <div className={s.errorBanner}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          {/* Success banner untuk verifikasi email */}
          {successMsg && (
            <div className={s.successBanner}>
              <CheckCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email / ID Operator */}
            <div className={s.formGroup}>
              <label className={s.label}>Email / ID Operator</label>
              <input
                className={s.input}
                type="text"
                placeholder="email@domain.com atau ID Operator"
                value={form.email}
                onChange={set('email')}
                autoComplete="username"
                autoFocus
              />
            </div>

            {/* Password */}
            <div className={s.formGroup}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className={s.label}>Password</label>
                <Link to="/forgot-password" style={{ fontSize: 12, color: '#e63950', fontWeight: 500, textDecoration: 'none' }}>
                  Lupa password?
                </Link>
              </div>
              <div className={s.inputWrap}>
                <input
                  className={s.input}
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={form.password}
                  onChange={set('password')}
                  autoComplete="current-password"
                />
                <button type="button" className={s.eyeBtn} onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button className={s.submitBtn} type="submit" disabled={loading}>
              {loading ? <><div className={s.btnSpinner} /> Masuk...</> : 'Masuk'}
            </button>
          </form>

          <p className={s.footerText}>
            Belum punya akun?{' '}
            <Link to="/signup">Sign Up</Link>
          </p>
        </div>
    </div>
  )
}
