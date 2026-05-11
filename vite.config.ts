import { defineConfig } from 'vite'
import adonisjs from '@adonisjs/vite/client'

export default defineConfig({
  plugins: [
    adonisjs({
      entrypoints: ['resources/css/app.css', 'resources/js/app.js'],
      reload: ['resources/views/**/*.edge'],
    }),
  ],

  // AJOUTE ÇA ICI :
  // Ça dit à Vite : "N'utilise aucun plugin PostCSS, reste en CSS pur"
  css: {
    postcss: {
      plugins: [],
    },
  },

  server: {
    allowedHosts: ['cards.laxacube.ch'],
    host: '0.0.0.0',
  },
})
