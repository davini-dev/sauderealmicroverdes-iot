import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Em dev: /api/* → Node.js server (porta 3000)
// Em prod (Docker): /api/* → nginx → server container
const SERVER_URL = process.env.VITE_SERVER_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Todas as chamadas de API passam pelo proxy do Vite
      '/api': {
        target: SERVER_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
});
