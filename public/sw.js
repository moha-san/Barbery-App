// Service Worker mínimo: permite instalar la PWA, abrir la app sin conexión y recibir avisos.
// Las reservas y la disponibilidad siempre van a la red (nunca se cachean).
const VERSION = 'v2'
const STATIC_CACHE = `static-${VERSION}`
const PAGES_CACHE = `pages-${VERSION}`
const PRECACHE = ['/', '/manifest.webmanifest', '/brand-icon/192', '/brand-icon/512']

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES_CACHE).then((cache) => cache.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => ![STATIC_CACHE, PAGES_CACHE].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return // Server Actions (POST) y escrituras: directo a la red
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return // Supabase, etc.
  if (url.pathname.startsWith('/dashboard') || url.pathname.startsWith('/login')) return

  // Ficheros con hash de Next e iconos: cache-first (nunca cambian de contenido).
  if (url.pathname.startsWith('/_next/static/') || url.pathname.startsWith('/icons/')) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((res) => {
            const copy = res.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put(request, copy))
            return res
          }),
      ),
    )
    return
  }

  // Páginas: network-first, y la última copia si no hay conexión.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone()
          caches.open(PAGES_CACHE).then((cache) => cache.put(request, copy))
          return res
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('/'))),
    )
  }
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
