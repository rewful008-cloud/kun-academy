// Service Worker for Kun Academy PWA - Enhanced Version
const CACHE_NAME = 'kun-academy-v2.2';
const STATIC_CACHE = 'kun-academy-static-v2.2';
const DYNAMIC_CACHE = 'kun-academy-dynamic-v2.2';
const IMAGE_CACHE = 'kun-academy-images-v2.2';

const urlsToCache = [
    '/',
    '/index.html',
    '/styles.min.css',
    '/mobile.css',
    '/script.js',
    '/mobile.js',
    '/performance.js',
    '/manifest.json',
    '/icon.png',
    '/logo.png',
    '/test.html',
    '/browserconfig.xml',
    '/robots.txt',
    '/sitemap.xml'
];

// External resources to cache separately
const externalResources = [
    'https://fonts.googleapis.com/css2?family=Tajawal:wght@300;400;500;700&display=swap',
    'https://fonts.googleapis.com/icon?family=Material+Icons'
];

// Install event - Enhanced with multiple caches
self.addEventListener('install', function(event) {
    console.log('Service Worker: Installing...');
    event.waitUntil(
        Promise.all([
            caches.open(STATIC_CACHE).then(cache => {
                console.log('Service Worker: Caching static files');
                return cache.addAll(urlsToCache);
            }),
            caches.open(DYNAMIC_CACHE).then(cache => {
                console.log('Service Worker: Dynamic cache ready');
                // Pre-cache external resources
                return Promise.all(
                    externalResources.map(url => 
                        fetch(url).then(response => {
                            if (response.ok) {
                                return cache.put(url, response);
                            }
                        }).catch(err => console.log('Failed to cache external resource:', url))
                    )
                );
            }),
            caches.open(IMAGE_CACHE).then(cache => {
                console.log('Service Worker: Image cache ready');
                return cache;
            })
        ]).then(() => {
            console.log('Service Worker: Installation complete');
            return self.skipWaiting();
        })
    );
});

// Fetch event - Enhanced with different strategies
self.addEventListener('fetch', function(event) {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Handle different types of requests
    if (url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg') || url.pathname.endsWith('.jpeg') || url.pathname.endsWith('.gif') || url.pathname.endsWith('.webp')) {
        // Images: Cache first strategy
        event.respondWith(handleImageRequest(request));
    } else if (url.pathname.endsWith('.css') || url.pathname.endsWith('.js') || url.pathname.endsWith('.html')) {
        // Static assets: Stale while revalidate
        event.respondWith(handleStaticRequest(request));
    } else if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
        // Fonts: Cache first
        event.respondWith(handleFontRequest(request));
    } else {
        // Other requests: Network first with cache fallback
        event.respondWith(handleDynamicRequest(request));
    }
});

// Image handling function
async function handleImageRequest(request) {
    try {
        const cache = await caches.open(IMAGE_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Image fetch failed:', error);
        return new Response('Image not available offline', { status: 404 });
    }
}

// Static assets handling function
async function handleStaticRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        // Return cached version immediately
        if (cachedResponse) {
            // Update cache in background
            fetch(request).then(response => {
                if (response.ok) {
                    cache.put(request, response);
                }
            }).catch(() => {});
            return cachedResponse;
        }
        
        // If not cached, fetch from network
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Static asset fetch failed:', error);
        return new Response('Asset not available offline', { status: 404 });
    }
}

// Font handling function
async function handleFontRequest(request) {
    try {
        const cache = await caches.open(STATIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Font fetch failed:', error);
        return new Response('Font not available offline', { status: 404 });
    }
}

// Dynamic content handling function
async function handleDynamicRequest(request) {
    try {
        const networkResponse = await fetch(request);
        if (networkResponse.ok) {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch (error) {
        console.log('Network request failed, trying cache:', error);
        const cache = await caches.open(DYNAMIC_CACHE);
        const cachedResponse = await cache.match(request);
        
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
            const cache = await caches.open(STATIC_CACHE);
            return await cache.match('/index.html');
        }
        
        return new Response('Content not available offline', { status: 404 });
    }
}

// Activate event - Enhanced cleanup
self.addEventListener('activate', function(event) {
    console.log('Service Worker: Activating...');
    event.waitUntil(
        Promise.all([
            caches.keys().then(function(cacheNames) {
                return Promise.all(
                    cacheNames.map(function(cacheName) {
                        if (![STATIC_CACHE, DYNAMIC_CACHE, IMAGE_CACHE].includes(cacheName)) {
                            console.log('Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            self.clients.claim()
        ]).then(() => {
            console.log('Service Worker: Activation complete');
        })
    );
});



// Notification click handling
self.addEventListener('notificationclick', function(event) {
    console.log('Service Worker: Notification clicked');
    event.notification.close();
    
    if (event.action === 'explore') {
        event.waitUntil(
            clients.openWindow('/')
        );
    }
});

// Message handling for communication with main thread
self.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data && event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
});
