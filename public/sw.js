/*
 * GreenBook Service Worker
 * オフライン起動のためのランタイムキャッシュ。
 * - 同一オリジンの GET のみ扱う（Supabase 等クロスオリジンは素通し）
 * - ナビゲーション: ネット優先。成功時は index.html を最新へ更新してキャッシュ
 *   （古いシェルが残って真っ白になる事故を防ぐ）。失敗時のみキャッシュを返す
 * - 静的アセット（ハッシュ付きで不変）: キャッシュ優先＋裏で更新
 *
 * CACHE_VERSION を上げると、有効化時に古いキャッシュを一掃する。
 */
const CACHE_VERSION = 'greenbook-v2';
const APP_SHELL = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_VERSION)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  );
});

// 手動でSWを破棄したいとき用（ページから postMessage('SKIP_WAITING') 等）
self.addEventListener('message', (event) => {
  if (event.data === 'CLEAR_CACHES') {
    event.waitUntil(caches.keys().then((ks) => Promise.all(ks.map((k) => caches.delete(k)))));
  }
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // 別オリジン（Supabase API など）はキャッシュせず通常どおり通す
  if (url.origin !== self.location.origin) return;

  // ページ遷移: ネット優先。成功したら最新の index.html でキャッシュを更新する。
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_VERSION).then((cache) => {
            cache.put('/index.html', clone.clone());
            cache.put('/', clone);
          });
          return response;
        })
        .catch(() =>
          caches.match('/index.html').then((r) => r || caches.match('/')),
        ),
    );
    return;
  }

  // 静的アセット: キャッシュ優先（ハッシュ付きで不変）＋裏で更新
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
