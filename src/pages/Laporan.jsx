// src/pages/Laporan.jsx
import { useState, useRef, useEffect } from 'react'
import { Download, Loader2, ChevronDown, Check, X } from 'lucide-react'
import { PageHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

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

// [BARU] Komponen MultiSelect yang lebih elegan dengan tag dan tombol 'x'
function MultiSelect({ selectedOptions, onChange, options }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isBoxHovered, setIsBoxHovered] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false) };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const allOptionValues = options.filter(o => o.value !== 'all').map(o => o.value);
  const allAreSelected = allOptionValues.length > 0 && allOptionValues.every(v => selectedOptions.includes(v));

  const handleSelect = (value) => {
    let newSelection;
    // Jika user klik "Semua Tipe", toggle antara pilih semua atau kosongkan semua
    if (value === 'all') {
      if (allAreSelected) {
        newSelection = ['all']; // Kosongkan pilihan
      } else {
        newSelection = allOptionValues; // Pilih semua
      }
      setIsOpen(false); // Langsung tutup dropdown saat "Semua Tipe" diklik
    } else {
      // Ambil pilihan saat ini (tanpa 'all')
      const currentSelection = selectedOptions.filter(opt => opt !== 'all');
      if (currentSelection.includes(value)) {
        newSelection = currentSelection.filter(opt => opt !== value);
      } else {
        newSelection = [...currentSelection, value];
      }
      // Jika pilihan jadi kosong, kembalikan ke 'all'
      if (newSelection.length === 0) newSelection = ['all'];
    }
    onChange(newSelection);
  };

  // Fungsi untuk menghapus item langsung dari tag 'x'
  const handleRemove = (valueToRemove) => {
    let newSelection = selectedOptions.filter(opt => opt !== valueToRemove);
    if (newSelection.length === 0) newSelection = ['all'];
    onChange(newSelection);
  };

  const actualSelections = selectedOptions.filter(opt => opt !== 'all');
  const isSelectionEmpty = selectedOptions.includes('all') || selectedOptions.length === 0;

  return (
    <div ref={ref} style={{ position: 'relative', minWidth: 250 }} onMouseEnter={() => setIsBoxHovered(true)} onMouseLeave={() => setIsBoxHovered(false)}>
      <div onClick={() => setIsOpen(!isOpen)} style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, padding: '5px 40px 5px 8px', minHeight: 38, borderRadius: '8px', border: `1px solid ${isOpen ? 'var(--accent)' : 'var(--border2)'}`, background: 'var(--white)', fontSize: '12.5px', fontWeight: '500', color: 'var(--text-primary)', cursor: 'pointer', boxShadow: '0 1px 3px rgba(0,0,0,0.02)', transition: 'all 0.15s ease', userSelect: 'none' }} onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'} onMouseLeave={e => e.currentTarget.style.borderColor = isOpen ? 'var(--accent)' : 'var(--border2)'}>
        {/* Render tag untuk setiap item yang dipilih */}
        {actualSelections.map(value => {
          const option = options.find(o => o.value === value);
          if (!option) return null;
          return (
            <div key={value} style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--bg)', padding: '4px 6px 4px 8px', borderRadius: 5, fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>
              {option.label}
              <button onClick={(e) => { e.stopPropagation(); handleRemove(value); }} style={{ background: 'none', border: 'none', padding: 2, margin: -2, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer', color: 'var(--text-muted)' }} onMouseEnter={e => e.currentTarget.style.color = 'var(--red)'} onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}>
                <X size={12} />
              </button>
            </div>
          );
        })}
        {/* Placeholder saat tidak ada yang dipilih */}
        {isSelectionEmpty && (
          <span style={{ color: 'var(--text-muted)', paddingLeft: 4 }}>
            Pilih tipe...
          </span>
        )}
      </div>
      
      {/* Tombol X (Clear All) muncul jika ada pilihan DAN kursor sedang hover di kotak */}
      {!isSelectionEmpty && isBoxHovered ? (
        <div 
          onClick={(e) => { e.stopPropagation(); onChange(['all']); }}
          style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 22, height: 22, borderRadius: '50%', background: 'var(--bg)', color: 'var(--text-muted)', cursor: 'pointer', transition: 'all 0.15s' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-light)'; e.currentTarget.style.color = 'var(--red)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          title="Hapus semua pilihan"
        >
          <X size={13} strokeWidth={2.5} />
        </div>
      ) : (
        <ChevronDown size={14} style={{ position: 'absolute', right: '14px', top: '50%', transform: `translateY(-50%) ${isOpen ? 'rotate(180deg)' : ''}`, transition: 'transform 0.2s', pointerEvents: 'none', color: 'var(--text-muted)' }} />
      )}
      {isOpen && (
        <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, width: '100%', background: 'var(--white)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: 'var(--shadow-md)', zIndex: 100, overflow: 'hidden', padding: '4px 0', animation: 'fadeIn 0.15s ease-out' }}>
          {options.map(o => {
            let isSelected;
            if (o.value === 'all') {
              isSelected = allAreSelected;
            } else {
              isSelected = selectedOptions.includes(o.value);
            }
            return (
              <div key={o.value} onClick={() => handleSelect(o.value)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 16px', fontSize: '12.5px', fontWeight: isSelected ? '600' : '500', color: isSelected ? 'var(--accent)' : 'var(--text-secondary)', background: 'transparent', cursor: 'pointer', transition: 'background 0.1s', whiteSpace: 'nowrap' }} onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--bg)' }} onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}>
                <div style={{ width: 16, height: 16, borderRadius: 4, border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border2)'}`, background: isSelected ? 'var(--accent)' : 'var(--white)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', transition: 'all 0.15s' }}>
                  {isSelected && <Check size={11} strokeWidth={3} />}
                </div>
                {o.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const EXPORTS = [
  { id: 'raw',      icon:'📡', iconBg:'var(--accent2-light)', title:'Raw Data Parameter Seluler',     desc:'Seluruh data mentah hasil scan (Normal, Fake) beserta koordinat.' },
  { id: 'imsi',     icon:'📋', iconBg:'var(--amber-light)',   title:'Laporan Android ID & Device Terdampak',desc:'Daftar korban (Android ID) yang pernah tersambung ke perangkat ilegal.' },
]

// Fungsi sakti untuk mengubah JSON Array menjadi file CSV
const downloadCSV = (data, filename) => {
  if (!data || !data.length) {
    alert('Tidak ada data untuk rentang waktu/filter ini.')
    return
  }

  const separator = ';' // Menggunakan titik koma agar Excel Indonesia otomatis memisahkannya
  const headers = Object.keys(data[0])
  const csvRows = [headers.join(separator)] // Baris pertama adalah Header

  for (const row of data) {
    const values = headers.map(header => {
      const val = row[header]
      if (val === null || val === undefined) return ''
      const str = String(val)
      // Mencegah error jika di dalam data terdapat tanda koma atau kutip
      if (str.includes(separator) || str.includes('\n') || str.includes('"')) {
        return `"${str.replace(/"/g, '""')}"`
      }
      return str
    })
    csvRows.push(values.join(separator))
  }

  // Tambahkan \uFEFF (BOM) agar Microsoft Excel bisa membaca karakter dengan sempurna
  const blob = new Blob(['\uFEFF' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.setAttribute('download', `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export default function Laporan() {
  const [timeFilter, setTimeFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState(['all']) // Diubah menjadi array
  const [exportingId, setExportingId] = useState(null)
  
  const handleExport = async (reportId) => {
    setExportingId(reportId)
    try {
      let query = supabase.from('bts_readings').select('*').order('created_at', { ascending: false })

      // 1. Terapkan Filter Waktu
      if (timeFilter !== 'all') {
        const days = parseInt(timeFilter, 10)
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        query = query.gte('created_at', cutoff.toISOString())
      }

      // 2. Terapkan Filter Status Umum
      if (!typeFilter.includes('all') && typeFilter.length > 0) {
        query = query.in('status', typeFilter)
      }

      // 3. Terapkan Filter Spesifik per Jenis Laporan
      if (reportId === 'imsi') {
        query = query.not('imsi', 'is', null) // Hanya tarik yang ada data IMSI korban
      }

      // Batasi maksimal 5000 baris agar browser tidak nge-hang saat export
      const { data, error } = await query.limit(5000)
      
      if (error) throw error

      const dateLabel = new Date().toISOString().split('T')[0]
      downloadCSV(data, `Export_${reportId}_${dateLabel}`)

    } catch (err) {
      alert('Gagal mengekspor data: ' + err.message)
    } finally {
      setExportingId(null)
    }
  }

  return (
    <div>
      <PageHeader title="Laporan & Export Data" sub="Ekspor data deteksi Fake BTS ke format CSV (Excel)." />
      <div style={{ display:'flex', gap:10, marginBottom:16, flexWrap:'wrap' }}>
        <ElegantSelect value={timeFilter} onChange={setTimeFilter} options={[{value:'7',label:'7 Hari Terakhir'},{value:'30',label:'30 Hari'},{value:'90',label:'3 Bulan'},{value:'all',label:'Semua Data'}]} />
        <MultiSelect selectedOptions={typeFilter} onChange={setTypeFilter} options={[{value:'all',label:'Semua Tipe'},{value:'fake_bts',label:'Fake BTS'},{value:'normal',label:'Normal'}]} />
      </div>

      <style>{`
        .export-card { display: flex; align-items: center; gap: 16px; }
        .export-info { display: flex; align-items: center; gap: 16px; flex: 1; }
        .export-btn-wrap { display: flex; gap: 8px; flex-shrink: 0; }
        @media (max-width: 650px) {
          .export-card { flex-direction: column; align-items: stretch; gap: 14px; }
          .export-btn-wrap button { width: 100%; justify-content: center; }
        }
      `}</style>

      {EXPORTS.map((ex) => (
        <div key={ex.id} className="export-card" style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, marginBottom:14 }}>
          <div className="export-info">
            <div style={{ width:48, height:48, borderRadius:12, background:ex.iconBg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, flexShrink:0 }}>{ex.icon}</div>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>{ex.title}</div>
              <div style={{ fontSize:12.5, color:'var(--text-muted)', lineHeight:1.5 }}>{ex.desc}</div>
            </div>
          </div>
          <div className="export-btn-wrap">
            <button 
              onClick={() => handleExport(ex.id)} 
              disabled={exportingId === ex.id}
              style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:7, background:'var(--green-light)', color:'var(--green)', border:'1px solid rgba(22,163,74,0.2)', fontSize:12.5, fontWeight:500, cursor: exportingId === ex.id ? 'not-allowed' : 'pointer', opacity: exportingId === ex.id ? 0.7 : 1 }}>
              {exportingId === ex.id ? <Loader2 size={13} className="spin" /> : <Download size={13} />} 
              {exportingId === ex.id ? 'Mengunduh...' : 'Unduh CSV (Excel)'}
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}