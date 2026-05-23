// src/pages/PersonalInfo.jsx
import { useState, useRef } from 'react'
import { User, Upload, Save, Trash2, ZoomIn, ZoomOut } from 'lucide-react'
import { PageHeader, CardHeader } from '../components/ui'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

function Field({ label, value, onChange, onBlur, readOnly = false, placeholder }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)' }}>{label}</label>
      <input
        value={value}
        placeholder={placeholder}
        onChange={e => onChange && onChange(e.target.value)}
        readOnly={readOnly}
        style={{
          padding: '9px 12px',
          border: '1px solid var(--border2)',
          borderRadius: 7,
          fontSize: 13,
          fontFamily: 'DM Sans, sans-serif',
          color: readOnly ? 'var(--text-muted)' : 'var(--text-primary)',
          background: readOnly ? 'var(--bg)' : 'var(--white)',
          outline: 'none',
          transition: 'border-color 0.15s',
        }}
        onFocus={e => {
          if (!readOnly) e.target.style.borderColor = 'var(--accent)';
          if (placeholder) e.target.placeholder = ''; // Hilangkan placeholder saat di-klik
        }}
        onBlur={e => {
          e.target.style.borderColor = 'var(--border2)';
          if (placeholder) e.target.placeholder = placeholder; // Munculkan kembali jika kosong
          if (onBlur) onBlur(e);
        }}
      />
    </div>
  ) 
}

// Fungsi untuk merapikan teks menjadi Title Case (Huruf besar di awal kata)
function formatTitleCase(str) {
  if (!str) return '';
  return str.replace(/\w\S*/g, (txt) => {
    const lower = txt.toLowerCase();
    // Pengecualian untuk singkatan khusus agar tetap kapital semua
    if (['it', 'noc', 'bts', 'rf', 'ip', 'lte', '5g', 'sqa'].includes(lower)) return lower.toUpperCase();
    return txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase();
  });
}

export default function PersonalInfo() {
  const { user, updatePassword } = useAuth()
  const meta = user?.user_metadata || {}
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    name:     meta.full_name   || user?.email?.split('@')[0] || '',
    id:       meta.operator_id || '—',
    divisi:   meta.divisi      || '',
    org:      meta.org         || '',
    email:    user?.email      || '',
    phone:    meta.phone       || '',
    region:   meta.region      || '',
    linkedin: meta.linkedin    || '',
  })
  const [saved, setSaved] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(meta.avatar_url || null)
  const [saving, setSaving] = useState(false)
  const [pendingFile, setPendingFile] = useState(null)
  const [shouldRemovePhoto, setShouldRemovePhoto] = useState(false)
  
  // State untuk Modal Cropper
  const [cropModalOpen, setCropModalOpen] = useState(false)
  const [isCropClosing, setIsCropClosing] = useState(false)
  const [tempImgSrc, setTempImgSrc] = useState(null)
  const [zoom, setZoom] = useState(1)
  // State dan Ref untuk fitur geser (Drag)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const isDragging = useRef(false)
  const dragStart = useRef({ x: 0, y: 0 })
  const imgRef = useRef(null)
  const [imgDim, setImgDim] = useState({ w: 0, h: 0 }) // Menyimpan resolusi asli foto

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))
  const formatAndSet = (key) => () => {
    setForm(f => ({ ...f, [key]: formatTitleCase(f[key]) }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Buka gambar di dalam Modal Cropper alih-alih langsung di-preview
    const objectUrl = URL.createObjectURL(file)
    setTempImgSrc(objectUrl)
    setZoom(1)
    setOffset({ x: 0, y: 0 }) // Reset posisi saat ganti foto
    setImgDim({ w: 0, h: 0 }) // Reset dimensi
    setCropModalOpen(true)
    
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const closeCropModal = () => {
    setIsCropClosing(true)
    setTimeout(() => {
      setCropModalOpen(false)
      setIsCropClosing(false)
      setTempImgSrc(null)
    }, 200)
  }

  // Rumus matematika untuk MENCEGAH foto keluar dari batas lingkaran
  const clampOffset = (x, y, currentZoom) => {
    if (!imgDim.w) return { x, y }
    const size = 220
    const baseScale = Math.max(size / imgDim.w, size / imgDim.h)
    const w0 = imgDim.w * baseScale
    const h0 = imgDim.h * baseScale

    // KALKULASI PRESISI: Batas mentok adalah (Lebar Skala - Lebar Masking) dibagi 2.
    const maxX = Math.max(0, (w0 * currentZoom - size) / 2)
    const maxY = Math.max(0, (h0 * currentZoom - size) / 2)

    return {
      x: Math.min(Math.max(x, -maxX), maxX),
      y: Math.min(Math.max(y, -maxY), maxY)
    }
  }

  // Logika Drag & Drop
  const onDragStart = (clientX, clientY) => {
    isDragging.current = true
    dragStart.current = { x: clientX - offset.x, y: clientY - offset.y }
  }
  const onDragMove = (clientX, clientY) => {
    if (!isDragging.current) return
    setOffset(clampOffset(clientX - dragStart.current.x, clientY - dragStart.current.y, zoom))
  }
  const onDragEnd = () => { isDragging.current = false }

  const handleMouseDown = (e) => { e.preventDefault(); onDragStart(e.clientX, e.clientY) }
  const handleMouseMove = (e) => onDragMove(e.clientX, e.clientY)
  
  const handleTouchStart = (e) => onDragStart(e.touches[0].clientX, e.touches[0].clientY)
  const handleTouchMove = (e) => onDragMove(e.touches[0].clientX, e.touches[0].clientY)

  // Logika Zoom menggunakan Scroll Mouse (Roda Kursor)
  const handleWheel = (e) => {
    // Pengguna trackpad biasanya memicu pinch dengan membawa properti ctrlKey
    const speed = e.ctrlKey ? 0.005 : 0.002
    setZoom(prev => {
      const newZoom = Math.max(1, Math.min(prev - e.deltaY * speed, 4))
      setOffset(prevOffset => clampOffset(prevOffset.x, prevOffset.y, newZoom)) // Paksa ke tengah jika melewati batas saat zoom out
      return newZoom
    })
  }

  // Fungsi ajaib untuk memotong (Crop) gambar menggunakan HTML5 Canvas
  const applyCrop = () => {
    if (!imgRef.current || !imgDim.w) return
    const canvas = document.createElement('canvas')
    const size = 300 // Resolusi kualitas hasil potongan (300x300 pixel)
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    const img = imgRef.current

    // Gambar background putih (untuk gambar transparan) lalu gambar fotonya
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, size, size)

    // KALKULASI PRESISI: Sinkronisasi Canvas dengan posisi CSS Transform
    // 1. Pindah ke titik tengah canvas, ditambah offset geseran murni (disesuaikan rasionya ke 300px)
    ctx.translate(size / 2 + offset.x * (size / 220), size / 2 + offset.y * (size / 220))
    // 2. Terapkan skala agar foto memenuhi canvas, dikali tingkat zoom kursor
    const canvasCoverScale = Math.max(size / img.naturalWidth, size / img.naturalHeight)
    ctx.scale(canvasCoverScale * zoom, canvasCoverScale * zoom)
    // 3. Lukis foto tepat di tengah koordinat
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2)

    // Konversi hasil lukisan Canvas menjadi File Asli untuk siap di-upload
    canvas.toBlob((blob) => {
      if (!blob) return
      const file = new File([blob], `avatar-${Date.now()}.jpg`, { type: 'image/jpeg' })
      setPendingFile(file)
      setAvatarUrl(URL.createObjectURL(blob))
      setShouldRemovePhoto(false)
      closeCropModal()
    }, 'image/jpeg', 0.95)
  }

  const handleRemovePhoto = () => {
    setAvatarUrl(null)
    setPendingFile(null)
    setShouldRemovePhoto(true) // Tandai bahwa foto harus dihapus saat klik Simpan
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let finalAvatarUrl = meta.avatar_url

      // 1. Jika pengguna meminta untuk hapus foto lama
      if (shouldRemovePhoto) {
        if (meta.avatar_url) {
          const filename = meta.avatar_url.split('/').pop()
          await supabase.storage.from('avatars').remove([filename])
        }
        finalAvatarUrl = null
      } 
      // 2. Atau jika ada file upload foto baru
      else if (pendingFile) {
        const fileExt = pendingFile.name.split('.').pop()
        const fileName = `${user.id}-${Math.random()}.${fileExt}`
        const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, pendingFile)
        if (uploadError) throw uploadError
        
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName)
        finalAvatarUrl = publicUrl
      }

      // 3. Simpan SEKALIGUS perubahan Foto & Text Field ke Database Auth Metadata
      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: finalAvatarUrl,
          full_name:  formatTitleCase(form.name),
          divisi:     formatTitleCase(form.divisi),
          org:        formatTitleCase(form.org),
          phone:      form.phone,
          region:     formatTitleCase(form.region),
          linkedin:   form.linkedin,
        }
      })
      if (updateError) throw updateError

      setPendingFile(null)
      setShouldRemovePhoto(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (error) {
      alert('Gagal menyimpan profil: ' + error.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <PageHeader
        title="Personal Information"
        sub="Kelola informasi personal dan detail akun Anda."
      />

      <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
        <CardHeader title="Personal Information" icon={User} />
        <div style={{ padding: '20px 24px' }}>

          {/* Avatar row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 24, paddingBottom: 20, borderBottom: '1px solid var(--border)' }}>
            <div style={{ width: 72, height: 72, borderRadius: '50%', background: 'linear-gradient(135deg,#e63950,#ff6b81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 26, flexShrink: 0, overflow: 'hidden' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Avatar Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
              form.name ? form.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : 'A'
              )}
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)' }}>{form.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 3 }}>
                {form.id} · {form.divisi || '—'}
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--white)', fontSize: 12, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer', transition: 'all 0.12s' }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.color = 'var(--text-secondary)' }}>
                  <Upload size={12} /> Ganti Foto
                </button>
                {/* Tombol Hapus akan muncul jika foto preview/asli tersedia */}
                {avatarUrl && (
                  <button 
                    onClick={handleRemovePhoto}
                    disabled={saving}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border2)', background: 'var(--white)', fontSize: 12, fontWeight: 500, color: 'var(--red)', cursor: 'pointer', transition: 'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--red)'; e.currentTarget.style.background = 'var(--red-light)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border2)'; e.currentTarget.style.background = 'var(--white)' }}>
                    <Trash2 size={12} /> Hapus
                  </button>
                )}
              </div>
              <input 
                type="file" 
                accept="image/*" 
                ref={fileInputRef} 
                onChange={handlePhotoChange} 
                style={{ display: 'none' }} 
              />
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Maks. Size 1MB</div>
            </div>
          </div>

          {/* Form grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px 20px' }}>
            <Field label="Nama Lengkap" value={form.name}  onChange={set('name')} onBlur={formatAndSet('name')} />
            <Field label="ID Operator"  value={form.id}    readOnly />
            <Field label="Divisi"       value={form.divisi} onChange={set('divisi')} onBlur={formatAndSet('divisi')} placeholder="—" />
            <Field label="Instansi"     value={form.org}   onChange={set('org')} onBlur={formatAndSet('org')} placeholder="—" />
          </div>

          {/* Contact section */}
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', margin: '20px 0 12px', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>
            Informasi Kontak
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '14px 20px' }}>
            <Field label="Email"          value={form.email}   onChange={set('email')} />
            <Field label="Telepon"        value={form.phone}   onChange={set('phone')} />
            <Field label="LinkedIn URL"   value={form.linkedin} onChange={set('linkedin')} />
            <Field label="Wilayah Tugas"  value={form.region}  onChange={set('region')} onBlur={formatAndSet('region')} placeholder="—" />
          </div>

          {/* Save button */}
          <button onClick={handleSave} disabled={saving}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginTop: 20, padding: '9px 22px', borderRadius: 8, background: saved ? 'var(--green)' : 'var(--accent)', color: '#fff', fontSize: 13, fontWeight: 500, border: 'none', cursor: saving ? 'not-allowed' : 'pointer', transition: 'background 0.2s', opacity: saving ? 0.8 : 1 }}>
            <Save size={14} />
            {saving ? 'Menyimpan...' : saved ? 'Tersimpan ✓' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {/* Modal Editor / Cropper Foto */}
      {cropModalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.7)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: isCropClosing ? 'fadeOut 0.2s forwards' : 'fadeIn 0.2s forwards' }}>
          <div style={{ background: 'var(--white)', padding: 24, borderRadius: 16, width: '90%', maxWidth: 380, boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)', animation: isCropClosing ? 'modalOut 0.2s forwards' : 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 20, textAlign: 'center' }}>Sesuaikan Foto Profil</div>
            
            {/* Area Preview Cropper Profesional */}
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
              <div 
                style={{ width: '100%', height: 280, borderRadius: 12, overflow: 'hidden', position: 'relative', background: 'var(--bg2)', cursor: isDragging.current ? 'grabbing' : 'grab', touchAction: 'none' }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={onDragEnd}
                onMouseLeave={onDragEnd}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={onDragEnd}
                onWheel={handleWheel}
              >
                {tempImgSrc && (
                  <>
                    <img 
                      ref={imgRef} src={tempImgSrc} alt="Preview" 
                      onLoad={(e) => setImgDim({ w: e.target.naturalWidth, h: e.target.naturalHeight })}
                      style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${zoom})`, width: imgDim.w ? imgDim.w * Math.max(220 / imgDim.w, 220 / imgDim.h) : 'auto', height: imgDim.h ? imgDim.h * Math.max(220 / imgDim.w, 220 / imgDim.h) : 'auto', pointerEvents: 'none', transformOrigin: 'center center' }} 
                    />
                    {/* Lapisan Gelap & Lubang Potong (Masking) */}
                    <div style={{ position: 'absolute', top: '50%', left: '50%', width: 220, height: 220, transform: 'translate(-50%, -50%)', borderRadius: '50%', boxShadow: '0 0 0 9999px rgba(15, 23, 42, 0.65)', border: '2px solid rgba(255,255,255,0.85)', pointerEvents: 'none' }} />
                  </>
                )}
              </div>
            </div>

            {/* Slider Pengatur Zoom (Fallback elegan untuk pengguna Trackpad/Non-Mouse) */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8, padding: '0 10px' }}>
              <ZoomOut size={16} color="var(--text-muted)" />
              <input type="range" min="1" max="4" step="0.05" value={zoom} onChange={e => { 
                const z = parseFloat(e.target.value); 
                setZoom(z); 
                setOffset(prev => clampOffset(prev.x, prev.y, z)); 
              }} style={{ flex: 1, accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <ZoomIn size={16} color="var(--text-muted)" />
            </div>

            <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', marginBottom: 24 }}>
              Geser foto untuk memposisikan.
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={closeCropModal} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', cursor: 'pointer', transition: 'all 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = 'var(--border)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--bg)'}>
                Batal
              </button>
              <button onClick={applyCrop} style={{ flex: 1, padding: '10px 16px', borderRadius: 8, background: 'var(--accent)', border: 'none', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', transition: 'background 0.15s' }} onMouseEnter={e => e.currentTarget.style.background = '#e11d48'} onMouseLeave={e => e.currentTarget.style.background = 'var(--accent)'}>
                Terapkan
              </button>
            </div>
          </div>
          <style>{`@keyframes fadeIn{from{opacity:0;}to{opacity:1;}} @keyframes fadeOut{from{opacity:1;}to{opacity:0;}} @keyframes modalIn{from{opacity:0;transform:scale(0.95) translateY(10px);}to{opacity:1;transform:scale(1) translateY(0);}} @keyframes modalOut{from{opacity:1;transform:scale(1) translateY(0);}to{opacity:0;transform:scale(0.95) translateY(10px);}}`}</style>
        </div>
      )}
    </div>
  )
}