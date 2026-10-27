// Service Worker: permite instalar la PWA, abrirla rápido aunque haya mala cobertura y recibir avisos.
// Las reservas y la disponibilidad siempre van a la red (nunca se cachean).
const VERSION = 'v3'
const STATIC_CACHE = `static-${VERSION}`
const PAGES_CACHE = `pages-${VERSION}`
const PRECACHE = ['/', '/manifest.webmanifest', '/brand-icon/192', '/brand-icon/512']
// Si la red tarda más que esto, se enseña la última copia guardada (y se actualiza por detrás).
const NETWORK_TIMEOUT_MS = 3500

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE].includes(k)).map((k) => caches.delete(k)))),
      // Descarga las páginas en paralelo mientras el SW arranca (más rápido en Chrome/Android).
      self.registration.navigationPreload ? self.registration.navigationPreload.enable() : null,
    ]).then(() => self.clients.claim()),
  )
})

const putIn = (name, request, res) => {
  const copy = res.clone()
  return caches.open(name).then((cache) => cache.put(request, copy))
}

// Cache-first: ficheros que nunca cambian de contenido.
function cacheFirst(event) {
  return caches.match(event.request).then(
    (hit) =>
      hit ||
      fetch(event.request).then((res) => {
        if (res.ok) event.waitUntil(putIn(STATIC_CACHE, event.request, res))
        return res
      }),
  )
}

// Stale-while-revalidate: se enseña lo guardado al momento y se actualiza por detrás (iconos, fotos).
function staleWhileRevalidate(event) {
  return caches.open(STATIC_CACHE).then((cache) =>
    cache.match(event.request).then((hit) => {
      const update = fetch(event.request)
        .then((res) => {
          if (res.ok) return cache.put(event.request, res.clone()).then(() => res)
          return res
        })
        .catch(() => hit)
      if (hit) {
        event.waitUntil(update)
        return hit
      }
      return update
    }),
  )
}

// Páginas: red primero, pero si tarda o no hay conexión, la última copia guardada.
function pageNetworkFirst(event) {
  const { request } = event
  const network = Promise.resolve(event.preloadResponse)
    .then((pre) => pre || fetch(request))
    .then((res) => {
      // No se guardan errores ni redirecciones (p. ej. al login si caducó la sesión).
      if (res.ok && !res.redirected && res.type === 'basic') event.waitUntil(putIn(PAGES_CACHE, request, res))
      return res
    })
  event.waitUntil(network.catch(() => {}))
  const cached = () => caches.match(request, { ignoreVary: true })
  const timeout = new Promise((resolve) =>
    setTimeout(() => cached().then((hit) => hit && resolve(hit)), NETWORK_TIMEOUT_MS),
  )
  return Promise.race([network, timeout]).catch(() =>
    cached().then((hit) => {
      if (hit) return hit
      const path = new URL(request.url).pathname
      // Sin copia de esa página: la agenda de hoy o la portada.
      return caches.match(path.startsWith('/dashboard') ? '/dashboard' : '/').then((h) => h || Response.error())
    }),
  )
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // Server Actions (POST) y escrituras: directo a la red
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, etc.
  if (url.pathname.startsWith('/login') || url.pathname.startsWith('/api/')) return

  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(event))
    return
  }
  if (url.pathname.startsWith('/brand-icon/') || url.pathname.startsWith('/brand/') || url.pathname.startsWith('/_next/image')) {
    event.respondWith(staleWhileRevalidate(event))
    return
  }
  if (request.mode === 'navigate') event.respondWith(pageNetworkFirst(event))
})

// Al cerrar sesión se borran las agendas guardadas en este móvil.
self.addEventListener('message', (event) => {
  if (event.data !== 'logout') return
  event.waitUntil(
    caches.open(PAGES_CACHE).then((cache) =>
      cache.keys().then((reqs) => Promise.all(reqs.filter((r) => new URL(r.url).pathname.startsWith('/dashboard')).map((r) => cache.delete(r)))),
    ),
  )
})

// Avisos al móvil: reservas nuevas (personal) y recordatorios (clientes). Ver lib/push.ts.
self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  event.waitUntil(
    self.registration.showNotification(data.title || 'Aviso', {
      body: data.body || '',
      tag: data.tag,
      icon: '/brand-icon/192',
      badge: '/brand-icon/192',
      data: { url: data.url || '/' },
    }),
  )
})

// Al tocar el aviso: abre la app (o la trae al frente) en la página del aviso.
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  // Enlaces de fuera (p. ej. la reseña de Google): se abren aparte.
  if (!url.startsWith(self.location.origin)) {
    event.waitUntil(self.clients.openWindow(url))
    return
  }
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const win = wins.find((w) => w.url.startsWith(self.location.origin))
      if (win) return win.navigate(url).then((w) => (w || win).focus())
      return self.clients.openWindow(url)
    }),
  )
})
