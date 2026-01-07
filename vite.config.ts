import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/',
  plugins: [react()],
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
          'ui-components': [
            './components/Store',
            './components/UserHub',
            './components/InventoryModal',
            './components/GemPacks',
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
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ['react', 'react-dom', '@supabase/supabase-js', 'socket.io-client'],
  },
});