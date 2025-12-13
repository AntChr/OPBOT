import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
console.log('🔍 VITE_API_URL from process.env:', process.env.VITE_API_URL);
console.log('🔍 All VITE_ vars:', Object.keys(process.env).filter(k => k.startsWith('VITE_')));

export default defineConfig({
  plugins: [react()],
  define: {
    __API_URL__: JSON.stringify(process.env.VITE_API_URL || 'http://localhost:5000')
  }
})
