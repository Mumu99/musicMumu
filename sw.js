// Service Worker for 木木的音乐站
// 每次发版时更新此版本号
const CACHE_NAME = 'mumu-music-v4';
const urlsToCache = [
  './',
  './index.html',
  './manifest.json',
  './mumu.gif'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('缓存已打开');
        return cache.addAll(urlsToCache);
      })
      .then(() => self.skipWaiting()) // 强制新 SW 立即激活
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('删除旧缓存:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // 立即控制所有页面
  );
});

// 拦截请求 - 使用"网络优先，缓存回退"策略
self.addEventListener('fetch', (event) => {
  // 跳过非 GET 请求
  if (event.request.method !== 'GET') return;
  
  // 跳过跨域请求（如 API 请求）
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // 网络优先策略：先尝试网络，失败则用缓存
    fetch(event.request)
      .then((response) => {
        // 检查是否是有效响应
        if (!response || response.status !== 200 || response.type !== 'basic') {
          return response;
        }

        // 克隆响应并更新缓存
        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            cache.put(event.request, responseToCache);
          });

        return response;
      })
      .catch(() => {
        // 网络失败时使用缓存
        return caches.match(event.request)
          .then((response) => {
            if (response) {
              return response;
            }
            // 如果缓存也没有，返回离线页面
            return caches.match('./index.html');
          });
      })
  );
});

// 监听消息，支持手动触发更新
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }
});
