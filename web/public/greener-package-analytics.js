;(function () {
  'use strict'

  var script = document.currentScript
  var slug = script && script.getAttribute('data-greener-tool-slug')

  var ACTION_PATTERN = /^[a-z0-9][a-z0-9:_-]{0,63}$/i

  if (!slug) {
    return
  }

  function normalizeAction(value) {
    if (typeof value !== 'string') {
      return null
    }

    var action = value.trim()

    if (!ACTION_PATTERN.test(action)) {
      return null
    }

    return action
  }

  function toolUsed(action) {
    var normalizedAction = normalizeAction(action)

    if (!normalizedAction) {
      return
    }

    fetch('/api/analytics/package', {
      method: 'POST',
      credentials: 'omit',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: slug,
        action: normalizedAction,
      }),
    }).catch(function () {
      // La analítica nunca debe romper la Tool.
    })
  }

  var api = window.GreenerAnalytics || {}

  api.toolUsed = toolUsed

  window.GreenerAnalytics = api

  window.addEventListener('greener:tool-used', function (event) {
    var detail = event && event.detail

    if (!detail || typeof detail !== 'object') {
      return
    }

    toolUsed(detail.action)
  })
})()