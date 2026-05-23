
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Doughnut, Bar, Line } from 'react-chartjs-2'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend } from 'chart.js'
import { BarChart2 } from 'lucide-react'
import { ProgressBar, PageHeader, CardHeader } from '../components/ui'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Filler, Tooltip, Legend)

// Fungsi pembantu format tanggal YYYY-MM-DD untuk pencocokan yang akurat
const formatDate = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export default function Analitik() {
  // State untuk menyimpan data grafik
  const [pieData, setPieData] = useState({
    labels: ['Fake BTS', 'BTS Asli'],
    datasets: [{ data: [0, 0], backgroundColor: ['#dc2626','#16a34a'], borderWidth: 0, hoverOffset: 4 }]
  })
  
  const [barData, setBarData] = useState({
    labels: [],
    datasets: [
      { label:'Fake BTS', data:[], backgroundColor:'#dc2626', borderRadius:4 }
    ]
  })

  const [trendData, setTrendData] = useState({
    labels: [],
    datasets: [{ label:'Deteksi', data: [], borderColor:'#dc2626', backgroundColor:'rgba(220,38,38,0.08)', borderWidth:2, pointRadius:3, pointBackgroundColor:'#dc2626', tension:0.4, fill:true }]
  })
  const [chartKey, setChartKey] = useState(0)
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark')

  useEffect(() => {
    const fetchData = async () => {
      // 1. Fetch data total untuk Pie Chart
      const [
        { count: fakeCount },
        { count: normalCount }
      ] = await Promise.all([
        supabase.from('bts_readings').select('*', { count: 'exact', head: true }).eq('status', 'fake_bts'),
        supabase.from('bts_readings').select('*', { count: 'exact', head: true }).eq('status', 'normal')
      ])

      setPieData(prev => ({
        ...prev,
        datasets: [{ ...prev.datasets[0], data: [fakeCount || 0, normalCount || 0] }]
      }))

      // 2. Siapkan kerangka waktu (30 Hari & 7 Hari)
      const today = new Date()
      const last30Days = Array.from({ length: 30 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - 29 + i)
        return { dateStr: formatDate(d), label: d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }), fakeCount: 0 }
      })
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today); d.setDate(d.getDate() - 6 + i)
        const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
        return { dateStr: formatDate(d), label: dayNames[d.getDay()], fakeCount: 0 }
      })

      // 3. Fetch data 30 hari ke belakang untuk Bar & Line chart
      const thirtyDaysAgo = new Date(today)
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: logs } = await supabase
        .from('bts_readings')
        .select('created_at, status')
        .gte('created_at', thirtyDaysAgo.toISOString())

      if (logs) {
        logs.forEach(row => {
          const rowDateStr = formatDate(new Date(row.created_at))
          
          // Isi array 30 Hari
          const idx30 = last30Days.findIndex(d => d.dateStr === rowDateStr)
          if (idx30 !== -1 && row.status === 'fake_bts') last30Days[idx30].fakeCount++

          // Isi array 7 Hari
          const idx7 = last7Days.findIndex(d => d.dateStr === rowDateStr)
          if (idx7 !== -1 && row.status === 'fake_bts') {
            last7Days[idx7].fakeCount++
          }
        })

        setTrendData(prev => ({
          ...prev,
          labels: last30Days.map(d => d.label),
          datasets: [{ ...prev.datasets[0], data: last30Days.map(d => d.fakeCount) }]
        }))

        setBarData(prev => ({
          ...prev,
          labels: last7Days.map(d => d.label),
          datasets: [{ ...prev.datasets[0], data: last7Days.map(d => d.fakeCount) }]
        }))
      }
    }

    fetchData()

    // 4. Dengarkan data baru agar grafik terupdate (Realtime)
    const channel = supabase.channel('analitik-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'bts_readings' }, payload => {
        fetchData() // Refresh chart jika ada data baru masuk
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // Render ulang grafik saat tema berubah agar Chart.js membaca warna CSS variable yang baru
  useEffect(() => {
    const handleTheme = () => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark')
      setChartKey(k => k + 1)
    }
    window.addEventListener('themeToggle', handleTheme)
    return () => window.removeEventListener('themeToggle', handleTheme)
  }, [])

  const textColor = isDark ? '#cbd5e1' : '#5c6270'
  const gridColor = isDark ? '#334155' : '#e2e5eb'

  const baseOpts = { 
    color: textColor, 
    responsive: true, 
    maintainAspectRatio: false, 
    layout: { padding: { top: 20 } }, // Mendorong chart ke bawah agar tidak mepet garis atas
    plugins: { legend: { position: 'bottom', labels: { color: textColor, font: { size: 11 }, padding: 17.5 } } } // Membuka jarak antara chart dan legend
  }
  const scaleOpts = { ...baseOpts, scales: { x: { grid: { display: false }, ticks: { color: textColor, font: { size: 11 } } }, y: { grid: { color: gridColor }, ticks: { color: textColor, font: { size: 11 }, stepSize: 1 } } } }

  return (
    <div>
      <PageHeader title="Analitik Sinyal" sub="Analisis performa ML dan distribusi sinyal BTS terdeteksi." />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <CardHeader title="Distribusi Deteksi" />
          <div style={{ padding:'10px 18px 18px' }}><div style={{ height:180, position:'relative' }}><Doughnut key={chartKey} data={pieData} options={baseOpts} /></div></div>
        </div>
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <CardHeader title="Deteksi per Hari (7 Hari)" />
          <div style={{ padding:'10px 18px 18px' }}><div style={{ height:180, position:'relative' }}><Bar key={chartKey} data={barData} options={scaleOpts} /></div></div>
        </div>
        <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
          <CardHeader title="Akurasi Model ML" />
          <div style={{ padding:'16px 18px' }}>
            <ProgressBar label="Accuracy"       pct={95} color="green" valueLabel="98.4%" />
            <ProgressBar label="Precision"      pct={94} color="blue"  valueLabel="98.2%" />
            <ProgressBar label="Recall"         pct={92} color="amber" valueLabel="97.8%" />
            <ProgressBar label="False Positive" pct={6}  color="red"   valueLabel="3.8%"  />
            <ProgressBar label="False Negative" pct={8}  color="red"   valueLabel="4.2%"  />
          </div>
        </div>
      </div>

      <div style={{ background:'var(--white)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', overflow:'hidden' }}>
        <CardHeader title="Tren Deteksi Fake BTS (30 Hari)" />
        <div style={{ padding:'10px 18px 18px' }}>
          <div style={{ height:200, position:'relative' }}>
        <Line key={chartKey} data={trendData} options={{ ...scaleOpts, plugins:{ legend:{ display:false } }, scales:{ x:{ grid:{ display:false }, ticks:{ color: textColor, font:{ size:10 }, maxRotation:45, maxTicksLimit:10 } }, y:{ grid:{ color: gridColor }, ticks:{ color: textColor, font:{ size:11 }, stepSize:1 } } } }} />
          </div>
        </div>
      </div>
    </div>
  )
}