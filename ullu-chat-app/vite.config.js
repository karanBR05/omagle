import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'

// https://vite.dev/config/
// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  const isDev = mode === 'development';

  return {
    plugins: [
      react(),
      // Only use SSL in dev for local network testing.
      // In production (Vercel), SSL is handled by the platform.
      isDev && basicSsl()
    ],
    server: {
      host: true,
      proxy: {
        '/socket.io': {
          target: 'http://localhost:3000',
          changeOrigin: true,
          ws: true
        }
      }
    }
  };
})
