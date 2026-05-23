// src/pages/RiwayatDeteksi.jsx
import { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, AlertTriangle, FileText } from 'lucide-react'
import { Badge, PageHeader, CardHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

function ElegantSelect({ value, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label || ''

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '9px 40px 9px 16px',
          borderRadius: '8px',
          border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border2)'}`,
          background: 'var(--white)',
          fontSize: '12.5px',
          fontWeight: '500',
          color: 'var(--text-primary)',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
          transition: 'all 0.15s ease',
          userSelect: 'none',
          minWidth: '140px'
        }}
        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
        onMouseLeave={e => e.currentTarget.style.borderColor = isOpen ? 'var(--accent)' : 'var(--border2)'}
      >
        {selectedLabel}
      </div>
      <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : ''}`, transition: 'transform 0.2s', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, minWidth: '100%', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden', padding: '4px 0', animation: 'fadeIn 0.15s ease-out' }}>
          {options.map(o => (
            <div key={o.value} onClick={() => { onChange(o.value); setIsOpen(false) }}
              style={{ padding: '8px 16px', fontSize: '12.5px', fontWeight: value === o.value ? '600' : '500', color: value === o.value ? 'var(--accent)' : 'var(--text-secondary)', background: value === o.value ? 'var(--accent-light)' : 'transparent', cursor: 'pointer', transition: 'background 0.1s', whiteSpace: 'nowrap' }}
              onMouseEnter={e => { if (value !== o.value) e.currentTarget.style.background = 'var(--bg)' }}
              onMouseLeave={e => { if (value !== o.value) e.currentTarget.style.background = 'transparent' }}
            >
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


export default function RiwayatDeteksi() {
  const [logs, setLogs] = useState([])
  const [timeFilter, setTimeFilter] = useState('all')
  const [opFilter, setOpFilter]     = useState('all')
  const [resolveConfirm, setResolveConfirm] = useState(null) // Menyimpan ID data yang akan diselesaikan
  const [isClosing, setIsClosing]   = useState(false) // State untuk efek animasi keluar

  // Fungsi untuk mencetak PDF Laporan Insiden Mini (Updated with ZTE Report Style)
const generatePDF = async (record) => {
  const doc = new jsPDF()
  
  // 1. Tambahkan Watermark Teks di Background (Diagonal) - TETAP
  doc.setFontSize(85)
  doc.setTextColor(240, 244, 248) 
  doc.text('FBDS CONFIDENTIAL', 33, 282, { angle: 56 })

  // Header Laporan - TETAP
  doc.setFontSize(18)
  doc.setTextColor(220, 38, 38) 
  doc.text('Laporan Insiden Keamanan Jaringan', 14, 22)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  const safeId = record.id ? String(record.id) : String(Math.floor(Math.random() * 10000))
  const shortId = `EVT-${safeId.split('-')[0].toUpperCase()}`
  doc.text(`ID Kejadian: ${shortId}`, 14, 30)
  doc.text(`Tanggal Cetak: ${new Date().toLocaleString('id-ID')}`, 14, 36)

  // 2. Muat Logo FBDS secara Asinkron - TETAP
  const img = new Image()
  img.src = '/logo.png'
  await new Promise((resolve) => {
    img.onload = resolve
    img.onerror = resolve
  })
  
  try {
    const imgWidth = 20;
    const imgHeight = (img.height * imgWidth) / img.width;
    const xPos = 196 - imgWidth; 
    doc.addImage(img, 'PNG', xPos, 12, imgWidth, imgHeight)
  } catch (err) {
    console.warn('Gagal memuat logo ke PDF', err)
  }

  // --- MODIFIKASI TABEL DATA (Menyesuaikan Laporan PDF Contoh) ---
  autoTable(doc, {
    startY: 45,
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Parameter', 'Detail Informasi / Deskripsi']],
    body: [
      // Data Identifikasi (Gabungan FBDS & Format Laporan)
      ['Alarm Title', 'gNB Fake BTS detected alarm'],
      ['Alarm Code', 'NE Alarm - FBDS_001'],
      ['Specific Problem', 'The NGAP associations are disconnected due to unauthorized Base Station interference.'],
      ['Alarm Severity', 'Critical / Major'],
      
      // Data Teknis (Field Asli Kamu)
      ['Occurrence Time', record.created_at ? new Date(record.created_at).toLocaleString('id-ID') : '-'],
      ['Cell ID / MOC', record.cell_id != null ? String(record.cell_id) : '-'],
      ['Operator', record.operator ? String(record.operator) : '-'],
      // Beri spasi kosong setelah \n agar tabel menyediakan ruang untuk baris kedua
      ['Location (Lat, Lng)', record.enb_lat && record.enb_lon ? `${record.enb_lat}, ${record.enb_lon}\n ` : '-'],
      ['RSRP / RSRQ', `${record.rsrp || '-'} dBm / ${record.rsrq || '-'} dB`],
      
      // Data Analisis (Sesuai PDF Contoh)
      ['Root Reason Analysis', `Detection via ML (${record.confidence ? Number(record.confidence).toFixed(1) : '0.0'}% Confidence level)`],
      ['Ack Information', 'System Auto-Generated by FBDS Engine'],
    ],
    didDrawCell: (data) => {
      // Tempelkan area klik "tak kasat mata" di atas sel tersebut
      if (data.section === 'body' && data.row.index === 7 && data.column.index === 1 && record.enb_lat && record.enb_lon) {
        const url = `https://www.google.com/maps?q=${record.enb_lat},${record.enb_lon}`;
        
        // Kalkulasi panjang teks untuk membatasi area klik
        doc.setFontSize(10); // Gunakan font ukuran 10 (standar body tabel)
        doc.setTextColor(37, 99, 235); // Set tinta HANYA untuk tulisan ini menjadi biru laut
        const textWidth = doc.getTextWidth('(Klik untuk Buka di Maps)');

        // Ambil nilai padding asli tabel untuk perhitungan yang 100% akurat
        const padding = data.cell.styles.cellPadding;
        const padLeft = typeof padding === 'object' ? (padding.left || 4) : (padding || 4);
        const padBottom = typeof padding === 'object' ? (padding.bottom || 4) : (padding || 4);

        const startX = data.cell.x + padLeft; 
        // Menyesuaikan tinggi posisi agar teks biru jatuh tepat di baris kedua
        const startY = data.cell.y + data.cell.height - padBottom - 0.8; 

        // Lukis teks biru secara manual!
        doc.text('(Klik untuk Buka di Maps)', startX, startY);

        // Buat area klik yang ukurannya HANYA sebesar teks baris kedua
        // (startY - 4 adalah titik atas teks, 5 adalah tinggi kotak kliknya)
        doc.link(startX, startY - 4, textWidth, 5, { url: url });
      }
    }
  })

  // --- PENAMBAHAN BAGIAN HANDLING SUGGESTION (Sesuai PDF Contoh) ---
  const finalY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 150
  
  doc.setFontSize(11)
  doc.setTextColor(15, 23, 42)
  doc.setFont(undefined, 'bold')
  doc.text('Handling Suggestions (Rekomendasi Penanganan):', 14, finalY + 12)
  
  doc.setFontSize(9)
  doc.setFont(undefined, 'normal')
  doc.setTextColor(50)
  
  // Mengikuti alur Step-by-Step dari PDF ZTE
  const suggestions = [
    "1. Check whether the network is normal and identify the location of the unauthorized gNB.",
    "2. If confirmed as Fake BTS, isolate the frequency or cell sector affected.",
    "3. Contact field maintenance personnel (NOC) to verify the physical site location.",
    "4. After the illegal equipment is removed, check whether the signal interference is cleared.",
    "5. Contact FBDS Technical Support for further log analysis."
  ]
  
  let currentY = finalY + 18
  suggestions.forEach((line) => {
    doc.text(line, 14, currentY)
    currentY += 6
  })

  // Footer / Catatan Akhir - TETAP
  doc.setFontSize(8)
  doc.setTextColor(150)
  doc.text('Laporan ini dihasilkan secara otomatis oleh FBDS (Fake BTS Detection System).', 14, currentY + 10)
  doc.text('Harap serahkan dokumen ini kepada teknisi lapangan untuk investigasi lebih lanjut.', 14, currentY + 15)

  // Simpan file
  doc.save(`Laporan_Insiden_${shortId}.pdf`)
}

  useEffect(() => {
    const fetchLogs = async () => { 
      const { data } = await supabase
        .from('bts_readings')
        .select('*')
        .eq('status', 'fake_bts')
        .order('created_at', { ascending: false })
        .limit(200) // Ambil 200 log terbaru agar tidak berat

      if (data) setLogs(data)
    }
    fetchLogs()

    // Dengarkan ancaman baru
    const channel = supabase.channel('riwayat-logs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bts_readings' }, payload => {
        if (payload.new.status === 'fake_bts') {
          setLogs(prev => [payload.new, ...prev])
        }
      })
      // Dengarkan jika ada data yang di-update (misal ditandai selesai)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bts_readings' }, payload => {
        setLogs(prev => prev.map(log => log.id === payload.new.id ? payload.new : log))
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Fungsi untuk menutup modal dengan efek animasi perlahan
  const closeModal = () => {
    setIsClosing(true)
    setTimeout(() => {
      setResolveConfirm(null)
      setIsClosing(false)
    }, 200) // Waktu tunggu sesuai durasi animasi CSS (0.2 detik)
  }

  // Fungsi untuk menandai ancaman sebagai selesai
  const handleResolve = async () => {
    if (!resolveConfirm) return
    const id = resolveConfirm
    const targetLog = logs.find(l => l.id === id) // Ambil data ancaman untuk isi pesan Telegram
    closeModal() // Tutup modal dengan animasi

    // Optimistic UI update (ubah di layar seketika tanpa nunggu server)
    setLogs(prev => prev.map(log => log.id === id ? { ...log, incident_status: 'resolved' } : log))

    // Beritahu Layout.jsx (Sidebar) untuk langsung mengurangi angka detik ini juga
    window.dispatchEvent(new Event('threatResolved'))

    // Simpan history Selesai ini ke LocalStorage sebagai 'Jembatan' ke halaman Notifikasi
    if (targetLog) {
      const recentResolved = JSON.parse(localStorage.getItem('recentResolved') || '[]')
      recentResolved.unshift({ ...targetLog, incident_status: 'resolved', resolved_at: new Date().toISOString() })
      localStorage.setItem('recentResolved', JSON.stringify(recentResolved.slice(0, 10))) // Simpan 10 terbaru
    }

    // Update data di Supabase
    const { error } = await supabase
      .from('bts_readings')
      .update({ incident_status: 'resolved' })
      .eq('id', id)

    if (error) {
      alert('Gagal mengupdate status: ' + error.message)
    } else if (targetLog) {
      // JIKA BERHASIL: Kirim Notifikasi Penanganan ke Telegram
      const TELEGRAM_TOKEN = "TOKEN_DARI_BOTFATHER" // Masukkan Token Bot Anda di sini
      const TELEGRAM_CHAT_ID = "-100123456789"      // Masukkan ID Grup Anda di sini
      
      const pesan = `✅ *ANCAMAN TELAH DISELESAIKAN* ✅\n\n📍 *Cell ID:* \`${targetLog.cell_id || 'Unknown'}\`\n👮 *Tindakan:* Perangkat ilegal di koordinat ${targetLog.enb_lat || '-'}, ${targetLog.enb_lon || '-'} telah ditangani. Sistem kembali aman.`
      
      fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: pesan, parse_mode: 'Markdown' })
      }).catch(err => console.error('Gagal kirim Telegram:', err))
    }
  }

  // --- LOGIKA FILTER ---
  let filtered = logs

  // 1. Filter Waktu (7 Hari, 30 Hari)
  if (timeFilter !== 'all') {
    const days = parseInt(timeFilter, 10)
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    filtered = filtered.filter(r => new Date(r.created_at) >= cutoff)
  }

  // 3. Filter Operator
  if (opFilter !== 'all') {
    filtered = filtered.filter(r => (r.operator || '').toLowerCase().includes(opFilter.toLowerCase()))
  }

  return (
    <div>
      <PageHeader title="Riwayat Deteksi" sub="Log seluruh kejadian Fake BTS yang telah terdeteksi oleh sistem ML." />
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <ElegantSelect value={timeFilter} onChange={setTimeFilter} options={[{value:'7',label:'7 Hari Terakhir'},{value:'30',label:'30 Hari'},{value:'all',label:'Semua Waktu'}]} />
        <ElegantSelect value={opFilter} onChange={setOpFilter} options={[
          {value:'all',label:'Semua Operator'},
          {value:'telkomsel',label:'Telkomsel'},
          {value:'indosat',label:'Indosat'},
          {value:'xl',label:'XL Axiata'},
          {value:'smartfren',label:'Smartfren'}
        ]} />
      </div>

      {/* Trik CSS untuk memodifikasi Scrollbar Tabel */}
      <style>{`
        .custom-table-scroll::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-table-scroll::-webkit-scrollbar-track { 
          background: transparent; 
        }
        .custom-table-scroll::-webkit-scrollbar-thumb { background: var(--border2); border-radius: 10px; }
        .custom-table-scroll::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
      `}</style>

      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <div className="custom-table-scroll" style={{ overflowX:'auto', maxHeight: '65vh', overflowY: 'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr>{['ID Kejadian','Tanggal & Waktu','Tipe','Lokasi (Lat, Lng)','Cell ID','LAC','Operator','IMSI Terdampak','ML Conf.','Status', 'Aksi'].map(h=>(
              <th key={h} style={{ position: 'sticky', top: 0, zIndex: 10, padding:'10px 10px', textAlign: (h === 'Status' || h === 'Aksi') ? 'center' : 'left', fontSize:11, fontWeight:600, color:'var(--text-muted)', letterSpacing:0.4, textTransform:'uppercase', background:'var(--bg)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>{h}</th>
            ))}</tr></thead>
            <tbody>
              {filtered.length > 0 ? filtered.map((r, index) => {
                
                // [PERBAIKAN] Dibungkus String() agar tidak error jika id berupa angka
                const safeId  = r.id ? String(r.id) : String(index)
                const shortId = `EVT-${safeId.split('-')[0].toUpperCase()}`
                const dateStr = r.created_at ? new Date(r.created_at).toLocaleString('id-ID', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }) : '-'
            const locStr  = r.enb_lat && r.enb_lon ? `${Number(r.enb_lat).toFixed(4)}, ${Number(r.enb_lon).toFixed(4)}` : '-'
                // Ambil status dari database, jika belum diset, gunakan default (active/investigating)
                const evStatus = r.incident_status || 'active'

                return (
                  <tr key={r.id || index} onMouseEnter={e=>e.currentTarget.style.background='var(--bg)'} onMouseLeave={e=>e.currentTarget.style.background=''}>
                    <td style={{ padding:'11px 10px', fontFamily:'DM Mono,monospace', fontSize:11.5, color:'var(--text-primary)', borderBottom:'1px solid var(--border)' }}>{shortId}</td>
                    <td style={{ padding:'11px 10px', fontSize:11.5, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' }}>{dateStr}</td>
                    <td style={{ padding:'11px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}><Badge color={'red'}>Fake BTS</Badge></td>
                    <td style={{ padding:'11px 10px', fontSize:12, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' }}>{locStr}</td>
                    <td style={{ padding:'11px 10px', fontFamily:'DM Mono,monospace', fontSize:11.5, color:'var(--text-primary)', borderBottom:'1px solid var(--border)' }}>{r.cell_id || '-'}</td>
                    <td style={{ padding:'11px 10px', fontSize:12.5, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' }}>{r.lac || '-'}</td>
                    <td style={{ padding:'11px 10px', fontSize:12.5, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' }}>{r.operator || '-'}</td>
                    <td style={{ padding:'11px 10px', fontFamily:'DM Mono,monospace', fontSize:12.5, color:'var(--text-secondary)', borderBottom:'1px solid var(--border)' }}>{r.imsi || '-'}</td>
                    <td style={{ padding:'11px 10px', fontSize:12.5, fontWeight:600, color:r.confidence>=90?'var(--green)':'var(--amber)', borderBottom:'1px solid var(--border)' }}>{r.confidence ? `${Number(r.confidence).toFixed(1)}%` : '-'}</td>
                    <td style={{ padding:'11px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}><Badge color={evStatus === 'resolved' ? 'green' : 'red'}>{evStatus === 'resolved' ? 'Resolved' : 'Active'}</Badge></td>
                    <td style={{ padding:'11px 10px', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {evStatus !== 'resolved' && (
                          <button 
                            onClick={() => setResolveConfirm(r.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--green-light)', color: 'var(--green)', border: '1px solid rgba(22,163,74,0.2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                            onMouseEnter={e => e.currentTarget.style.background = '#bbf7d0'}
                            onMouseLeave={e => e.currentTarget.style.background = 'var(--green-light)'}
                          ><Check size={12} /> Selesai</button>
                        )}
                        <button 
                          onClick={() => generatePDF(r)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 8px', borderRadius: 6, background: 'var(--accent2-light)', color: 'var(--accent2)', border: '1px solid rgba(59,130,246,0.2)', fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
                          onMouseEnter={e => e.currentTarget.style.background = '#bfdbfe'}
                          onMouseLeave={e => e.currentTarget.style.background = 'var(--accent2-light)'}
                          title="Cetak Laporan PDF"
                        ><FileText size={12} /> PDF</button>
                      </div>
                    </td>
                  </tr>
                )
              }) : (
                <tr>
                  <td colSpan="11" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Tidak ada rekaman data yang cocok dengan filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Konfirmasi Selesai */}
      {resolveConfirm && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: isClosing ? 'fadeOut 0.2s forwards' : 'fadeIn 0.2s forwards' }}>
          <div style={{ background: 'var(--white)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)', animation: isClosing ? 'modalOut 0.2s forwards' : 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'var(--amber-light)', color: 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <AlertTriangle size={20} strokeWidth={2.5} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>Konfirmasi Tindakan</div>
            </div>
            <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: 24 }}>
              Apakah Anda yakin ancaman ini sudah berhasil ditangani dan perangkat ilegal telah dinonaktifkan di lapangan? Status akan diubah menjadi <strong style={{ color: 'var(--green)', fontWeight: 600 }}>Resolved</strong>.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button 
                onClick={closeModal} 
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--white)', border: '1px solid var(--border2)', fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.15s' }} 
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-primary)' }} 
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                Batal
              </button>
              <button 
                onClick={handleResolve} 
                style={{ padding: '8px 16px', borderRadius: 8, background: 'var(--green)', border: 'none', fontSize: 13, fontWeight: 500, color: '#fff', cursor: 'pointer', transition: 'background 0.15s' }} 
                onMouseEnter={e => e.currentTarget.style.background = '#15803d'} 
                onMouseLeave={e => e.currentTarget.style.background = 'var(--green)'}>
                Ya, Tandai Selesai
              </button>
            </div>
          </div>
          <style>{`
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
            @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
            @keyframes modalOut { from { opacity: 1; transform: scale(1) translateY(0); } to { opacity: 0; transform: scale(0.95) translateY(10px); } }
          `}</style>
        </div>
      )}
    </div>
  )
}