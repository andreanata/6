// ============================================
// INTEGRITY POST — Supabase Client (FIXED)
// ============================================

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Baca dari environment variable
let rawUrl = import.meta.env.VITE_SUPABASE_URL || '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// FIX: Hapus trailing /rest/v1 jika ada (mencegah double path)
if (rawUrl.endsWith('/rest/v1')) {
  rawUrl = rawUrl.replace(/\/rest\/v1$/, '');
}
// Hapus trailing slash
if (rawUrl.endsWith('/')) {
  rawUrl = rawUrl.slice(0, -1);
}

const supabaseUrl = rawUrl;

// Logging status konfigurasi
if (!supabaseUrl) {
  console.error('[SUPABASE] ❌ VITE_SUPABASE_URL belum diset!');
} else {
  console.log('[SUPABASE] URL:', supabaseUrl);
}
if (!anonKey) {
  console.error('[SUPABASE] ❌ VITE_SUPABASE_ANON_KEY belum diset!');
}

// Buat client (SELALU buat, biarkan Supabase SDK yang handle error)
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  anonKey || 'placeholder',
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

export const isSupabaseReady = Boolean(supabaseUrl && anonKey);

if (isSupabaseReady) {
  console.log('[SUPABASE] ✅ CONNECTED — Client initialized');
} else {
  console.warn('[SUPABASE] ⚠️ NOT CONNECTED — Env vars missing, using fallback');
}

export default supabase;
