import { defineConfig } from 'electron-vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  main: {
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/main.ts'),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'electron/preload.ts'),
      },
    },
  },
  renderer: {
    plugins: [react()],
    root: 'src',
    build: {
      rollupOptions: {
        input: path.resolve(__dirname, 'src/index.html'),
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
      },
    },
  },
});
