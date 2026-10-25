// Service Worker mínimo: permite instalar la PWA y abrir la app sin conexión.
// Las reservas y la disponibilidad siempre van a la red (nunca se cachean).
const VERSION = 'v1'
const STATIC_CACHE = `static-${VERSION}`
const PAGES_CACHE = `pages-${VERSION}`
const PRECACHE = ['/', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png']

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
  if (url.origin !== self.location.origin) return // Supabase, Resend, etc.
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
