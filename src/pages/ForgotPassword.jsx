// src/pages/ForgotPassword.jsx
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { AlertCircle, CheckCircle, ArrowLeft } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import NetworkBackground from '../components/NetworkBackground'
import s from './auth.module.css'

export default function ForgotPassword() {
  const { resetPassword } = useAuth()
  const [email, setEmail]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [sent, setSent]       = useState(false)
  const [cooldown, setCooldown] = useState(0)

  // Cek apakah user sedang dalam masa hukuman (Rate Limit: Max 3 kali / Jam)
  useEffect(() => {
    const limitData = JSON.parse(localStorage.getItem('reset_limit')) || { count: 0, penaltyStart: null }
    const now = Date.now()
    const limitWindow = 5 * 60 * 1000 // 5 Menit dalam milidetik

    // Jika user sedang dihukum
    if (limitData.penaltyStart) {
      if (now - limitData.penaltyStart >= limitWindow) {
        localStorage.removeItem('reset_limit') // Masa hukuman selesai
      } else {
        const remainingMins = Math.ceil((limitWindow - (now - limitData.penaltyStart)) / 60000)
        setCooldown(remainingMins)
        setError(`Terlalu banyak permintaan. Sistem dikunci. Coba lagi dalam ${remainingMins} menit.`)
      }
    }
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (cooldown > 0) return setError(`Sistem terkunci sementara. Coba lagi dalam ${cooldown} menit.`)
    if (!email.trim()) return setError('Email wajib diisi.')
    if (!/\S+@\S+\.\S+/.test(email)) return setError('Format email tidak valid.')

    setLoading(true)
    const { error: err } = await resetPassword(email)
    setLoading(false)

    if (err) { 
      // Jika server Supabase menolak karena terlalu banyak request (Rate limit backend)
      if (err.message.includes('Too many requests') || err.status === 429) {
        return setError('Terlalu banyak permintaan ke server. Silakan coba lagi nanti.')
      }
      setError(err.message); 
      return 
    }

    // Catat percobaan ke localStorage
    const limitData = JSON.parse(localStorage.getItem('reset_limit')) || { count: 0, penaltyStart: null }
    limitData.count += 1
    
    // Jika ini adalah percobaan ke-3, jatuhkan hukuman 5 menit penuh terhitung dari SEKARANG
    if (limitData.count >= 3) {
      limitData.penaltyStart = Date.now()
    }
    localStorage.setItem('reset_limit', JSON.stringify(limitData))

    setSent(true)
  }

  if (sent) {
    return (
      <div className={s.page}>
        <NetworkBackground />
          <div className={s.card} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={26} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Email Terkirim!</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
              Link reset password telah dikirim ke <strong>{email}</strong>.
              Silakan cek inbox dan ikuti instruksinya.
            </p>
            <Link to="/login">
              <button className={s.submitBtn}>Kembali ke Login</button>
            </Link>
          </div>
      </div>
    )
  }

  return (
    <div className={s.page}>
      <NetworkBackground />
        <div className={s.card}>
          <div className={s.logo}>
            <div className={s.logoIcon} style={{ width: 44, height: 44, background: 'transparent' }}>
              <img src="/logo.png" alt="Logo FBDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            </div>
            <div>
              <div className={s.logoName}>FBDS</div>
              <div className={s.logoTagline}>Fake BTS Detection <br/> System </div>
            </div>
          </div>

          <h1 className={s.heading}>Lupa password?</h1>
          <p className={s.subheading}>Masukkan email terdaftar. Kami akan kirimkan link reset password.</p>

          {error && (
            <div className={s.errorBanner}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={s.formGroup}>
              <label className={s.label}>Email</label>
              <input
                className={s.input}
                type="email"
                placeholder="rifki@gmail.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoFocus
              />
            </div>
          <button className={s.submitBtn} type="submit" disabled={loading || cooldown > 0}>
              {loading ? <><div className={s.btnSpinner} /> Mengirim...</> : 'Kirim Link Reset'}
            </button>
          </form>

          <p className={s.footerText}>
            <Link to="/login" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <ArrowLeft size={13} /> Kembali ke Login
            </Link>
          </p>
        </div>
    </div>
  )
}
