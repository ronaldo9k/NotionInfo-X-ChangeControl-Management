'use strict';

const CACHE_NAME = 'prozyme-admin-v1';

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './R9.png'
];

// 서비스워커 설치
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_FILES))
      .then(() => self.skipWaiting())
  );
});

// 이전 버전 캐시 정리
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// 웹앱 파일 요청 처리
self.addEventListener('fetch', event => {
  const request = event.request;

  // GET 요청만 처리
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // 외부 사이트 및 GAS API 요청은 가로채지 않음
  if (url.origin !== self.location.origin) return;

  // 페이지 이동: 네트워크 우선, 실패하면 캐시 사용
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put('./index.html', copy));
          }
          return response;
        })
        .catch(() =>
          caches.match('./index.html')
            .then(response => response || caches.match('./'))
        )
    );
    return;
  }

  // 같은 사이트의 정적 파일: 캐시 우선
  event.respondWith(
    caches.match(request)
      .then(cached => {
        if (cached) return cached;

        return fetch(request).then(response => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => cache.put(request, copy));
          }
          return response;
        });
      })
  );
});
