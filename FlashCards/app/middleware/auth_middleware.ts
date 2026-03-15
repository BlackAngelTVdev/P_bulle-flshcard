import { type HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import { DateTime } from 'luxon'

export default class AuthMiddleware {
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })

    const user = ctx.auth.user
    if (!user) {
      return next()
    }

    const storedVersionRaw = ctx.session.get('auth_session_version')
    const storedVersion = Number(storedVersionRaw)

    if (Number.isNaN(storedVersion)) {
      ctx.session.put('auth_session_version', user.sessionVersion)
    } else if (storedVersion !== user.sessionVersion) {
      await ctx.auth.use('web').logout()
      ctx.session.forget('auth_session_version')
      ctx.session.flash('error', 'Ta session a ete fermee par un administrateur.')
      return ctx.response.redirect().toRoute('auth.login')
    }

    const now = DateTime.now()
    const lastTouchRaw = ctx.session.get('presence_last_touch_ms')
    const lastTouch = Number(lastTouchRaw || 0)

    if (!Number.isFinite(lastTouch) || now.toMillis() - lastTouch > 30_000) {
      user.lastSeenAt = now
      await user.save()
      ctx.session.put('presence_last_touch_ms', now.toMillis())
    }

    return next()
  }
}