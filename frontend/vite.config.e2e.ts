import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@types': path.resolve(__dirname, './src/types'),
      '@api': path.resolve(__dirname, './src/api'),
      '@assets': path.resolve(__dirname, './src/assets'),
    },
  },
  server: {
    port: 5278,
    host: '0.0.0.0',
    allowedHosts: ['e2e.mes.com', 'localhost'],
    historyApiFallback: true,
    hmr: false, // Disable HMR for E2E tests to prevent page reloads during test execution
    watch: {
      ignored: ['**/node_modules/**', '**/dist/**', '**/dist-e2e/**']
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3101',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist-e2e',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd', '@ant-design/icons'],
          charts: ['recharts'],
          utils: ['lodash', 'dayjs'],
        },
      },
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: true,
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
    __E2E_MODE__: true,
  },
});