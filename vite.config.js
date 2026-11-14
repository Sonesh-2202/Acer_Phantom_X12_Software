import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs work both at the domain root and on a GitHub Pages
  // repository subpath. Loopback is a secure context for WebHID; LAN IPs are not.
  base: './',
  server: {
    port: 5173,
    host: '127.0.0.1',
    strictPort: true,
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
});
