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
        'src/stores/**/*.js',
        'src/composables/**/*.js',
        'src/utils.js',
        'src/views/NoSelection.vue',
        'src/components/NavBar.vue',
        'src/components/Sidebar.vue',
        'src/components/modals/DiffFullModal.vue',
      ],
      exclude: ['src/test/**', '**/*.spec.js', '**/*.test.js'],
      thresholds: {
        statements: 100,
        branches: 85,
        functions: 88,
        lines: 100,
      },
    },
  },
});
