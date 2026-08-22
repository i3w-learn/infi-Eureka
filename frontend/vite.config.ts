import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // Fail loudly on a port clash rather than silently moving to another port,
    // which would leave the backend's CORS origin pointing at the wrong place.
    strictPort: true,
    // /api/v1 calls are forwarded to the backend, so frontend code never
    // hardcodes a host and there is no CORS problem in development.
    proxy: {
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
    },
  },
});
