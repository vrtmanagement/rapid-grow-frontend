import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

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
      plugins: [react()],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
