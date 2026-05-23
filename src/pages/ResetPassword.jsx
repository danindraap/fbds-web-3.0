// src/pages/ResetPassword.jsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import NetworkBackground from '../components/NetworkBackground'
import s from './auth.module.css'

function getStrength(pw) {
  let score = 0
  if (pw.length >= 8)          score++
  if (/[A-Z]/.test(pw))        score++
  if (/[0-9]/.test(pw))        score++
  if (/[^A-Za-z0-9]/.test(pw)) score++
  return score
}
const STRENGTH_MAP = {
  0: { w: '0%',   color: '#e2e5eb', label: '' },
  1: { w: '25%',  color: '#dc2626', label: 'Lemah' },
  2: { w: '50%',  color: '#d97706', label: 'Cukup' },
  3: { w: '75%',  color: '#2563eb', label: 'Kuat' },
  4: { w: '100%', color: '#16a34a', label: 'Sangat Kuat' },
}

export default function ResetPassword() {
  const { updatePassword } = useAuth()
  const navigate           = useNavigate()

  const [password, setPassword]   = useState('')
  const [confirm, setConfirm]     = useState('')
  const [showPw, setShowPw]       = useState(false)
  const [showCf, setShowCf]       = useState(false)
  const [loading, setLoading]     = useState(false)
  const [error, setError]         = useState('')
  const [success, setSuccess]     = useState(false)
  const [validSession, setValid]  = useState(false)

  // Supabase mengirim token di URL hash (#access_token=...)
  // onAuthStateChange akan mendeteksi event PASSWORD_RECOVERY
  useEffect(() => {
    const hash = window.location.hash
    const query = new URLSearchParams(window.location.search)
    if (hash.includes('type=recovery') || query.has('code') || hash.includes('access_token')) {
      setValid(true)
    }

    // Cek apakah sesi sudah terbentuk di latar belakang (Mencegah bug URL cepat bersih di Supabase)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setValid(true)
    })

    // Dengarkan event asli dari Supabase
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY' || session) setValid(true)
    })
    return () => subscription.unsubscribe()
  }, [])

  const strength     = getStrength(password)
  const strengthInfo = STRENGTH_MAP[strength]

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!password)               return setError('Password wajib diisi.')
    if (password.length < 8)     return setError('Password minimal 8 karakter.')
    if (password !== confirm)    return setError('Password tidak cocok.')

    setLoading(true)
    const { error: err } = await updatePassword(password)
    setLoading(false)

    if (err) { setError(err.message); return }
    setSuccess(true)
    setTimeout(() => navigate('/dashboard'), 2500)
  }

  if (!validSession) {
    return (
      <div className={s.page}>
        <NetworkBackground />
          <div className={s.card} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <AlertCircle size={26} style={{ color: '#dc2626' }} />
            </div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Link Tidak Valid</h2>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 20 }}>Link reset password tidak valid atau sudah kedaluwarsa.</p>
            <button className={s.submitBtn} onClick={() => navigate('/forgot-password')}>
              Minta Link Baru
            </button>
          </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={s.page}>
        <NetworkBackground />
          <div className={s.card} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={26} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Password Diperbarui!</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)' }}>Mengalihkan ke dashboard...</p>
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
              <div className={s.logoTagline}>Fake BTS Detection <br/> System</div>
            </div>
          </div>

          <h1 className={s.heading}>Buat password baru</h1>
          <p className={s.subheading}>Masukkan password baru untuk akunmu.</p>

          {error && (
            <div className={s.errorBanner}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className={s.formGroup}>
              <label className={s.label}>Password Baru</label>
              <div className={s.inputWrap}>
                <input className={s.input} type={showPw ? 'text' : 'password'}
                  placeholder="Min. 8 karakter" value={password}
                  onChange={e => setPassword(e.target.value)} autoFocus />
                <button type="button" className={s.eyeBtn} onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {password && (
                <div className={s.strengthWrap}>
                  <div className={s.strengthBar}>
                    <div className={s.strengthFill} style={{ width: strengthInfo.w, background: strengthInfo.color }} />
                  </div>
                  <div className={s.strengthLabel} style={{ color: strengthInfo.color }}>
                    {strengthInfo.label && `Kekuatan: ${strengthInfo.label}`}
                  </div>
                </div>
              )}
            </div>

            <div className={s.formGroup}>
              <label className={s.label}>Konfirmasi Password</label>
              <div className={s.inputWrap}>
                <input className={s.input} type={showCf ? 'text' : 'password'}
                  placeholder="Ulangi password baru" value={confirm}
                  onChange={e => setConfirm(e.target.value)} />
                <button type="button" className={s.eyeBtn} onClick={() => setShowCf(v => !v)} tabIndex={-1}>
                  {showCf ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button className={s.submitBtn} type="submit" disabled={loading}>
              {loading ? <><div className={s.btnSpinner} /> Menyimpan...</> : 'Simpan Password Baru'}
            </button>
          </form>
        </div>
    </div>
  )
}
