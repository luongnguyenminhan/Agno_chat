import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')

  // Define API base URL from environment or default
  const apiBaseUrl = env.VITE_API_BASE_URL || 'http://localhost:8000'

  // Log current mode and API URL for debugging
  console.log(`[Vite Config] Mode: ${mode}`)
  console.log(`[Vite Config] API Base URL: ${apiBaseUrl}`)

  return {
    plugins: [react()],
    define: {
      // Make API base URL available to the app
      __API_BASE_URL__: JSON.stringify(apiBaseUrl),
      // Also provide mode information for debugging
      __BUILD_MODE__: JSON.stringify(mode),
    },
    build: {
      outDir: 'static',
      assetsDir: 'assets',
      sourcemap: mode === 'development',
      minify: mode === 'production' ? 'terser' : false,
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor';
              }
              if (id.includes('react-router')) {
                return 'router';
              }
              return 'vendor';
            }
          },
        },
      },
      // Optimize for standalone deployment
      target: mode === 'standalone' ? 'es2015' : 'esnext',
      // Reduce CSS size for production/standalone
      cssMinify: mode !== 'development',
    },
    server: {
      port: 3000,
      open: true,
    },
    // Environment variables prefix
    envPrefix: 'VITE_',
    // Base URL for assets (useful for standalone deployment)
    base: env.VITE_BASE_URL || '/',
  }
})
