import { fileURLToPath } from 'node:url'
import { URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },

  ssr: false,

  runtimeConfig: {
    openaiApiKey: '',
    elevenlabsApiKey: '',
    public: {
      hasElevenLabs: !!process.env.NUXT_ELEVENLABS_API_KEY,
    },
  },

  app: {
    head: {
      title: '中文',
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0' },
      ],
      link: [
        { rel: 'icon', type: 'image/png', href: '/favicon.png' },
      ],
    },
  },

  css: ['./src/app/index.css'],

  vite: {
    plugins: [tailwindcss()] as any,
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
  },
})
