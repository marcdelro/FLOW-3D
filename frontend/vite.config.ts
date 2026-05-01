import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    watch: {
      // Windows host → Docker container: inotify events don't propagate,
      // so Vite must poll the volume-mounted files to detect changes.
      usePolling: true,
      interval: 300,
    },
  },
})
