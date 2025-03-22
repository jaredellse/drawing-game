import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/drawing-game/',
  server: {
    proxy: {
      '/socket.io': {
        target: process.env.NODE_ENV === 'production' 
          ? 'https://your-production-server.com' 
          : 'http://localhost:3002',
        ws: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
