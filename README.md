# FBDS — Dashboard Monitoring

Sistem deteksi Fake BTS berbasis Machine Learning dengan React + Supabase.

## Stack
- **React 18** + Vite
- **React Router v6** — client-side routing + protected routes
- **Supabase** — database realtime + authentication
- **React Leaflet** — peta interaktif
- **Chart.js** + react-chartjs-2 — grafik sinyal
- **Lucide React** — icon library

## Cara Menjalankan

```bash
# 1. Clone / extract project
cd fakebts-react

# 2. Install dependencies
npm install

# 3. Konfigurasi environment
cp .env.example .env
# → isi VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY

# 4. Jalankan dev server
npm run dev
# → buka http://localhost:5173
```

## Struktur Halaman

| Route              | Halaman            | Auth     |
|--------------------|--------------------|----------|
| `/login`           | Login              | Public   |
| `/signup`          | Sign Up            | Public   |
| `/forgot-password` | Lupa Password      | Public   |
| `/reset-password`  | Reset Password     | Public   |
| `/dashboard`       | Dashboard Utama    | Protected|
| `/live`            | Live Monitoring    | Protected|
| `/riwayat`         | Riwayat Deteksi    | Protected|
| `/analitik`        | Analitik Sinyal    | Protected|
| `/laporan`         | Laporan & Export   | Protected|
| `/sistem`          | Informasi Sistem   | Protected|
| `/notifikasi`      | Notifikasi & Alert | Protected|
| `/personal-info`   | Personal Info      | Protected|

## Alur Auth

```
Buka URL → ProtectedRoute cek session Supabase
  ├── Belum login → redirect ke /login
  │     ├── Login → masuk ke /dashboard
  │     ├── Sign Up → konfirmasi email → /login
  │     └── Lupa Password → email → /reset-password → /login
  └── Sudah login → tampilkan Layout + halaman tujuan
```

## Setup Supabase

Lihat komentar lengkap di `src/lib/supabase.js` untuk:
- Konfigurasi Auth Settings & Redirect URL
- Struktur tabel `bts_readings`
- Mengaktifkan Realtime
- Row Level Security (RLS)
