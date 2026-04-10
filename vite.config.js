import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Expose VITE_ prefixed env vars to the browser (Vite default behaviour).
  // Variables WITHOUT the VITE_ prefix stay server-side only.
  // Make sure your .env.local uses VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.
})
