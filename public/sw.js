const CACHE_NAME = 'annas-garden-v3'
const PRECACHE_URLS = ['/offline', '/manifest.json', '/images/icon-192.svg']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
    ),
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return
  if (url.pathname.startsWith('/api/')) return

  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    /\.(png|jpe?g|svg|webp|ico|woff2?)$/i.test(url.pathname)

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => response)
        .catch(async () => {
          const offline = await caches.match('/offline')
          return offline || Response.error()
        }),
    )
    return
  }

  if (!isStaticAsset) return

  // Next.js 静态资源带 content hash，构建后文件名会变；cache-first 会长期命中旧 404
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cached = await caches.match(request)
        return cached || Response.error()
      }),
    )
    return
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        }
        return response
      })
    }),
  )
})
