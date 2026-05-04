import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { 
    port: 4000, // aquí defines el puerto 
    open: true, // opcional: abre el navegador automáticamente 
    strictPort: true // opcional: si el puerto está ocupado, falla en vez de buscar otro
  }
})
