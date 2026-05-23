import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, CircleMarker, Popup, Circle, Polyline, Marker } from 'react-leaflet'
import { Radio, AlertTriangle, Smartphone, Shield, Activity, ArrowUp, MapPin } from 'lucide-react'
import { MetricCard, Badge, ProgressBar, PageHeader, CardHeader, CardAction, FilterSelect } from '../components/ui'
import { supabase } from '../lib/supabase'
import L from 'leaflet'

// ── Dummy data (diganti dengan Supabase realtime nanti) ──────────────

const markerColor = { normal:'#16a34a', fake_bts:'#dc2626' }

// Fungsi untuk menghitung jarak antara 2 titik koordinat (dalam meter) menggunakan formula Haversine
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 0;
  const R = 6371e3; // Radius bumi dalam meter
  const rLat1 = lat1 * Math.PI / 180;
  const rLat2 = lat2 * Math.PI / 180;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(rLat1) * Math.cos(rLat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [selectedBTS, setSelectedBTS] = useState(null)
  const [metrics, setMetrics] = useState({ total: 0, fake: 0, devices: 0 })
  const [btsList, setBtsList] = useState([]) // State baru untuk menyimpan data peta asli
  const [mapInstance, setMapInstance] = useState(null) // Menyimpan referensi peta
  const [imsiList, setImsiList] = useState([]) // State untuk menyimpan data perangkat IMSI
  const [alertList, setAlertList] = useState([]) // State untuk Alert Terbaru
  const [mapFilter, setMapFilter] = useState('all') // State baru untuk filter peta
  const markerRefs = useRef({}) // Menyimpan referensi/kendali dari setiap titik marker BTS
  const uniqueImsisRef = useRef(new Set()) // Menyimpan daftar IMSI unik yang terdampak
  const uniqueCellsRef = useRef(new Set()) // Menyimpan daftar Cell ID unik
  const uniqueFakeCellsRef = useRef(new Set()) // Menyimpan daftar Cell ID Fake unik
  const [activeListType, setActiveListType] = useState(null) // State untuk memunculkan modal daftar target
  const [userLocation, setUserLocation] = useState(null) // State untuk menyimpan lokasi GPS pengguna

  // State untuk menyimpan data Infrastruktur Menara Fisik dan loading
  const [nearestTowers, setNearestTowers] = useState([])
  const [isLoadingTowers, setIsLoadingTowers] = useState(false)

  // Mengambil data Menara Fisik secara Asynchronous (Siap untuk API sesungguhnya)
  useEffect(() => {
    if (!selectedBTS || !selectedBTS.enb_lat || !selectedBTS.enb_lon) {
      setNearestTowers([])
      return
    }

    const fetchRealTowers = async () => {
      setNearestTowers([])
      setIsLoadingTowers(true)
      let apiSuccess = false // Flag untuk melacak apakah API berhasil
      try {
        const lat = selectedBTS.enb_lat
        const lng = selectedBTS.enb_lon
        
        // === 🚀 TEMPAT MASUKIN API BENERAN ===
        // Mengambil Token dengan aman dari file .env
        
        // Gunakan import.meta.env jika pakai Vite, atau process.env.REACT_APP_OPENCELLID_TOKEN jika pakai Create React App
        const API_KEY = import.meta.env.VITE_OPENCELLID_TOKEN
        
        // Menggunakan OpenCelliD Bounding Box API (Mencari menara berdasarkan radius kotak koordinat)
        // Menggunakan proxy gratis AllOrigins agar tidak terkena error CORS Block dari Browser
        const bbox = `${lng - 0.01},${lat - 0.01},${lng + 0.01},${lat + 0.01}`
        const targetUrl = encodeURIComponent(`https://opencellid.org/cell/getInArea?key=${API_KEY}&BBOX=${bbox}&format=json`)
        
        const res = await fetch(`https://api.allorigins.win/raw?url=${targetUrl}`)
        const data = await res.json()
        
        console.log("Log API OpenCelliD:", data) // Silakan cek Console (F12) untuk melihat pesan dari API
        
        // API OpenCelliD mengembalikan data berupa Array jika berhasil
        if (Array.isArray(data) && data.length > 0) {
          const realTowers = data.map(c => ({
            id: c.cell,
            provider: c.mcc === 510 && c.mnc === 10 ? 'Telkomsel' : (c.mnc === 1 ? 'Indosat Ooredoo Hutchison' : (c.mnc === 11 ? 'XL Smart' : 'Provider Asli')),
            latitude: c.lat,
            longitude: c.lon,
            cell_id: c.cell,
            distance: getDistance(lat, lng, c.lat, c.lon),
            isApi: true // Flag bahwa data ini asli dari API
          }))
          // Sortir berdasarkan jarak terdekat dan ambil 3
          setNearestTowers(realTowers.sort((a,b) => a.distance - b.distance).slice(0, 3))
          apiSuccess = true // Berhasil pakai API!
        }
        
      } catch (error) {
        console.error("Gagal memuat API OpenCelliD:", error)
      } finally {
        // === FALLBACK SIMULASI ===
        // Dijalankan jika API gagal (baik karena error jaringan, proxy down, atau limit)
        if (!apiSuccess) {
          const lat = selectedBTS.enb_lat
          const lng = selectedBTS.enb_lon
          const providers = ['Telkomsel', 'Indosat Ooredoo Hutchison', 'XL Smart']
          const towers = []
          for (let i = 1; i <= 3; i++) {
            const offsetLat = (Math.sin(lat * 10000 + i) * 0.005)
            const offsetLng = (Math.cos(lng * 10000 + i) * 0.005)
            const pIndex = (Math.floor(Math.abs(lat * 100000)) + i) % 3 // Memastikan index selalu mutlak 0, 1, atau 2
            
            towers.push({
              id: `tower-${selectedBTS.id}-${i}`,
              provider: providers[pIndex],
              latitude: lat + offsetLat,
              longitude: lng + offsetLng,
              cell_id: Math.abs(Math.floor(Math.sin(lat * 1000 + i) * 9000)) + 1000,
              distance: getDistance(lat, lng, lat + offsetLat, lng + offsetLng),
              isApi: false 
            })
          }
          setTimeout(() => setNearestTowers(towers.sort((a,b) => a.distance - b.distance)), 600)
        }
        setTimeout(() => setIsLoadingTowers(false), 600)
      }
    }
    
    fetchRealTowers()
  }, [selectedBTS])

  // Supabase realtime subscription untuk metrics
  useEffect(() => {
    // 1. Ambil data asli dari Supabase saat halaman pertama kali dimuat
    const fetchMetrics = async () => {
      const [
        { data: allCellsData }, // Ambil data semua BTS untuk hitung unique Cell ID
        { data: devicesData }, // Diubah untuk mengambil data IMSI guna dihitung uniknya
        { data: mapThreats }, // [BARU] Ambil khusus data ancaman 
        { data: mapGeneral }, // [BARU] Ambil data terbaru secara umum
        { data: imsiData },
        { data: alertsData }
      ] = await Promise.all([
        // Ambil semua id, cell_id dan status untuk menghitung Total BTS berdasarkan Cell ID Unik
        supabase.from('bts_readings').select('id, cell_id, status, incident_status'),
        supabase.from('bts_readings').select('imsi').eq('status', 'fake_bts').not('imsi', 'is', null),
        
        supabase.from('bts_readings').select('*').not('enb_lat', 'is', null).not('enb_lon', 'is', null).eq('status', 'fake_bts').or('incident_status.neq.resolved,incident_status.is.null').order('created_at', { ascending: false }).limit(50),
        supabase.from('bts_readings').select('*').not('enb_lat', 'is', null).not('enb_lon', 'is', null).or('incident_status.neq.resolved,incident_status.is.null').order('created_at', { ascending: false }).limit(100),
        
        supabase.from('bts_readings').select('*').not('imsi', 'is', null).order('created_at', { ascending: false }).limit(6),
        supabase.from('bts_readings').select('*').eq('status', 'fake_bts').or('incident_status.neq.resolved,incident_status.is.null').order('created_at', { ascending: false }).limit(5)
      ])

      if (allCellsData) {
        uniqueCellsRef.current.clear()
        uniqueFakeCellsRef.current.clear()
        allCellsData.forEach(row => {
          // Gunakan id sebagai fallback jika cell_id kosong agar tidak hilang dari hitungan
          const targetCellId = row.cell_id || row.id
          if (targetCellId) {
            uniqueCellsRef.current.add(targetCellId)
            // Hanya hitung Fake BTS yang belum diselesaikan (resolved)
            if (row.status === 'fake_bts' && row.incident_status !== 'resolved') {
              uniqueFakeCellsRef.current.add(targetCellId)
            }
          }
        })
      }

      if (devicesData) {
        uniqueImsisRef.current.clear()
        devicesData.forEach(d => uniqueImsisRef.current.add(d.imsi))
      }

      setMetrics({
        total: uniqueCellsRef.current.size,
        fake: uniqueFakeCellsRef.current.size,
        devices: uniqueImsisRef.current.size
      })

      if (mapThreats || mapGeneral) {
        // Gabungkan data ancaman dan umum, lalu hilangkan duplikat BERDASARKAN CELL_ID
        const mergedMap = new Map()
        if (mapGeneral) mapGeneral.forEach(b => mergedMap.set(b.cell_id || b.id, b))
        if (mapThreats) mapThreats.forEach(b => mergedMap.set(b.cell_id || b.id, b))
        
        const combined = Array.from(mergedMap.values())
        
        // Pisahkan lagi untuk menerapkan perlindungan limit maksimal 100 render di peta
        const threats = combined.filter(b => b.status === 'fake_bts')
        const normals = combined.filter(b => b.status !== 'fake_bts')
        
        // Isi slot peta pertama dengan ancaman, sisanya untuk sinyal normal
        const maxNormals = Math.max(0, 100 - threats.length)
        setBtsList([...threats, ...normals.slice(0, maxNormals)].sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now())))
      }
      
      if (imsiData) setImsiList(imsiData)
      if (alertsData) setAlertList(alertsData)
    }
    fetchMetrics()

    // 2. Dengarkan perubahan data baru secara real-time
    const channel = supabase
      .channel('bts-metrics')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bts_readings' }, payload => {
        const isThreat = payload.new.status === 'fake_bts'
        
        let isNewDevice = false
        if (isThreat && payload.new.imsi && !uniqueImsisRef.current.has(payload.new.imsi)) {
          uniqueImsisRef.current.add(payload.new.imsi)
          isNewDevice = true
        }

        let isNewCell = false
        let isNewFakeCell = false
        const cellId = payload.new.cell_id || payload.new.id
        
        if (cellId) {
          if (!uniqueCellsRef.current.has(cellId)) {
            uniqueCellsRef.current.add(cellId)
            isNewCell = true
          }
          if (isThreat && !uniqueFakeCellsRef.current.has(cellId)) {
            uniqueFakeCellsRef.current.add(cellId)
            isNewFakeCell = true
          }
        }

        setMetrics(prev => ({
          total: isNewCell ? prev.total + 1 : prev.total,
          fake: isNewFakeCell ? prev.fake + 1 : prev.fake,
          devices: isNewDevice ? prev.devices + 1 : prev.devices // Hanya bertambah jika HP (IMSI) ini belum pernah terdata sebelumnya
        }))

        // Gambar titik baru di peta jika data memiliki koordinat
        if (payload.new.enb_lat && payload.new.enb_lon) {
          setBtsList(prev => {
            // Hapus data lama dengan cell_id yang sama agar titik di peta tidak dobel
            const filteredPrev = prev.filter(b => (b.cell_id || b.id) !== (payload.new.cell_id || payload.new.id))
            const combined = [payload.new, ...filteredPrev]
            // 1. Amankan data ancaman (Fake BTS) agar tidak ikut terpotong
            const threats = combined.filter(b => b.status === 'fake_bts')
            const normals = combined.filter(b => b.status !== 'fake_bts')
            
            // 2. Pertahankan semua ancaman, isi sisa slot dengan data normal (maks 100 titik)
            const maxNormals = Math.max(0, 100 - threats.length)
            return [...threats, ...normals.slice(0, maxNormals)]
              .sort((a, b) => new Date(b.created_at || Date.now()) - new Date(a.created_at || Date.now()))
          })
        }

        // Tambahkan baris baru ke tabel IMSI jika ada data imsi
        if (payload.new.imsi) {
          setImsiList(prev => [payload.new, ...prev].slice(0, 6))
        }

        // Tambahkan ke panel Alert jika statusnya fake_bts
        if (payload.new.status === 'fake_bts') {
          setAlertList(prev => [{ ...payload.new, isNew: true }, ...prev].slice(0, 5))
        }
      })
      // Dengarkan perubahan data, jika ada yang ditandai Selesai, perbarui Dashboard!
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bts_readings' }, payload => {
        if (payload.new.incident_status === 'resolved') fetchMetrics()
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Efek untuk mendapatkan lokasi GPS pengguna secara langsung saat peta dimuat
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const loc = [latitude, longitude];
          setUserLocation(loc);
          // Otomatis terbang ke lokasi pengguna jika peta sudah siap
          if (mapInstance && !selectedBTS) {
            mapInstance.flyTo(loc, 14, { duration: 1.5 });
          }
        },
        (err) => console.warn("Gagal mendapatkan lokasi GPS:", err),
        { enableHighAccuracy: true }
      );
    }
  }, [mapInstance, selectedBTS]);

  const statusColor = (s) => ({ real: 'green', fake: 'red' }[s])

  // --- KALKULASI THREAT LEVEL DINAMIS ---
  // 1. Zona Risiko: Persentase Fake BTS dibandingkan Total BTS
  const safeTotal = metrics.total > 0 ? metrics.total : 1
  const riskZonePct = Math.min(100, Math.round((metrics.fake / safeTotal) * 100))
  // 2. Integritas Jaringan: 100% dikurangi risiko
  const integrityPct = 100 - riskZonePct
  // 3. ML Confidence: Rata-rata persentase confidence dari ancaman yang terdeteksi
  const threatsWithConf = btsList.filter(b => b.status === 'fake_bts' && b.confidence)
  const avgConfidence = threatsWithConf.length > 0 
    ? Math.round(threatsWithConf.reduce((sum, b) => sum + Number(b.confidence), 0) / threatsWithConf.length)
    : 98 // Angka default/bawaan model jika tidak ada ancaman
  // 4. Coverage Monitoring: Persentase sensor aktif (unik) dari total target sensor
  const uniqueSensors = new Set(btsList.map(b => b.sensor_id).filter(Boolean)).size
  const TOTAL_SENSORS_DEPLOYED = 9 // Asumsi target ada 9 HP/Sensor di lapangan (bisa disesuaikan)
  // Jika data sensor_id belum ada, kita berikan fallback 88% agar grafik tidak kosong saat testing
  const coveragePct = uniqueSensors > 0 ? Math.min(100, Math.round((uniqueSensors / TOTAL_SENSORS_DEPLOYED) * 100)) : 88

  // Filter data peta sebelum di-render ke layar
  const filteredBtsList = mapFilter === 'all' ? btsList : btsList.filter(b => b.status === mapFilter)

  return (
    <div>
      <PageHeader title="Dashboard Utama" sub="Pantau BTS dan ancaman Fake BTS secara real-time." />

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 20 }}>
        <div onClick={() => setActiveListType('total')} style={{ cursor: 'pointer', transition: 'transform 0.15s', height: '100%' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} title="Klik untuk melihat daftar">
          <MetricCard label="Total BTS Terdeteksi" value={metrics.total} sub="📡 Klik utk lihat semua"   color="green" icon={Radio} />
        </div>
        <div onClick={() => setActiveListType('devices')} style={{ cursor: 'pointer', transition: 'transform 0.15s', height: '100%' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} title="Klik untuk melihat daftar">
          <MetricCard label="Device Terdampak"      value={metrics.devices} sub="🔍 Klik utk lihat list" color="blue" icon={Smartphone} />
        </div>
        <div onClick={() => setActiveListType('fake_bts')} style={{ cursor: 'pointer', transition: 'transform 0.15s', height: '100%' }} onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'} onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'} title="Klik untuk melihat daftar">
          <MetricCard label="Fake BTS Aktif"        value={metrics.fake} sub="⚠ Klik utk lihat target"  color="red"   icon={AlertTriangle} />
        </div>
      </div>

      <style>{`
        .dash-metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 20px; }
        .dash-grid-top { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 16px; }
        .dash-grid-bot { display: grid; grid-template-columns: 1fr; gap: 16px; }
        .map-col { grid-column: span 2; min-width: 0; }
        .alert-col { grid-column: span 1; min-width: 0; }
        @media (max-width: 1024px) { 
          .dash-metrics, .dash-grid-top, .dash-grid-bot { grid-template-columns: 1fr; }
          .map-col, .alert-col { grid-column: span 1; }
        }

        /* Membuat popup info tembus kursor (drag map) tanpa mentok */
        .popup-tembus { pointer-events: none !important; }
        .popup-tembus .leaflet-popup-content-wrapper,
        .popup-tembus .leaflet-popup-tip { pointer-events: none !important; background: rgba(255,255,255,0.92); backdrop-filter: blur(4px); }
        .popup-tembus .leaflet-popup-close-button { pointer-events: auto !important; }
        
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn { from { opacity: 0; transform: scale(0.95) translateY(10px); } to { opacity: 1; transform: scale(1) translateY(0); } }
      `}</style>

      {/* Map + Alerts */}
      <div className="dash-grid-top">
        {/* MAP */}
        <div className="map-col" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <CardHeader title="Peta Persebaran BTS" icon={Radio}
            action={<div style={{ display: 'flex', gap: 6 }}>
              <CardAction onClick={() => window.location.reload()}>⟳ Scan</CardAction>
              <FilterSelect value={mapFilter} onChange={setMapFilter} options={[
                { value: 'all', label: 'Semua Status' },
                { value: 'fake_bts', label: 'Fake BTS' },
                { value: 'normal', label: 'Normal' }
              ]} />
            </div>}
          />
          <div style={{ padding: 14 }}>
            <div style={{ height: 380, borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
              <MapContainer ref={setMapInstance} center={[-6.9175, 107.6191]} zoom={13} style={{ height: '100%', width: '100%' }} zoomControl={true} attributionControl={false}>
                <TileLayer
                  attribution='&copy; Google Maps'
                  url="https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}"
                  maxZoom={22}
                />
                
                {/* Marker Lokasi Pengguna (Live Location) */}
                {userLocation && (
                  <>
                    <CircleMarker center={userLocation} radius={18} pathOptions={{ color: 'transparent', fillColor: '#3b82f6', fillOpacity: 0.15 }} />
                    <CircleMarker center={userLocation} radius={6} pathOptions={{ color: '#ffffff', fillColor: '#3b82f6', fillOpacity: 1, weight: 2 }}>
                      <Popup className="popup-tembus">
                        <div style={{ fontWeight: 600, fontSize: 12, color: '#3b82f6', fontFamily: 'DM Sans, sans-serif' }}>📍 Lokasi Anda Saat Ini</div>
                      </Popup>
                    </CircleMarker>
                  </>
                )}

                {filteredBtsList.map(bts => (
                  <CircleMarker
                    key={bts.id}
                    ref={(ref) => { if (ref) markerRefs.current[bts.id] = ref }}
                    center={[bts.enb_lat, bts.enb_lon]}
                    radius={bts.status === 'normal' ? 8 : 10}
                    pathOptions={{
                      color: markerColor[bts.status] || '#94a3b8',
                      fillColor: markerColor[bts.status] || '#94a3b8',
                      fillOpacity: 0.85,
                      weight: bts.status === 'fake_bts' ? 2.5 : 1.5,
                    }}
                    eventHandlers={{ 
                      click: () => setSelectedBTS(bts),
                      popupclose: () => { if (selectedBTS?.id === bts.id) setSelectedBTS(null) }
                    }}
                  >
                    <Popup autoPan={false} className="popup-tembus">
                      <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: 160 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: markerColor[bts.status] || '#94a3b8', marginBottom: 6 }}>Cell {bts.cell_id || 'Unknown'}</div>
                        <div style={{ fontSize: 11.5, lineHeight: 1.8 }}>
                          <div><b>Operator:</b> {bts.operator || 'UNKNOWN'}</div>
                          <div><b>Cell ID:</b> {bts.cell_id || '-'}</div>
                          <div><b>RSRP:</b> {bts.rsrp != null && bts.rsrp !== '' ? bts.rsrp : '-'} dBm</div>
                          <div><b>RSRQ:</b> {bts.rsrq != null && bts.rsrq !== '' ? bts.rsrq : '-'} dB</div>
                          <div><b>Status:</b> <span style={{ color: markerColor[bts.status] || '#94a3b8', fontWeight: 600 }}>{(bts.status === 'fake_bts' ? 'FAKE BTS' : bts.status || 'UNKNOWN').toUpperCase()}</span></div>
                        </div>
                        
                        {/* Menampilkan ringkasan Menara Fisik jika marker ini sedang dipilih */}
                        {selectedBTS?.id === bts.id && (isLoadingTowers || nearestTowers.length > 0) && (
                          <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed var(--border)' }}>
                            {isLoadingTowers ? (
                              <div style={{ fontSize: 10.5, color: 'var(--text-muted)', textAlign: 'center', padding: '6px 0', animation: 'pulse-dot 1.5s infinite' }}>Mencari menara (API)...</div>
                            ) : (
                              <>
                                <div style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 4 }}>Infrastruktur Menara Sekitar:</div>
                                {nearestTowers.map(n => (
                                  <div key={n.id} style={{ fontSize: 10.5, display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  🗼 {n.provider} {n.isApi ? <span style={{ color: 'var(--green)', fontSize: 9 }}>(API)</span> : <span style={{ color: 'var(--amber)', fontSize: 9 }}>(Simulasi)</span>}
                                    </span>
                                    <span style={{ color: 'var(--accent2)', fontWeight: 600 }}>{Math.round(n.distance)}m</span>
                                  </div>
                                ))}
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
                {/* Coverage rings for real BTS */}
                {filteredBtsList.filter(b => b.status === 'normal').map(bts => (
                  <Circle key={bts.id+'-cov'} center={[bts.latitude, bts.longitude]} radius={800}
                    pathOptions={{ color: '#16a34a', fillColor: '#16a34a', fillOpacity: 0.04, weight: 0.8, dashArray: '6 4' }} />
                ))}
                
                {/* Render Menara Fisik (Provider) disekitar target */}
                {selectedBTS && nearestTowers.map(tower => (
                  <Marker 
                    key={tower.id} 
                    position={[tower.latitude, tower.longitude]} 
                    icon={new L.DivIcon({
                      className: 'custom-tower-icon',
                      html: `<div style="font-size:22px; filter: drop-shadow(0px 3px 3px rgba(0,0,0,0.4));">🗼</div>`,
                      iconSize: [24, 24],
                      iconAnchor: [12, 24],
                      popupAnchor: [0, -24]
                    })}
                  >
                    <Popup className="popup-tembus">
                      <div style={{ fontFamily: 'DM Sans, sans-serif', minWidth: 140 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#3b82f6', marginBottom: 4 }}>Menara {tower.provider}</div>
                        <div style={{ fontSize: 11.5 }}>
                          <div><b>Cell ID:</b> {tower.cell_id}</div>
                          <div><b>Jarak dari Lokasi:</b> {Math.round(tower.distance)}m</div>
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                ))}
                
                {/* Garis penghubung ke Menara Fisik */}
                {selectedBTS && nearestTowers.map(target => (
                  <Polyline
                    key={`line-${target.id}`}
                    positions={[
                      [selectedBTS.latitude, selectedBTS.longitude],
                      [target.latitude, target.longitude]
                    ]}
                    pathOptions={{ color: '#3b82f6', weight: 2, dashArray: '4 6', opacity: 0.7 }}
                  />
                ))}
              </MapContainer>
              {/* ML badge overlay */}
              <div style={{ position: 'absolute', bottom: 12, right: 12, zIndex: 900, background: 'var(--white)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 500, boxShadow: 'var(--shadow-sm)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--green)', display: 'inline-block', animation: 'pulse-dot 2s infinite' }} />
                ML Model Aktif
              </div>

              {/* Edge Pointers Component (Diisolasi agar titik peta tidak bergetar saat animasi) */}
              <EdgePointers mapInstance={mapInstance} btsList={btsList} mapFilter={mapFilter} markerRefs={markerRefs} onSelectBTS={setSelectedBTS} />
              
              {/* Floating Location Button (Google Maps Style) */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (userLocation && mapInstance) mapInstance.flyTo(userLocation, 15, { duration: 1.5 })
                  else if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(pos => {
                      const loc = [pos.coords.latitude, pos.coords.longitude]
                      setUserLocation(loc)
                      if (mapInstance) mapInstance.flyTo(loc, 15, { duration: 1.5 })
                    })
                  }
                }}
                style={{ position: 'absolute', bottom: 58, right: 12, zIndex: 900, width: 36, height: 36, borderRadius: 8, background: 'var(--white)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: 'var(--shadow-sm)', transition: 'all 0.2s', color: '#3b82f6' }}
                onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg)'; e.currentTarget.style.color = '#2563eb' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--white)'; e.currentTarget.style.color = '#3b82f6' }}
                title="Pusatkan ke Lokasi Saya"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinelinejoin="round">
                  <line x1="2" y1="12" x2="5" y2="12"></line>
                  <line x1="19" y1="12" x2="22" y2="12"></line>
                  <line x1="12" y1="2" x2="12" y2="5"></line>
                  <line x1="12" y1="19" x2="12" y2="22"></line>
                  <circle cx="12" cy="12" r="7"></circle>
                </svg>
              </button>
            </div>

            {/* Legend */}
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              {[['#16a34a','BTS Asli'],['#3b82f6','Device Terdampak'],['#dc2626','Fake BTS']].map(([c,l]) => (
                <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--text-secondary)' }}>
                  <span style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
                  {l}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ALERT PANEL */}
        <div className="alert-col" style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <CardHeader title="Alert Terbaru" icon={AlertTriangle} action={<CardAction onClick={() => navigate('/notifikasi')}>Lihat semua</CardAction>} />
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {alertList.length > 0 ? alertList.map((a, i) => {
              const timeStr = new Date(a.created_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
              return (
                <AlertRow 
                  key={a.id || i} 
                  level={'crit'} 
                  title={`Fake BTS — Cell ${a.cell_id || 'Unknown'}`} 
                  desc={`RSRP/RSRQ: ${a.rsrp != null && a.rsrp !== '' ? a.rsrp : '-'} dBm / ${a.rsrq != null && a.rsrq !== '' ? a.rsrq : '-'} dB · ML Conf: ${a.confidence != null && a.confidence !== '' ? a.confidence : 0}%`} 
                  time={timeStr} 
                  isNew={a.isNew || false} 
                />
              )
            }) : (
              <div style={{ padding: '20px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Belum ada alert terbaru.</div>
            )}
          </div>
        </div>
      </div>

      {/* IMSI Table + Threat */}
      <div className="dash-grid-bot">
        <div style={{ background: 'var(--white)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <CardHeader title="Android ID Device Tracker" icon={Smartphone} action={<CardAction onClick={() => navigate('/live')}>Live View →</CardAction>} />
          <div style={{ overflowX: 'auto' }}>
            <IMSITable rows={imsiList} />
          </div>
        </div>

        
      </div>

      {/* Modal List Target BTS Aktif */}
      {activeListType && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.5)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, animation: 'fadeIn 0.2s forwards' }} onClick={() => setActiveListType(null)}>
          <div style={{ background: 'var(--white)', padding: 24, borderRadius: 12, width: '90%', maxWidth: 400, maxHeight: '75vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', animation: 'modalIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: activeListType === 'fake_bts' ? 'var(--red-light)' : activeListType === 'total' ? 'var(--green-light)' : activeListType === 'devices' ? 'var(--accent2-light)' : 'var(--amber-light)', color: activeListType === 'fake_bts' ? 'var(--red)' : activeListType === 'total' ? 'var(--green)' : activeListType === 'devices' ? 'var(--accent2)' : 'var(--amber)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {activeListType === 'fake_bts' ? <AlertTriangle size={18} /> : activeListType === 'total' ? <Radio size={18} /> : activeListType === 'devices' ? <Smartphone size={18} /> : <Radio size={18} />}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Daftar {activeListType === 'fake_bts' ? 'Fake BTS' : activeListType === 'total' ? 'BTS Aktif' : activeListType === 'devices' ? 'Device Terpengaruh' : 'BTS Aktif'}
                </h3>
              </div>
              <button onClick={() => setActiveListType(null)} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted)', lineHeight: 1 }}>&times;</button>
            </div>
            
            <div style={{ overflowY: 'auto', flex: 1, paddingRight: 4 }} className="custom-table-scroll">
              {activeListType === 'devices' ? (
                (() => {
                  const devices = btsList.filter(b => b.imsi && b.incident_status !== 'resolved').reduce((acc, curr) => {
                    if(!acc.find(x => x.imsi === curr.imsi)) acc.push(curr);
                    return acc;
                  }, []);
                  return devices.length > 0 ? devices.map((dev, idx) => (
                    <div key={dev.imsi || idx}
                         onClick={() => {
                           setActiveListType(null); // Tutup modal
                       if (mapInstance && dev.enb_lat && dev.enb_lon) {
                             if (mapFilter !== 'all' && mapFilter !== dev.status) setMapFilter('all');
                             mapInstance.closePopup();
                             setSelectedBTS(dev);
                         mapInstance.flyTo([dev.enb_lat, dev.enb_lon], 16, { duration: 1.5 });
                             mapInstance.once('moveend', () => {
                               const targetMarker = markerRefs.current[dev.id];
                               if (targetMarker) targetMarker.openPopup();
                             });
                           }
                         }}
                         style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg)' }}
                         onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--accent2)'; e.currentTarget.style.background = 'var(--white)' }}
                         onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Android ID: {dev.imsi}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>Operator: {dev.operator || '-'}</div>
                        <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>Terhubung ke Cell: <strong style={{color: 'var(--text-primary)'}}>{dev.cell_id || 'Unknown'}</strong></div>
                      </div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent2-light)', padding: '6px 10px', borderRadius: 6 }}>
                        <MapPin size={12} /> Fly to Map
                      </div>
                    </div>
                  )) : (
                    <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                      Tidak ada data device yang terpengaruh saat ini.
                    </div>
                  )
                })()
              ) : btsList.filter(b => (activeListType === 'total' ? true : b.status === activeListType) && b.incident_status !== 'resolved').length > 0 ? (
                btsList.filter(b => (activeListType === 'total' ? true : b.status === activeListType) && b.incident_status !== 'resolved').map((bts, idx) => (
                  <div key={bts.id || idx}
                       onClick={() => {
                         setActiveListType(null); // Tutup modal
                     if (mapInstance && bts.enb_lat && bts.enb_lon) {
                           // Ubah filter kembali ke semua jika sebelumnya di-filter agar target pasti muncul di map
                           if (mapFilter !== 'all' && mapFilter !== bts.status) setMapFilter('all');
                           mapInstance.closePopup();
                           setSelectedBTS(bts);
                           // Terbang menuju titik koordinat dengan animasi
                       mapInstance.flyTo([bts.enb_lat, bts.enb_lon], 16, { duration: 1.5 });
                           // Buka pop-up otomatis setelah selesai terbang
                           mapInstance.once('moveend', () => {
                             const targetMarker = markerRefs.current[bts.id];
                             if (targetMarker) targetMarker.openPopup();
                           });
                         }
                       }}
                       style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8, cursor: 'pointer', transition: 'all 0.2s', background: 'var(--bg)' }}
                       onMouseEnter={e => { e.currentTarget.style.borderColor = bts.status === 'fake_bts' ? 'var(--red)' : 'var(--border)'; e.currentTarget.style.background = 'var(--white)' }}
                       onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--bg)' }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>Cell ID: {bts.cell_id || 'Unknown'}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 4 }}>Loc: {bts.enb_lat?.toFixed(5)}, {bts.enb_lon?.toFixed(5)}</div>
                      <div style={{ fontSize: 11.5, color: 'var(--text-secondary)', marginTop: 2 }}>RSRP: <strong style={{color: 'var(--text-primary)'}}>{bts.rsrp} dBm</strong></div>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--accent2)', display: 'flex', alignItems: 'center', gap: 4, background: 'var(--accent2-light)', padding: '6px 10px', borderRadius: 6 }}>
                      <MapPin size={12} /> Fly to Map
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text-muted)', fontSize: 13 }}>
                  Tidak ada BTS yang sedang aktif di peta saat ini.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function AlertRow({ level, title, desc, time, isNew }) {
  const colors = { crit: { bg: 'var(--red-light)', color: 'var(--red)' }, warn: { bg: 'var(--amber-light)', color: 'var(--amber)' }, info: { bg: 'var(--accent2-light)', color: 'var(--accent2)' } }
  const c = colors[level]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
      onMouseEnter={e => e.currentTarget.style.background = 'var(--bg)'}
      onMouseLeave={e => e.currentTarget.style.background = ''}>
      {isNew
        ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--red)', flexShrink: 0, marginTop: 5 }} />
        : <span style={{ width: 6, flexShrink: 0 }} />
      }
      <div style={{ width: 26, height: 26, borderRadius: 7, background: c.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
        <AlertTriangle size={13} style={{ color: c.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text-primary)', marginBottom: 2 }}>{title}</div>
        <div style={{ fontSize: 11.5, color: 'var(--text-muted)', lineHeight: 1.5 }}>{desc}</div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, fontFamily: 'DM Mono, monospace', marginTop: 2 }}>{time}</div>
    </div>
  )
}

function IMSITable({ rows }) {
  const statusColorMap = { fake_bts: 'red', normal: 'green' }
  
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr>{['Android ID','Operator','BTS (Cell ID)','RSRP (dBm)','RSRQ (dB)','Status'].map(h => (
          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: 0.4, textTransform: 'normal', background: 'var(--bg)', borderBottom: '1px solid var(--border)' }}>{h}</th>
        ))}</tr>
      </thead>
      <tbody>
        {rows.map((r, i) => {
          const badgeColor = statusColorMap[r.status] || 'gray'
          // Label badge disesuaikan dengan status bahaya dari model ML
          const badgeLabel = r.status === 'fake_bts' ? 'Captured' : 'Normal'
          
          return (
          <tr key={r.id || i} onMouseEnter={e => e.currentTarget.style.background='var(--bg)'} onMouseLeave={e => e.currentTarget.style.background=''}>
            <td style={{ padding: '10px 14px', fontFamily: 'DM Mono, monospace', fontSize: 11.5, color: 'var(--text-primary)', borderBottom: '1px solid var(--border)' }}>{r.imsi}</td>
            <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{r.operator || '-'}</td>
            <td style={{ padding: '10px 14px', fontSize: 12.5, fontWeight: 600, color: badgeColor === 'red' ? 'var(--red)' : 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{r.cell_id || '-'}</td>
            <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{r.rsrp != null && r.rsrp !== '' ? `${r.rsrp}` : '-'}</td>
            <td style={{ padding: '10px 14px', fontSize: 12.5, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border)' }}>{r.rsrq ? `${r.rsrq}` : '-'}</td>
            <td style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)' }}><Badge color={badgeColor}>{badgeLabel}</Badge></td>
          </tr>
        )})}
      </tbody>
    </table>
  )
}

function EdgePointers({ mapInstance, btsList, mapFilter, markerRefs, onSelectBTS }) {
  const [pointers, setPointers] = useState([])

  useEffect(() => {
    if (!mapInstance) return

    let animationFrame // Menggunakan requestAnimationFrame agar 10x lebih mulus
    const checkOffScreen = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      animationFrame = requestAnimationFrame(() => {
        const bounds = mapInstance.getBounds()
        const currentList = mapFilter === 'all' ? btsList : btsList.filter(b => b.status === mapFilter)
        const offScreen = currentList.filter(bts => {
          if (bts.status !== 'fake_bts' || !bts.enb_lat || !bts.enb_lon) return false
          return !bounds.contains([bts.enb_lat, bts.enb_lon])
        })

        if (offScreen.length > 0) {
          const padding = 28
          const size = mapInstance.getSize()
          if (size.x === 0 || size.y === 0) return
          const cx = size.x / 2; const cy = size.y / 2

          const newPointers = offScreen.map(bts => {
            const pt = mapInstance.latLngToContainerPoint([bts.enb_lat, bts.enb_lon])
            const dx = pt.x - cx; const dy = pt.y - cy
            const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI
            let tX = 1, tY = 1
            if (dx > 0) tX = (size.x - padding - cx) / dx; else if (dx < 0) tX = (padding - cx) / dx
            if (dy > 0) tY = (size.y - padding - cy) / dy; else if (dy < 0) tY = (padding - cy) / dy
            return { bts, x: cx + Math.min(tX, tY) * dx, y: cy + Math.min(tX, tY) * dy, angleDeg }
          })
          setPointers(newPointers)
        } else {
          setPointers([])
        }
      })
    }

    checkOffScreen()
    mapInstance.on('move', checkOffScreen)
    mapInstance.on('zoom', checkOffScreen)
    mapInstance.on('moveend', checkOffScreen)
    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame)
      mapInstance.off('move', checkOffScreen)
      mapInstance.off('zoom', checkOffScreen)
      mapInstance.off('moveend', checkOffScreen)
    }
  }, [mapInstance, btsList, mapFilter])

  return (
    <>
      {pointers.map((ptr, idx) => {
        return (
          <button
            key={ptr.bts.id || idx}
            onClick={(e) => {
              e.stopPropagation()
              mapInstance.closePopup()
              if (onSelectBTS) onSelectBTS(ptr.bts)
          mapInstance.flyTo([ptr.bts.enb_lat, ptr.bts.enb_lon], 15, { duration: 1.5 })
              mapInstance.once('moveend', () => {
                const targetMarker = markerRefs.current[ptr.bts.id]
                if (targetMarker) targetMarker.openPopup()
              })
            }}
            style={{ position: 'absolute', left: ptr.x, top: ptr.y, transform: 'translate(-50%, -50%)', zIndex: 900, width: 34, height: 34, borderRadius: '50%', background: 'var(--red)', color: '#fff', border: '2px solid #fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: `0 4px 10px rgba(220,38,38,0.4)`, transition: 'background 0.2s' }}
            onMouseEnter={e => e.currentTarget.style.background = '#b91c1c'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--red)'}
            title={`Fake BTS di luar layar`}
          >
            <div style={{ transform: `rotate(${ptr.angleDeg + 90}deg)`, display: 'flex' }}><ArrowUp size={16} strokeWidth={3} /></div>
          </button>
        )
      })}
    </>
  )
}