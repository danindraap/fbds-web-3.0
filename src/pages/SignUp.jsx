// src/pages/SignUp.jsx
import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
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

// Fungsi untuk merapikan teks menjadi Title Case (Huruf besar di awal kata)
function formatRoleTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    const lower = txt.toLowerCase();
    // Pengecualian untuk singkatan khusus agar tetap kapital semua
    if (['it', 'noc', 'bts', 'rf', 'ip', 'lte', '5g', 'sqa', 'ran'].includes(lower)) return lower.toUpperCase();
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

export default function SignUp() {
  const { signUp }  = useAuth()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    fullName: '', operatorId: '',
    email: '', password: '', confirmPassword: ''
  })
  const [showPw, setShowPw]         = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agree, setAgree]           = useState(false)
  const [loading, setLoading]       = useState(false)
  const [error, setError]           = useState('')
  const [success, setSuccess]       = useState(false)
  const [fieldErrors, setFieldErrors] = useState({})

  const set = (k) => (e) => {
    setForm(f => ({ ...f, [k]: e.target.value }))
    if (fieldErrors[k]) setFieldErrors(fe => ({ ...fe, [k]: '' }))
  }

  const strength     = getStrength(form.password)
  const strengthInfo = STRENGTH_MAP[strength]

  function validate() {
    const errs = {}
    if (!form.fullName.trim())           errs.fullName = 'Nama lengkap wajib diisi.'
    if (!form.operatorId.trim())         errs.operatorId = 'ID Operator wajib diisi.'
    if (!form.email.trim())              errs.email = 'Email wajib diisi.'
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Format email tidak valid.'
    if (!form.password)                  errs.password = 'Password wajib diisi.'
    else if (form.password.length < 8)   errs.password = 'Password minimal 8 karakter.'
    if (form.password !== form.confirmPassword) errs.confirmPassword = 'Password tidak cocok.'
    if (!agree)                          errs.agree = 'Kamu harus menyetujui syarat & ketentuan.'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }

    setLoading(true)
    const { error: err } = await signUp({
      email:      form.email,
      password:   form.password,
      fullName:   form.fullName,
      operatorId: form.operatorId,
      role:       'USER',
    })
    setLoading(false)

    if (err) {
      const msg = {
        'User already registered': 'Email ini sudah terdaftar.',
        'Password should be at least 6 characters': 'Password minimal 6 karakter.',
      }
      setError(msg[err.message] || err.message)
      return
    }

    // Supabase by default kirim konfirmasi email
    setSuccess(true)
  }

  if (success) {
    return (
      <div className={s.page}>
        <NetworkBackground />
          <div className={s.card} style={{ textAlign: 'center' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <CheckCircle size={26} style={{ color: '#16a34a' }} />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 8 }}>Registrasi Berhasil!</h2>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.65, marginBottom: 24 }}>
              Kami telah mengirimkan email konfirmasi ke <strong>{form.email}</strong>.
              Silakan cek inbox dan klik link konfirmasi sebelum login.
            </p>
            <button className={s.submitBtn} onClick={() => navigate('/login')}>
              Ke Halaman Login
            </button>
          </div>
      </div>
    )
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

          <h1 className={s.heading}>Buat akun baru</h1>
          <p className={s.subheading}>Daftarkan diri untuk mengakses sistem monitoring.</p>

          {error && (
            <div className={s.errorBanner}>
              <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
              {error}
            </div>
          )}

          <style>{`
            @media (max-width: 500px) {
              .responsive-row { display: flex !important; flex-direction: column !important; }
            }
          `}</style>

          <form onSubmit={handleSubmit} noValidate>
            {/* Nama + ID Operator */}
            <div className={`${s.formRow} responsive-row`}>
              <div className={s.formGroup}>
                <label className={s.label}>Nama Lengkap</label>
                <input className={`${s.input} ${fieldErrors.fullName ? s.error : ''}`}
                  type="text" placeholder="Rifki Ardi Priadi"
                  value={form.fullName} onChange={set('fullName')} 
                  onBlur={() => setForm(f => ({ ...f, fullName: formatRoleTitleCase(f.fullName) }))} />
                {fieldErrors.fullName && <span className={s.fieldError}>{fieldErrors.fullName}</span>}
              </div>
              <div className={s.formGroup}>
                <label className={s.label}>ID Operator</label>
                <input className={`${s.input} ${fieldErrors.operatorId ? s.error : ''}`}
                  type="text" placeholder="110122XXXX"
                  value={form.operatorId} onChange={set('operatorId')} />
                {fieldErrors.operatorId && <span className={s.fieldError}>{fieldErrors.operatorId}</span>}
              </div>
            </div>

            {/* Email */}
            <div className={s.formGroup}>
              <label className={s.label}>Email</label>
              <input className={`${s.input} ${fieldErrors.email ? s.error : ''}`}
                type="email" placeholder="rifki@gmail.com"
                value={form.email} onChange={set('email')} autoComplete="email" />
              {fieldErrors.email && <span className={s.fieldError}>{fieldErrors.email}</span>}
            </div>

            {/* Password */}
            <div className={s.formGroup}>
              <label className={s.label}>Password</label>
              <div className={s.inputWrap}>
                <input className={`${s.input} ${fieldErrors.password ? s.error : ''}`}
                  type={showPw ? 'text' : 'password'} placeholder="Min. 8 karakter"
                  value={form.password} onChange={set('password')} autoComplete="new-password" />
                <button type="button" className={s.eyeBtn} onClick={() => setShowPw(v => !v)} tabIndex={-1}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.password && <span className={s.fieldError}>{fieldErrors.password}</span>}
              {form.password && (
                <div className={s.strengthWrap}>
                  <div className={s.strengthBar}>
                    <div className={s.strengthFill} style={{ width: strengthInfo.w, background: strengthInfo.color }} />
                  </div>
                  <div className={s.strengthLabel} style={{ color: strengthInfo.color }}>
                    {strengthInfo.label && `Kekuatan password: ${strengthInfo.label}`}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <div className={s.formGroup}>
              <label className={s.label}>Konfirmasi Password</label>
              <div className={s.inputWrap}>
                <input className={`${s.input} ${fieldErrors.confirmPassword ? s.error : ''}`}
                  type={showConfirm ? 'text' : 'password'} placeholder="Ulangi password"
                  value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" />
                <button type="button" className={s.eyeBtn} onClick={() => setShowConfirm(v => !v)} tabIndex={-1}>
                  {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {fieldErrors.confirmPassword && <span className={s.fieldError}>{fieldErrors.confirmPassword}</span>}
            </div>

            {/* Terms checkbox */}
            <label className={s.checkRow}>
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} />
              <span>
                Saya menyetujui{' '}
                <a href="#" onClick={e => e.preventDefault()}>syarat & ketentuan</a>
                {' '}penggunaan sistem.
              </span>
            </label>
            {fieldErrors.agree && <div className={s.fieldError} style={{ marginTop: -10, marginBottom: 10 }}>{fieldErrors.agree}</div>}

            <button className={s.submitBtn} type="submit" disabled={loading}>
              {loading ? <><div className={s.btnSpinner} /> Mendaftar...</> : 'Daftar Sekarang'}
            </button>
          </form>

          <p className={s.footerText}>
            Sudah punya akun? <Link to="/login">Login</Link>
          </p>
        </div>
    </div>
  )
}
