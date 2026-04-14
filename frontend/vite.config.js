import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // All /api/* requests are forwarded to the FastAPI backend.
      // This keeps CORS out of the development workflow entirely.
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        // Strip the /api prefix before forwarding — adjust if FastAPI
        // routes are mounted with /api already included.
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
