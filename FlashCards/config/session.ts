import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig, stores } from '@adonisjs/session'

const sessionConfig = defineConfig({
  enabled: true,
  cookieName: 'adonis-session',

  /**
   * On le laisse à FALSE.
   * C'est ce qui permet au cookie de survivre quand tu fermes l'onglet.
   */
  clearWithBrowser: false,

  /**
   * On passe de '2h' (2 heures) à '30d' (30 jours).
   * Même sans cocher la case, ta session durera un mois par défaut.
   */
  age: '30d',

  cookie: {
    path: '/',
    httpOnly: true,
    secure: app.inProduction,
    sameSite: 'lax',
  },

  /**
   * Assure-toi que dans ton fichier .env, SESSION_DRIVER=cookie
   */
  store: env.get('SESSION_DRIVER'),

  stores: {
    cookie: stores.cookie(),
  },
})

export default sessionConfig
