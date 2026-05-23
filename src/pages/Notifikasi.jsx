// src/pages/Notifikasi.jsx
import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'

// Pesan info sistem statis agar halaman tidak kosong melompong saat DB baru dibuat
const SYSTEM_INFO = [
  {
    id: 'sys-1',
    tag: 'INFO', tagColor: 'var(--accent2)', tagBg: 'var(--accent2-light)',
    date: new Date().toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',', ' ·'),
    title: 'Sistem Deteksi FakeBTS Berhasil Diinisialisasi',
    body: 'Koneksi ke database Supabase dan ML Worker berjalan dengan normal. Sistem siap melakukan pemantauan 24/7 dan mencatat anomali sinyal seluler.',
    timestamp: 0, // Pastikan info sistem selalu berada di paling bawah
    recordId: 'sys-1',
  },
]

export default function Notifikasi() {
  const [notifs, setNotifs] = useState([])

  // Mengubah 1 baris data menjadi array berisi 1 atau 2 notifikasi sekaligus
  const getNotifsFromRecord = (r) => {
    const notifsArr = []

    // 1. Notifikasi Asli (Selalu ditambahkan sebagai sejarah kejadian awal)
    notifsArr.push({
      id: `${r.id}-alert`,
      recordId: r.id, // Untuk mempermudah pelacakan & filter
      tag: 'KRITIS',
      tagColor: 'var(--red)',
      tagBg: 'var(--red-light)',
      title: `Fake BTS Aktif Terdeteksi — Cell ${r.cell_id || 'Unknown'}`,
      body: `Sistem ML (Conf: ${r.confidence || 0}%) mendeteksi Fake BTS memancarkan sinyal ${r.signal_dbm || '-'} dBm. ${r.imsi ? 'Device IMSI '+r.imsi+' terdampak.' : ''} Harap segera tindak lanjuti!`,
      date: new Date(r.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',', ' ·'),
      timestamp: new Date(r.created_at).getTime()
    })

    // 2. Notifikasi Selesai (Dibuat sebagai tambahan BARU khusus jika status resolved)
    if (r.incident_status === 'resolved') {
      const timeToUse = r.resolved_at || r.created_at || new Date().toISOString()
      notifsArr.push({
        id: `${r.id}-resolved`,
        recordId: r.id,
        tag: 'SELESAI',
        tagColor: 'var(--green)',
        tagBg: 'var(--green-light)',
        title: `Ancaman Diselesaikan — Cell ${r.cell_id || 'Unknown'}`,
        body: `Tim lapangan telah menandai perangkat ilegal di koordinat ${r.enb_lat || '-'}, ${r.enb_lon || '-'} sebagai "Selesai". Area kembali aman.`,
        date: new Date(timeToUse).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }).replace(',', ' ·'),
        timestamp: new Date(timeToUse).getTime()
      })
    }

    return notifsArr
  }

  useEffect(() => {
    const fetchNotifs = async () => {
      const { data } = await supabase
        .from('bts_readings')
        .select('*')
        .eq('status', 'fake_bts')
        .order('created_at', { ascending: false })
        .limit(30)

      // Ambil riwayat tindakan 'Selesai' terbaru dari LocalStorage
      const recentResolved = JSON.parse(localStorage.getItem('recentResolved') || '[]')
      const resolvedIds = recentResolved.map(r => r.id)

      const mappedResolved = recentResolved.flatMap(getNotifsFromRecord)

      if (data) {
        // Filter agar tidak ada duplikasi data dari DB yang sama dengan data di jembatan
        const filteredData = data.filter(r => !resolvedIds.includes(r.id))
        const mappedDB = filteredData.flatMap(getNotifsFromRecord)
        
        // Gabungkan dan lakukan SORTING mutlak berdasarkan timestamp (Terbaru -> Terlama)
        const combined = [...mappedResolved, ...mappedDB, ...SYSTEM_INFO]
        setNotifs(combined.sort((a, b) => b.timestamp - a.timestamp))
      } else {
        const combined = [...mappedResolved, ...SYSTEM_INFO]
        setNotifs(combined.sort((a, b) => b.timestamp - a.timestamp))
      }
    }
    fetchNotifs()

    const channel = supabase.channel('notifikasi-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bts_readings' }, payload => {
        if (payload.new.status === 'fake_bts') {
          // Sort ulang setiap ada data baru masuk agar konsisten di atas
          setNotifs(prev => [...getNotifsFromRecord(payload.new), ...prev].sort((a, b) => b.timestamp - a.timestamp))
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bts_readings' }, payload => {
        // Cek apakah ini adalah update 'resolved' yang baru
        if (payload.new.incident_status === 'resolved' && payload.old.incident_status !== 'resolved') {
          // Inject waktu saat ini sebagai waktu selesai secara realtime
          const newResolved = { ...payload.new, resolved_at: new Date().toISOString() }
          setNotifs(prev => {
            const filtered = prev.filter(n => n.recordId !== payload.new.id)
            return [...getNotifsFromRecord(newResolved), ...filtered].sort((a, b) => b.timestamp - a.timestamp)
          })
        } else {
          // Jika bukan, cukup update (hapus yang lama dan buat ulang dari payload terbaru)
          setNotifs(prev => {
            const filtered = prev.filter(n => n.recordId !== payload.new.id)
            return [...getNotifsFromRecord(payload.new), ...filtered].sort((a, b) => b.timestamp - a.timestamp)
          })
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  return (
    <div>
      <PageHeader
        title="Notifikasi & Alert"
        sub="Pemberitahuan penting terkait sistem dan aktivitas deteksi Fake BTS."
      />
      
      {/* Container dengan max-height dan scrollbar (menampung ~5 item) */}
      <div className="notif-container" style={{ maxHeight: '620px', overflowY: 'auto', paddingRight: '6px', paddingBottom: '10px' }}>
        {notifs.map((item, index) => (
          <div key={item.id}
            style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', marginBottom: 12, cursor: 'pointer', transition: 'box-shadow 0.15s, border-color 0.15s', animation: 'fadeSlideUp 0.35s ease-out forwards', animationDelay: `${index * 0.04}s`, opacity: 0 }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'var(--border2)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; e.currentTarget.style.borderColor = 'var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: item.tagBg, color: item.tagColor }}>
                {item.tag}
              </span>
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)', fontFamily: 'DM Mono, monospace' }}>
                {item.date}
              </span>
            </div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 6 }}>
              {item.title}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--text-secondary)', lineHeight: 1.65 }}>
              {item.body}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        /* Styling khusus untuk scrollbar agar terlihat elegan dan menyatu dengan tema */
        .notif-container::-webkit-scrollbar { width: 6px; }
        .notif-container::-webkit-scrollbar-track { background: transparent; }
        .notif-container::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }
        .notif-container::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }

        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}