export default defineNuxtConfig({
  srcDir: 'app',
  pages: true,
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@pinia/nuxt'],
  typescript: {
    strict: true,
  }
})
