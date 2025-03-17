import { defineConfig } from 'vite';

export default defineConfig({
  // Otimizações para o build
  build: {
    target: 'es2020',
    outDir: 'dist',
    cssCodeSplit: false,
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three']
        }
      }
    }
  },
  // Resolver importações
  resolve: {
    alias: {
      'three': 'three'
    }
  }
});