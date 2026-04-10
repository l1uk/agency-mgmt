import { createClient } from '@supabase/supabase-js'

// Vite only exposes variables prefixed with VITE_ to the browser.
// If these are undefined, check that your .env.local file uses exactly:
//   VITE_SUPABASE_URL=https://xxxx.supabase.co
//   VITE_SUPABASE_ANON_KEY=sb_publishable_...
const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !key) {
  console.error(
    '[supabase] Missing env vars.\n' +
    'Create a .env.local file with:\n' +
    '  VITE_SUPABASE_URL=https://xxxx.supabase.co\n' +
    '  VITE_SUPABASE_ANON_KEY=sb_publishable_...'
  )
}

export const supabase = createClient(url, key)
