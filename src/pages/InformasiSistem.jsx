// src/pages/InformasiSistem.jsx
import { useEffect } from 'react' 
import { Info, ExternalLink, CheckCircle } from 'lucide-react'
import { Badge, PageHeader, CardHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'

const LINKS = [
  { label: 'Dokumentasi API Supabase',   href: 'https://supabase.com/docs' },
  { label: 'Panduan Model Unsupervised', href: 'https://heyzine.com/flip-book/01e0b9909c.html#page/1' },
  { label: 'Panduan Model Supervised',   href: 'https://heyzine.com/flip-book/masukkan-kode-2.html' },
  { label: 'Panduan Mobile App',         href: 'https://heyzine.com/flip-book/masukkan-kode-3.html' },
  { label: 'FAQ Sistem Deteksi',         href: 'https://heyzine.com/flip-book/masukkan-kode-4.html' },
  { label: 'Kontak Tim Support',       href: 'mailto:muhamadpriadi520@gmail.com' }
]

const COMPONENTS = [
  { name: 'Web Dashboard',            version: 'v1.0.0', language: 'JavaScript (React.js)',          fungsi: 'Visualisasi & Analitik',      metrik: 'Latensi UI: 45ms',     status: 'green' },
  { name: 'Mobile APK (Sensor)',      version: 'v1.0',   language: 'Kotlin (Android SDK)',    fungsi: 'Pengumpul Data Jaringan',     metrik: '-',    status: 'amber' },
  { name: 'Unsupervised Learning ML', version: 'v1.0.0', language: 'Python (Sklearn)',  fungsi: 'Deteksi Anomali (Zero-day)',  metrik: 'Isolasi Cluster: 0.8', status: 'green' },
  { name: 'Supervised Learning ML',   version: 'v1.0.0', language: 'Python (TensorFlow)',  fungsi: 'Klasifikasi Pola Dikenal',    metrik: 'Akurasi: 98.4%',       status: 'green' },
  { name: 'Supabase (Backend)',       version: '—',      language: 'SQL (Supabase)',        fungsi: 'Penyimpanan & Sinkronisasi',  metrik: 'Respon DB: 12ms',      status: 'green' },
]

const statusLabel = { green: 'Online', amber: 'Partial', red: 'Offline' }

export default function InformasiSistem() {
  const { user } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Pengguna'

  return (
    <div>
      <PageHeader
        title="Informasi Sistem"
        sub="Status komponen dan tautan penting sistem FakeBTS."
      />

      <style>{`
        .sys-grid { display: grid; grid-template-columns: 1fr 300px; gap: 16px; margin-bottom: 16px; }
        @media (max-width: 900px) { .sys-grid { grid-template-columns: 1fr; } }
      `}</style>

      {/* Welcome + Links */}
      <div className="sys-grid">
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '20px 22px' }}>
          <div style={{ fontSize: 18, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 8 }}>
            Selamat datang, {userName} 👋
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 14 }}>
            <strong>FBDS</strong> adalah sistem deteksi Fake BTS berbasis Machine Learning
            yang memantau jaringan seluler secara real-time. Data jaringan dikumpulkan melalui aplikasi
            <strong> Mobile (Apk)</strong>, dikirim ke Supabase, lalu dideteksi menggunakan kombinasi model
            <strong> Unsupervised</strong> dan <strong>Supervised Learning</strong> untuk mendeteksi anomali.
          </p>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
            Fitur utama yang tersedia:
          </div>
          <ul style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              ['Live Monitoring',   'data parameter seluler real-time dari Supabase'],
              ['Deteksi ML',        'model klasifikasi otomatis Fake BTS vs BTS asli'],
              ['Riwayat Deteksi',   'log lengkap semua kejadian terdeteksi'],
              ['Export Data',       'unduh laporan dalam format CSV (Excel)'],
              ['Alert System',      'notifikasi real-time saat anomali terdeteksi'],
            ].map(([title, desc]) => (
              <li key={title} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
                <CheckCircle size={14} style={{ color: 'var(--green)', flexShrink: 0, marginTop: 2 }} />
                <span><strong>{title}</strong> — {desc}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Links card */}
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <CardHeader title="Tautan Penting" icon={Info} />
          <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 4 }}>
            {LINKS.map(link => (
              <a key={link.label} href={link.href} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 6px', borderRadius: 6, color: 'var(--accent2)', fontSize: 13, transition: 'background 0.12s', textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = 'var(--accent2-light)'}
                onMouseLeave={e => e.currentTarget.style.background = ''}>
                <ExternalLink size={13} style={{ flexShrink: 0, opacity: 0.7 }} />
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* Component status table */}
      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <CardHeader title="Status Komponen Sistem" icon={Info} />
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Komponen', 'Versi', 'Bahasa Pemrograman', 'Fungsi Utama', 'Metrik Kinerja', 'Status'].map(h => {
                  const align = (h === 'Status' || h === 'Bahasa Pemrograman' || h === 'Fungsi Utama' || h === 'Metrik Kinerja') ? 'center' : 'left'
                  return (
                    <th key={h} style={{ padding: '10px 16px', textAlign: align, fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.4, textTransform: 'uppercase', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>
                      {h}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {COMPONENTS.map((c, i) => (
                <tr key={i}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border)' }}>{c.version}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{c.language}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{c.fungsi}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: 12.5, color: 'var(--text-secondary)', fontFamily: 'DM Mono, monospace', borderBottom: '1px solid var(--border)' }}>{c.metrik}</td>
                  <td style={{ padding: '12px 16px', textAlign: 'center', borderBottom: '1px solid var(--border)' }}>
                    <Badge color={c.status}>{statusLabel[c.status]}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
