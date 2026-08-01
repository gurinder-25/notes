import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { notesApi } from './vite/notesApi';

export default defineConfig({
  server: {
    port: 3100,
    host: '0.0.0.0',
  },
  plugins: [react(), tailwindcss(), notesApi()],
});
