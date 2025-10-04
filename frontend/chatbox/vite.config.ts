import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables based on mode
  const env = loadEnv(mode, process.cwd(), '')

  // Define API base URL from environment or default
  const apiBaseUrl = env.VITE_API_BASE_URL || 'https://chat.wc504.io.vn'

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
            // React and core dependencies
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom')) {
                return 'react-vendor';
              }
              // Fluent UI components
              if (id.includes('@fluentui')) {
                return 'fluent-ui';
              }
              // Markdown and syntax highlighting (heavy libraries)
              if (id.includes('react-markdown') ||
                id.includes('remark-gfm') ||
                id.includes('react-syntax-highlighter') ||
                id.includes('refractor')) {
                return 'markdown';
              }
              // Other large libraries
              if (id.includes('next-intl') ||
                id.includes('js-cookie') ||
                id.includes('react-router')) {
                return 'utils';
              }
              // Everything else goes to vendor
              return 'vendor';
            }
            // Application code chunking
            if (id.includes('src/components/')) {
              if (id.includes('ChatMessage') || id.includes('MessageCodeBlock')) {
                return 'chat-components';
              }
              return 'ui-components';
            }
            if (id.includes('src/services/')) {
              return 'services';
            }
          },
        },
      },
      // Optimize for standalone deployment
      target: mode === 'standalone' ? 'es2015' : 'esnext',
      // Reduce CSS size for production/standalone
      cssMinify: mode !== 'development',
      // Increase chunk size warning limit since we're optimizing
      chunkSizeWarningLimit: 1000,
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
