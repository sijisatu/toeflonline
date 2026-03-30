import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const certPath = resolve(__dirname, 'certs', 'toefl-local-dev.pem');
const keyPath = resolve(__dirname, 'certs', 'toefl-local-dev-key.pem');
const httpsConfig =
  existsSync(certPath) && existsSync(keyPath)
    ? {
        cert: readFileSync(certPath),
        key: readFileSync(keyPath),
      }
    : undefined;

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    host: '0.0.0.0',
    port: 4173,
    https: httpsConfig,
  },
});
