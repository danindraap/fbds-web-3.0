import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import ProtectedRoute from './components/ProtectedRoute'

// Auth pages (public)
import Login          from './pages/Login'
import SignUp         from './pages/SignUp'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword  from './pages/ResetPassword'

// App pages (protected)
import Dashboard       from './pages/Dashboard'
import LiveMonitoring  from './pages/LiveMonitoring'
import RiwayatDeteksi  from './pages/RiwayatDeteksi'
import Analitik        from './pages/Analitik'
import Laporan         from './pages/Laporan'
import InformasiSistem from './pages/InformasiSistem'
import Notifikasi      from './pages/Notifikasi'
import PersonalInfo    from './pages/PersonalInfo'

export default function App() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login"           element={<Login />} />
      <Route path="/signup"          element={<SignUp />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password"  element={<ResetPassword />} />

      {/* Protected routes */}
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index                element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard"     element={<Dashboard />} />
        <Route path="live"          element={<LiveMonitoring />} />
        <Route path="riwayat"       element={<RiwayatDeteksi />} />
        <Route path="analitik"      element={<Analitik />} />
        <Route path="laporan"       element={<Laporan />} />
        <Route path="sistem"        element={<InformasiSistem />} />
        <Route path="notifikasi"    element={<Notifikasi />} />
        <Route path="personal-info" element={<PersonalInfo />} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
