import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
//
// The `server.proxy` section is only active during local development (`npm run dev`).
// It forwards any request to /predict or /health from the Vite dev server
// (http://localhost:5173) to the FastAPI backend (http://localhost:8000).
//
// This solves the CORS problem during development: the browser thinks
// it's talking to the same origin (localhost:5173), so no CORS issue.
//
// In production (Vercel), the VITE_API_URL environment variable is set
// to the Render backend URL, and the proxy is not used.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/predict': 'http://localhost:8001',
      '/health':  'http://localhost:8001',
    },
  },
})
