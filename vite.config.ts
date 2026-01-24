import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [
    react(),
    // Plugin to conditionally resolve RevenueCat based on platform
    {
      name: 'resolve-revenuecat',
      resolveId(id) {
        if (id === '@revenuecat/purchases-capacitor') {
          // Check if we're building for native (has capacitor config)
          // For web builds, use stub; for native builds, use real package
          const isNativeBuild = process.env.CAPACITOR_PLATFORM !== undefined;
          if (!isNativeBuild) {
            return path.resolve(__dirname, 'stubs/revenuecat-stub.ts');
          }
          // Return undefined to use default resolution for native builds
          return null;
        }
        return null;
      }
    }
  ],
  resolve: {
    alias: {}
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Split vendor chunks for better caching
          'react-vendor': ['react', 'react-dom'],
          'supabase': ['@supabase/supabase-js'],
          'socket': ['socket.io-client'],
          'framer-motion': ['framer-motion'],
          // Split large components into separate chunks
          'game-components': [
            './components/GameTable',
            './components/VictoryScreen',
          ],
          'inventory-modal': [
            './components/InventoryModal',
          ],
          'gem-packs': [
            './components/GemPacks',
          ],
          'store': [
            './components/Store',
          ],
          'user-hub': [
            './components/UserHub',
          ]
        }
      }
    },
    // Optimize chunk size warnings
    chunkSizeWarningLimit: 1000,
    // Enable minification (uses esbuild by default which is faster)
    minify: 'esbuild', // Faster than terser, good compression
    // Note: To use terser for better compression, install terser and change to 'terser'
    // Enable source maps for debugging (optional - can disable for smaller builds)
    sourcemap: false,
    // Copy service worker to dist folder
    copyPublicDir: true,
  },
  publicDir: 'public',
  // Server configuration for development
  server: {
    host: true,
    port: 3000,
    strictPort: true,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'socket.io-client', '@revenuecat/purchases-capacitor'],
    exclude: ['@capacitor/core'], // Capacitor plugins should not be pre-bundled
  },
});