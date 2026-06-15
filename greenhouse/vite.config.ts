import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// URL do servidor Node.js em desenvolvimento
// Em produção o React é servido pelo próprio Express (pasta dist/)
const SERVER_URL = process.env.VITE_SERVER_URL || 'http://localhost:3000';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // REST: /dashboard-data e /cmd → Node.js
      '/dashboard-data': { target: SERVER_URL, changeOrigin: true },
      '/cmd':            { target: SERVER_URL, changeOrigin: true },
      '/ping':           { target: SERVER_URL, changeOrigin: true },
      // WebSocket: /ws → Node.js
      '/ws': {
        target:      SERVER_URL.replace('http', 'ws'),
        changeOrigin: true,
        ws:          true,
      },
    },
  },
});
