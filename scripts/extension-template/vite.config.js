import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  build: {
    lib: {
      entry: 'src/index.js',
      formats: ['iife'],
      name: 'ShipwellExt',
      fileName: () => 'index.js',
    },
    outDir: 'dist',
    rollupOptions: {
      external: ['vue'],
      output: {
        globals: { vue: 'Vue' },
      },
    },
    minify: 'esbuild',
    cssCodeSplit: false,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
