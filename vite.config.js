import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath, URL } from 'node:url';

// The API server (server/) listens on PORT (default 8787). During development Vite forwards /api to it.
const apiTarget = `http://localhost:${process.env.PORT || 8787}`;

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { proxy: { '/api': { target: apiTarget, changeOrigin: true } } },
});
