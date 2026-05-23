import { useState, useRef, useEffect } from 'react'
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, Activity, Clock, BarChart2, FileText,
  Info, Bell, Radio, ChevronDown, User, LogOut, Building2,
  MapPin, Zap, Shield, Sun, Moon, Menu
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import styles from './Layout.module.css'
import { supabase } from '../lib/supabase' // Tambahkan import supabase

const NAV = [
  {
    section: 'Monitoring',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard Utama' },
      { to: '/live',      icon: Activity,         label: 'Live Monitoring', badge: 'LIVE', badgeColor: 'green' },
      { to: '/riwayat',   icon: Clock,            label: 'Riwayat Deteksi', badge: '3', badgeColor: 'red' },
    ]
  },
  {
    section: 'Analitik',
    items: [
      { to: '/analitik', icon: BarChart2, label: 'Analitik Sinyal' },
      { to: '/laporan',  icon: FileText,  label: 'Laporan & Export' },
    ]
  },
  {
    section: 'Sistem',
    items: [
      { to: '/sistem',      icon: Info, label: 'Informasi Sistem' },
      { to: '/notifikasi',  icon: Bell, label: 'Notifikasi & Alert', badge: '5', badgeColor: 'red' },
    ]
  },
]

const PAGE_META = {
  '/dashboard':    { title: 'Dashboard Utama',    sub: 'Pantau kondisi BTS dan ancaman Fake BTS secara real-time.' },
  '/live':         { title: 'Live Monitoring',     sub: 'Data parameter seluler real-time dari Supabase.' },
  '/riwayat':      { title: 'Riwayat Deteksi',     sub: 'Log seluruh kejadian Fake BTS yang telah terdeteksi.' },
  '/analitik':     { title: 'Analitik Sinyal',     sub: 'Analisis performa ML dan distribusi sinyal BTS.' },
  '/laporan':      { title: 'Laporan & Export',    sub: 'Ekspor data deteksi ke CSV (Excel).' },
  '/sistem':       { title: 'Informasi Sistem',    sub: 'Status komponen dan tautan penting sistem.' },
  '/notifikasi':   { title: 'Notifikasi & Alert',  sub: 'Pemberitahuan penting aktivitas deteksi.' },
  '/personal-info':{ title: 'Personal Information',sub: 'Kelola informasi personal dan akun Anda.' },
}

export default function Layout() {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [dropOpen, setDropOpen] = useState(false)
  const dropRef = useRef(null)
  const [threatCount, setThreatCount] = useState(0) // Ubah nilai awal menjadi 0
  const [notifCount, setNotifCount]   = useState(0) // State baru untuk notifikasi
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light') // Menyimpan tema
  const [logoutConfirm, setLogoutConfirm] = useState(false) // State untuk modal logout
  const [isLogoutClosing, setIsLogoutClosing] = useState(false) // State animasi tutup modal
  const [sidebarOpen, setSidebarOpen] = useState(false) // State untuk Sidebar Mobile
  const [chipInfo, setChipInfo] = useState(null) // State popup info titik
  const [isChipInfoClosing, setIsChipInfoClosing] = useState(false) // State animasi tutup info
  const meta = PAGE_META[location.pathname] || { title: 'FBDS', sub: '' }

  const fullName   = user?.user_metadata?.full_name   || user?.email?.split('@')[0] || 'Pengguna'
  const operatorId = user?.user_metadata?.operator_id || '—'
  const role       = user?.user_metadata?.access_role === 'admin' ? 'Admin' : 'User'
  const initials   = fullName.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const avatarUrl  = user?.user_metadata?.avatar_url
  const org        = user?.user_metadata?.org         || '—'
  const region     = user?.user_metadata?.region      || '—'
  const divisi     = user?.user_metadata?.divisi      || '—'

  const closeLogoutModal = () => {
    setIsLogoutClosing(true)
    setTimeout(() => {
      setLogoutConfirm(false)
      setIsLogoutClosing(false)
    }, 200)
  }

  async function executeLogout() {
    closeLogoutModal()
    await signOut()
    navigate('/login', { replace: true })
  }

  const closeChipInfo = () => {
    setIsChipInfoClosing(true)
    setTimeout(() => {
      setChipInfo(null)
      setIsChipInfoClosing(false)
    }, 200)
  }

  useEffect(() => {
    const handler = (e) => { if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Tutup sidebar otomatis setiap kali pindah halaman (klik menu) di mode Mobile
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  // Effect untuk me-reset lencana notifikasi saat user membuka halaman Notifikasi
  useEffect(() => {
    if (location.pathname === '/notifikasi') {
      setNotifCount(0)
      localStorage.setItem('lastNotifCheck', new Date().toISOString())
    }
  }, [location.pathname])

  // Effect utama untuk mengambil dan mendengarkan data (Threats & Notif) dari Supabase
  useEffect(() => {
    // 1. Fungsi terpisah untuk mengambil jumlah ancaman
    const fetchThreats = async () => {
      const { data } = await supabase.from('bts_readings').select('incident_status').eq('is_fake', true)
      if (data) {
        const activeCount = data.filter(d => d.incident_status !== 'resolved').length
        setThreatCount(activeCount)
      }
    }

    // 2. Fungsi terpisah untuk mengambil jumlah notifikasi baru
    const fetchNotifs = async () => {
      if (window.location.pathname !== '/notifikasi') {
        const lastCheck = localStorage.getItem('lastNotifCheck') || new Date(Date.now() - 86400000).toISOString()
        const { count } = await supabase.from('bts_readings').select('*', { count: 'exact', head: true }).in('status', ['fake_bts', 'suspect']).gt('created_at', lastCheck)
        if (count !== null) setNotifCount(count)
      }
    }
    
    // Panggil saat pertama dimuat
    fetchThreats()
    fetchNotifs()

    // 2. Dengarkan data baru yang masuk secara real-time
    const channel = supabase.channel('layout-threats')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bts_readings' }, payload => {
        if (payload.new.is_fake === true && payload.new.incident_status !== 'resolved') {
          setThreatCount(prev => prev + 1)
        }
        // Logika lencana Notifikasi
        if (['fake_bts', 'suspect'].includes(payload.new.status)) {
          if (window.location.pathname === '/notifikasi') {
            localStorage.setItem('lastNotifCheck', new Date().toISOString())
          } else {
            setNotifCount(prev => prev + 1)
          }
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bts_readings' }, payload => {
        // Hanya perbarui hitungan ancaman agar state notifCount optimistik tidak ter-reset!
        fetchThreats()
      })
      .subscribe()

    // 4. Dengarkan event lokal (Optimistic UI) dari halaman Riwayat agar Sidebar merespon instan (0 detik)
    const handleLocalResolve = () => {
      setThreatCount(prev => Math.max(0, prev - 1))
      
      // Tambahkan angka lencana notifikasi secara real-time di sidebar
      if (window.location.pathname !== '/notifikasi') {
        setNotifCount(prev => prev + 1)
      }
    }
    window.addEventListener('threatResolved', handleLocalResolve)

    return () => {
      supabase.removeChannel(channel)
      window.removeEventListener('threatResolved', handleLocalResolve)
    }
  }, [])

  // Menerapkan tema ke seluruh halaman HTML dan menyimpannya di browser
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
    window.dispatchEvent(new Event('themeToggle')) // Memberitahu grafik untuk redraw
  }, [theme])

  // Mengubah judul tab browser secara dinamis berdasarkan halaman yang aktif
  useEffect(() => {
    document.title = meta.title === 'FBDS' ? 'FBDS' : `${meta.title} | FBDS`
  }, [meta.title])

  return (
    <div className={styles.app}>
      {/* Overlay Gelap Pembungkus Mobile */}
      <div 
        className={`${styles.mobileOverlay} ${sidebarOpen ? styles.overlayOpen : ''}`} 
        onClick={() => setSidebarOpen(false)}
      />
      {/* SIDEBAR */}
      <aside className={`${styles.sidebar} ${sidebarOpen ? styles.sidebarOpen : ''}`}>
        {/* Logo slot */}
        <div className={styles.logoSlot}>
          <div className={styles.logoIcon}>
            <img src="/logo.png" alt="Logo FBDS" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
          </div>
          <div>
            <div className={styles.logoName}>FBDS</div>
            <div className={styles.logoTagline}>Fake BTS Detection System</div>
          </div>
        </div>

        {/* User card */}
        <div className={styles.userCard}>
          <div className={styles.userAvatar}>
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
            </div>
          <div className={styles.userName}>{fullName}</div>
          <div className={styles.userId}>{operatorId}</div>
          <span className={styles.roleBadge}>{role}</span>
          <div className={styles.userInfoList}>
            <div className={styles.divider}></div>
            <div className={styles.userInfoRow}>
              <Building2 size={13} />
              <div>
                <span className={styles.infoLabel}>Instansi</span>
                <span className={styles.infoValue}>{org}</span>
              </div>
            </div>
            <div className={styles.userInfoRow}>
              <Zap size={13} />
              <div>
                <span className={styles.infoLabel}>Divisi</span>
                <span className={styles.infoValue}>{divisi}</span>
              </div>
            </div>
            <div className={styles.userInfoRow}>
              <MapPin size={13} />
              <div>
                <span className={styles.infoLabel}>Posisi</span>
                <span className={styles.infoValue}>{region}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className={styles.nav}>
          {NAV.map(group => {
            // Sembunyikan grup menu 'Analitik' jika jabatan bukan Admin
            if (group.section === 'Analitik' && role !== 'Admin') return null;
            
            return (
              <div key={group.section} className={styles.navSection}>
                <div className={styles.navSectionLabel}>{group.section}</div>
                {group.items.map(item => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `${styles.navItem} ${isActive ? styles.navItemActive : ''}`
                    }
                  >
                    <item.icon size={15} />
                    <span>{item.label}</span>

                    {/* Menampilkan lencana (badge) peringatan jika ada ancaman */}
                    {item.badge && (item.to === '/riwayat' ? threatCount > 0 : item.to === '/notifikasi' ? notifCount > 0 : true) && (
                      <span className={`${styles.navBadge} ${item.badgeColor === 'green' ? styles.navBadgeGreen : styles.navBadgeRed}`}>
                        {item.to === '/riwayat' ? threatCount : item.to === '/notifikasi' ? notifCount : item.badge}
                      </span>
                    )}
                  </NavLink>
                ))}
              </div>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          Jika menemukan anomali,<br />
          hubungi <a href="mailto:muhamadpriadi520@gmail.com">muhamadpriadi520@gmail.com</a>
        </div>
      </aside>

      {/* MAIN */}
      <div className={styles.main}>
        {/* Topbar */}
        <header className={styles.topbar}>
          <div className={styles.topbarLeft}>
            {/* Tombol Hamburger muncul di kiri judul khusus Mobile */}
            <button className={styles.hamburger} onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <div className={styles.pageTitle}>{meta.title}</div>
              <div className={styles.pageSub}>{meta.sub}</div>
            </div>
          </div>
          <div className={styles.topbarRight}>
            <div className={styles.sysChip} title="ML Model Aktif">
              <span className={`${styles.chipDot} ${styles.green}`} />
              <span className={styles.sysChipText}>ML Model Aktif</span>
            </div>
            
            {/* KODE LAMA (DIKOMEN): */}
            {/* <div className={styles.sysChip}>
              <span className={`${styles.chipDot} ${styles.red}`} />
              3 Ancaman
            </div> */}

            {/* KODE BARU: (Menampilkan jumlah ancaman sesuai database) */}
            {threatCount > 0 && (
              <div className={styles.sysChip} title={`${threatCount} Ancaman`}>
                <span className={`${styles.chipDot} ${styles.red}`} />
                <span className={styles.sysChipCount}>{threatCount}</span>
                <span className={styles.sysChipText}>Ancaman</span>
              </div>
            )}

            <div className={styles.sysChip} title="Supabase Sync">
              <span className={`${styles.chipDot} ${styles.amber}`} />
              <span className={styles.sysChipText}>Supabase Sync</span>
            </div>

            {/* Tombol Toggle Theme */}
            <button className={styles.profileBtn} onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} style={{ padding: '6px 8px', borderRadius: '24px' }}>
              {theme === 'light' ? <Sun size={16} color="var(--text-secondary)" /> : <Moon size={16} color="var(--text-secondary)" />}
            </button>

            {/* Profile dropdown */}
            <div className={styles.profileWrap} ref={dropRef}>
              <button className={styles.profileBtn} onClick={() => setDropOpen(v => !v)}>
                <div className={styles.profileAvatar}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    initials
                  )}
                </div>
                <span className={styles.profileName}>{fullName}</span>
                <ChevronDown size={14} className={styles.profileCaret} />
              </button>
              {dropOpen && (
                <div className={styles.dropdown}>
                  <div className={styles.dropdownHeader}>
                    <div className={styles.dropdownAvatar}>
                      {avatarUrl ? (
                        <img src={avatarUrl} alt="Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        initials
                      )}
                    </div>
                    <div>
                      <div className={styles.dropdownName}>{fullName}</div>
                      <div className={styles.dropdownId}>{user?.email}</div>
                    </div>
                  </div>
                  <button className={styles.dropdownItem} onClick={() => { navigate('/personal-info'); setDropOpen(false) }}>
                    <User size={14} /> Personal Information
                  </button>
                  {role === 'Admin' && (
                    <button className={styles.dropdownItem} onClick={() => { navigate('/laporan'); setDropOpen(false) }}>
                      <FileText size={14} /> Laporan &amp; Export
                    </button>
                  )}
                  <div className={styles.dropdownDivider} />
                  <button className={`${styles.dropdownItem} ${styles.dropdownDanger}`} onClick={() => { setDropOpen(false); setLogoutConfirm(true); }}>
                    <LogOut size={14} /> Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className={styles.content}>
          <Outlet />
        </div>

        {/* Footer */}
        <footer className={styles.footer}>
          © 2026 FBDS — Fake BTS Detection System
        </footer>
      </div>

      {/* Modal Konfirmasi Logout */}
      {logoutConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: isLogoutClosing ? 'fadeOut 0.2s forwards' : 'fadeIn 0.2s forwards' }}>
          <div style={{ background: 'var(--white)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', animation: isLogoutClosing ? 'modalOut 0.2s forwards' : 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--red-light)', color: 'var(--red)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <LogOut size={20} strokeWidth={2.5} style={{ marginLeft: -2 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Konfirmasi Keluar</div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              Apakah Anda yakin ingin keluar dari sistem? Anda harus login kembali menggunakan email dan password untuk mengakses dashboard pemantauan.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={closeLogoutModal} 
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--white)', border: '1px solid var(--border2)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }} 
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-primary)' }} 
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                Batal
              </button>
              <button 
                onClick={executeLogout} 
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--red)', border: 'none', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', transition: 'background 0.15s' }} 
                onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'} 
                onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}>
                Ya, Keluar
              </button>
            </div>
          </div>
          {/* Menggunakan kembali animasi keyframes yang sudah ada */}
          <style>{`@keyframes fadeIn{from{opacity:0;}to{opacity:1;}} @keyframes fadeOut{from{opacity:1;}to{opacity:0;}} @keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}} @keyframes modalOut{from{opacity:1;transform:scale(1) translateY(0);}to{opacity:0;transform:scale(0.95) translateY(10px);}}`}</style>
        </div>
      )}

      {/* Modal Info Titik Status */}
      {chipInfo && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: isChipInfoClosing ? 'fadeOut 0.2s forwards' : 'fadeIn 0.2s forwards' }} onClick={closeChipInfo}>
          <div style={{ background: 'var(--white)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 360, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', animation: isChipInfoClosing ? 'modalOut 0.2s forwards' : 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: chipInfo.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ width: 14, height: 14, borderRadius: '50%', background: chipInfo.color, display: 'inline-block' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{chipInfo.title}</div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              {chipInfo.desc}
            </p>
            <button 
              onClick={closeChipInfo} 
              style={{ width: '100%', padding: '10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'}
              onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}
            >
              Mengerti
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
