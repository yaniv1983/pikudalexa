import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  base: '/pikudalexa/',
  build: {
    outDir: 'dist',
  },
  server: {
    port: 3000,
  },
});
