import { vitePlugin as remix } from '@remix-run/dev';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react(), remix()]
});
