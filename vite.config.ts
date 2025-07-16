import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // Get the API key from environment variables
  const apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  return {
    define: {
      // Inject the API key at build time
      'process.env.API_KEY': JSON.stringify(apiKey),
      'import.meta.env.VITE_GEMINI_API_KEY': JSON.stringify(apiKey)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  };
});
