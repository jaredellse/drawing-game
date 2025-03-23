import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/drawing-game/',
  server: {
    proxy: {
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
        changeOrigin: true
      }
    },
    cors: true
  },
  preview: {
    port: 5173,
    strictPort: true,
    cors: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react': ['react', 'react-dom'],
        },
      },
    },
    // Ensure index.html is copied to 404.html for client-side routing
    assetsDir: 'assets',
    emptyOutDir: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
    'process.env.VITE_SOCKET_URL': JSON.stringify(process.env.VITE_SOCKET_URL)
  }
})
