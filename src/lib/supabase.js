// src/lib/supabase.js
// Ganti dengan URL dan anon key Supabase project kamu
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL      = import.meta.env.VITE_SUPABASE_URL      || 'https://hewyjdhmdqahjhkuhlor.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhld3lqZGhtZHFhaGpoa3VobG9yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM0NzUzNjksImV4cCI6MjA4OTA1MTM2OX0.lXbx7sXAjjjaU7bBuOEVp8Rg4rM9KWRS_XuHRN_hQ2Y'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/*
  ╔══════════════════════════════════════════════════════╗
  ║           SETUP SUPABASE — CHECKLIST                 ║
  ╚══════════════════════════════════════════════════════╝

  1. AUTH SETTINGS (Supabase Dashboard → Authentication → Settings)
     - Enable Email provider  ✓
     - Site URL: http://localhost:5173  (dev)
     - Redirect URLs: http://localhost:5173/reset-password

  2. EMAIL TEMPLATES (Authentication → Email Templates)
     - Reset Password → pastikan link mengarah ke /reset-password

  3. TABEL: bts_readings
     ┌────────────────┬───────────┬─────────────────────────────┐
     │ Kolom          │ Tipe      │ Keterangan                  │
     ├────────────────┼───────────┼─────────────────────────────┤
     │ id             │ uuid PK   │ default uuid_generate_v4()  │
     │ created_at     │ timestamptz│ default now()              │
     │ cell_id        │ text      │                             │
     │ lac            │ text      │                             │
     │ mcc            │ text      │                             │
     │ mnc            │ text      │                             │
     │ signal_dbm     │ numeric   │                             │
     │ frequency      │ numeric   │                             │
     │ latitude       │ numeric   │                             │
     │ longitude      │ numeric   │                             │
     │ imsi           │ text      │                             │
     │ operator       │ text      │                             │
     │ is_fake        │ boolean   │ hasil prediksi ML           │
     │ confidence     │ numeric   │ 0–100                       │
     │ status         │ text      │ fake_bts | suspect | normal │
     │ sensor_id      │ text      │                             │
     └────────────────┴───────────┴─────────────────────────────┘

  4. Aktifkan REALTIME pada tabel bts_readings:
     Database → Replication → Supabase Realtime → Toggle tabel bts_readings

  5. ROW LEVEL SECURITY (RLS)
     Aktifkan RLS pada tabel bts_readings, tambahkan policy:
     - SELECT: auth.role() = 'authenticated'
     - INSERT: auth.role() = 'authenticated'
*/
