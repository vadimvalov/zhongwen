// https://nuxt.com/docs/api/configuration/nuxt-config
import appPackage from "./package.json" with { type: "json" };

export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },
  modules: ["@pinia/nuxt", "@nuxtjs/tailwindcss"],
  ssr: false,
  runtimeConfig: {
    openaiApiKey: "",
    elevenlabsApiKey: "",
    googleApiKey: "",
    s3Endpoint: "",
    s3AccessKey: "",
    s3SecretKey: "",
    s3Bucket: "",
    public: {
      hasElevenLabs: !!process.env.NUXT_ELEVENLABS_API_KEY,
      version: (appPackage as { version?: string }).version ?? "0.0.0",
    },
  },
  app: {
    head: {
      title: "中文",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1.0" },
      ],
      link: [{ rel: "icon", href: "/favicon.ico" }],
    },
  },
  css: ["~/assets/css/main.css"],
});
