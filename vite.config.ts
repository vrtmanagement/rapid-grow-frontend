import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    const apiProxyTarget = (
      env.VITE_API_PROXY_TARGET || 'https://rapid-grow-backend.onrender.com'
    ).replace(/\/+$/, '');

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
        // Local UI can use VITE_API_URL=/api and hit the deployed backend when localhost:5000 is not running.
        proxy: {
          '/api': {
            target: apiProxyTarget,
            changeOrigin: true,
            secure: true,
          },
        },
      },
      plugins: [react(), tailwindcss()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      build: {
        target: 'es2020',
        cssCodeSplit: true,
        sourcemap: false,
        chunkSizeWarningLimit: 900,
        rollupOptions: {
          output: {
            manualChunks(id) {
              if (!id.includes('node_modules')) return;
              if (id.includes('recharts') || id.includes('d3-')) return 'charts';
              if (id.includes('framer-motion')) return 'motion';
              if (id.includes('socket.io')) return 'realtime';
              if (id.includes('lucide-react')) return 'icons';
              if (id.includes('react-router')) return 'router';
              if (id.includes('react-dom') || id.includes('/react/')) return 'react-vendor';
            },
          },
        },
      },
    };
});
