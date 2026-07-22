import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  if (
    command === 'build' &&
    (!env.VITE_SUPABASE_URL || !env.VITE_SUPABASE_PUBLISHABLE_KEY)
  ) {
    throw new Error('VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are required.')
  }

  return {
    plugins: [react()],
    base: '/assembler/',
    server: {
      port: 5175,
      allowedHosts: ['frontend'],
      proxy: {
        '/auth/v1': {
          target: 'http://auth:8081',
          rewrite: (requestPath) => requestPath.replace(/^\/auth\/v1/, ''),
        },
        '/rest/v1': {
          target: 'http://rest:3000',
          rewrite: (requestPath) => requestPath.replace(/^\/rest\/v1/, ''),
        },
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  }
})
