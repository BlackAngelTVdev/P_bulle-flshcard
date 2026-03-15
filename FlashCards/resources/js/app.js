const PRESENCE_INTERVAL_MS = 15_000
const ADMIN_REFRESH_INTERVAL_MS = 5_000

function setupPresenceHeartbeat() {
  const presenceMeta = document.querySelector('meta[name="auth-presence-url"]')
  if (!presenceMeta) {
    return
  }

  let busy = false
  const presenceUrl = presenceMeta.getAttribute('content')
  if (!presenceUrl) {
    return
  }

  const pingPresence = async () => {
    if (busy) {
      return
    }

    busy = true
    try {
      const response = await fetch(presenceUrl, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (response.redirected && response.url.includes('/auth/login')) {
        window.location.href = response.url
      }
    } catch {
      // Ignore short network hiccups.
    } finally {
      busy = false
    }
  }

  void pingPresence()
  window.setInterval(() => {
    void pingPresence()
  }, PRESENCE_INTERVAL_MS)
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

function formatDate(value) {
  if (!value) {
    return '-'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return String(value)
  }

  return date.toLocaleString('fr-FR')
}

function setupAdminConnectedUsersPanel() {
  const panel = document.getElementById('connected-users-panel')
  if (!panel) {
    return
  }

  const usersUrl = panel.getAttribute('data-users-url')
  const disconnectUrlTemplate = panel.getAttribute('data-disconnect-url-template')
  const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')

  if (!usersUrl || !disconnectUrlTemplate || !csrfToken) {
    return
  }

  const tableWrap =
    panel.querySelector('[data-connected-users-table-wrap]') || panel.querySelector('.table-wrap')
  const body = panel.querySelector('[data-connected-users-body]')
  let empty = panel.querySelector('[data-connected-users-empty]')
  const countNode = document.querySelector('[data-connected-users-count]')

  if (!tableWrap || !body) {
    return
  }

  if (!empty) {
    empty = document.createElement('p')
    empty.className = 'empty'
    empty.setAttribute('data-connected-users-empty', '')
    empty.textContent = 'Aucun utilisateur actif.'
    panel.insertBefore(empty, tableWrap)
  }

  const renderRows = (users) => {
    if (!users.length) {
      tableWrap.style.display = 'none'
      empty.style.display = ''
      body.innerHTML = ''
      if (countNode) {
        countNode.textContent = '0'
      }
      return
    }

    tableWrap.style.display = ''
    empty.style.display = 'none'
    if (countNode) {
      countNode.textContent = String(users.length)
    }

    body.innerHTML = users
      .map((user) => {
        const roleBadge = user.is_admin
          ? '<span class="badge-admin">Admin</span>'
          : '<span class="badge-user">User</span>'

        const isCurrentUser = Boolean(user.is_current_user)
        const actionCell = isCurrentUser
          ? '<span class="self-pill">Toi</span>'
          : `<button type="button" class="btn-danger js-disconnect-user" data-user-id="${escapeHtml(user.id)}">Deconnecter</button>`

        return `
					<tr>
						<td>#${escapeHtml(user.id)}</td>
						<td>${escapeHtml(user.username || '-')}</td>
						<td>${escapeHtml(user.email || '-')}</td>
						<td>${roleBadge}</td>
						<td>${escapeHtml(formatDate(user.last_seen_at))}</td>
						<td>${actionCell}</td>
					</tr>
				`
      })
      .join('')
  }

  let refreshBusy = false
  const refreshUsers = async () => {
    if (refreshBusy) {
      return
    }

    refreshBusy = true
    try {
      const response = await fetch(usersUrl, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
        },
      })

      if (!response.ok) {
        return
      }

      const payload = await response.json()
      renderRows(Array.isArray(payload.connectedUsers) ? payload.connectedUsers : [])
    } catch {
      // Ignore refresh errors and try again at next tick.
    } finally {
      refreshBusy = false
    }
  }

  body.addEventListener('click', async (event) => {
    const target = event.target
    if (!(target instanceof HTMLElement)) {
      return
    }

    const button = target.closest('.js-disconnect-user')
    if (!(button instanceof HTMLButtonElement)) {
      return
    }

    const userId = button.getAttribute('data-user-id')
    if (!userId) {
      return
    }

    if (!window.confirm('Forcer la deconnexion de cet utilisateur ?')) {
      return
    }

    button.setAttribute('disabled', 'disabled')

    try {
      const disconnectUrl = disconnectUrlTemplate.replace('__USER_ID__', userId)
      const bodyParams = new URLSearchParams({ _csrf: csrfToken })
      const response = await fetch(disconnectUrl, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'X-Requested-With': 'XMLHttpRequest',
        },
        body: bodyParams.toString(),
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        const message = payload.message || 'Impossible de deconnecter cet utilisateur.'
        window.alert(message)
      }
    } catch {
      window.alert('Erreur reseau lors de la deconnexion forcee.')
    } finally {
      button.removeAttribute('disabled')
      await refreshUsers()
    }
  })

  void refreshUsers()
  window.setInterval(() => {
    void refreshUsers()
  }, ADMIN_REFRESH_INTERVAL_MS)
}

document.addEventListener('DOMContentLoaded', () => {
  setupPresenceHeartbeat()
  setupAdminConnectedUsersPanel()
})
