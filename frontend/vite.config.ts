import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// ESM polyfill for __dirname
const __dirname = dirname(fileURLToPath(import.meta.url));

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
    port: 5178,
    host: '0.0.0.0',
    allowedHosts: ['local.mes.com', 'localhost'],
    historyApiFallback: true,
    proxy: {
      // Auth Service - route authentication requests to monolith backend
      '/api/v1/auth': {
        target: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Work Order Service - route work order requests to monolith backend
      '/api/v1/workorders': {
        target: process.env.WORK_ORDER_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Quality Service - route quality requests to monolith backend
      '/api/v1/quality': {
        target: process.env.QUALITY_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Material Service - route material requests to monolith backend
      '/api/v1/material': {
        target: process.env.MATERIAL_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Traceability Service - route traceability requests to monolith backend
      '/api/v1/traceability': {
        target: process.env.TRACEABILITY_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Resource Service - route resource requests to monolith backend
      '/api/v1/resource': {
        target: process.env.RESOURCE_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Reporting Service - route reporting requests to monolith backend
      '/api/v1/reporting': {
        target: process.env.REPORTING_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // Integration Service - route integration requests to monolith backend
      '/api/v1/integration': {
        target: process.env.INTEGRATION_SERVICE_URL || 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
      // All other API requests - route to monolith backend
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
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
  },
});