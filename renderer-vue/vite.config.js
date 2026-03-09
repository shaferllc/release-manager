import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  root: __dirname,
  base: './',
  build: {
    outDir: path.join(__dirname, '..', 'dist-renderer'),
    // Don't clear output when in watch mode so Electron can load the initial build while watch rebuilds
    emptyOutDir: process.env.BUILD_WATCH !== '1',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Check primevue before vue so "primevue" isn't matched by "vue"
            if (id.includes('primevue') || id.includes('@primeuix/themes') || id.includes('primeicons') || id.includes('tailwindcss-primeui')) return 'vendor-primevue';
            if (id.includes('vue') || id.includes('pinia')) return 'vendor-vue';
            if (id.includes('unified') || id.includes('remark-') || id.includes('rehype-')) return 'vendor-markdown';
            return 'vendor';
          }
        },
        chunkFileNames: 'assets/[name]-[hash].js',
      },
    },
    chunkSizeWarningLimit: 800,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.js'],
    include: ['src/**/*.{spec,test}.{js,ts}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/**/*.{js,vue}',
      ],
      exclude: [
        'src/main.js',
        'src/**/*.spec.js',
        'src/**/*.test.js',
      ],
      thresholds: {
        statements: 88,
        branches: 0,
        functions: 0,
        lines: 88,
      },
    },
  },
});
