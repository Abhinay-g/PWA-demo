importScripts('/src/js/idb.js');
importScripts('/src/js/utility.js');

//=======================================================
// caches methods
// caches.open()
// caches.delete()
// caches.keys()
//cache methods
// cache.add()
// cache.put()
// cache.keys()
//event Methods
// event.waitUntil()
// event.request.url
// event.respondWith()
// event.request
//=======================================================

var CACHE_STATIC_NAME = 'static-v1'; // *cache for static files, updated file only cached after sucessive change in sw cache name [all file are part of app shell]
var CACHE_DYNAMIC_NAME = 'dynamic-v2'; // *this cache will store temporary files which will chnage from page to page
var STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/js/app.js',
  '/src/js/feed.js',
  '/src/js/idb.js',
  '/src/js/promise.js',
  '/src/js/fetch.js',
  '/src/js/material.min.js',
  '/src/css/app.css',
  '/src/css/feed.css',
  '/src/images/main-image.jpg',
  'https://fonts.googleapis.com/css?family=Roboto:400,700',
  'https://fonts.googleapis.com/icon?family=Material+Icons',
  'https://cdnjs.cloudflare.com/ajax/libs/material-design-lite/1.3.0/material.indigo-pink.min.css'
];

// function trimCache(cacheName, maxItems) {
//   caches.open(cacheName)
//     .then(function (cache) {
//       return cache.keys()
//         .then(function (keys) {
//           if (keys.length > maxItems) {
//             cache.delete(keys[0])
//               .then(trimCache(cacheName, maxItems));
//           }
//         });
//     })
// }

// *all eventListeres accept (event name) followed by callback function (event)=>{// function definetion}
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing Service Worker ...', event);
  // ** SW event like install and activate are in side SW but ***(Register)*** is done inside app.js which will be the first thing to be executed
  // *Static files are cached before installing service worker
  // *evant.waitUntil is used, as we want install envent complete only after caching static file
  // *if not then sucessive event like fetch event will try to get file which is not event cached
  event.waitUntil(
    //* caches is an internal API which will give access to Cache Storage, this Cache storage is different form Application Cache
    // * open(cache_name) this will open cache otherwise it will create cache
    caches.open(CACHE_STATIC_NAME).then(function(cache) {
      console.log('[Service Worker] Precaching App Shell');
      // * add() and addAll() are the method to add data to static Cache [details are mentioned in mozilla docs]
      cache.addAll(STATIC_FILES);
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activating Service Worker ....', event);
  // Activcate is best place to delete old cache. As new SW will be only Active after Activate Event
  event.waitUntil(
    //* caches.keys() is an another method after caches.open() which give access to cache keys. this method returns a promise
    caches.keys().then(function(keyList) {
      return Promise.all(
        keyList.map(function(key) {
          if (key !== CACHE_STATIC_NAME && key !== CACHE_DYNAMIC_NAME) {
            console.log('[Service Worker] Removing old cache.', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

function isInArray(string, array) {
  var cachePath;
  if (string.indexOf(self.origin) === 0) {
    // request targets domain where we serve the page from (i.e. NOT a CDN)
    console.log('matched ', string);
    cachePath = string.substring(self.origin.length); // take the part of the URL AFTER the domain (e.g. after localhost:8080)
  } else {
    cachePath = string; // store the full request (for CDNs)
  }
  return array.indexOf(cachePath) > -1;
}

self.addEventListener('fetch', function(event) {
  var url = 'https://pwagram-45c69.firebaseio.com/posts';
  // * fetch is an another event whic is triggered with each request for any file
  // * here we are checking if data is comming from firebase, which is JSON data.  [JSON data will be stored on Indexed DB hence if condition]
  // event.request.url give access to the requested URL
  if (event.request.url.indexOf(url) > -1) {
    // **if case for [JSON request]
    event.respondWith(
      fetch(event.request).then(function(res) {
        var clonedRes = res.clone();
        clearAllData('posts')
          .then(function() {
            return clonedRes.json();
          })
          .then(function(data) {
            for (var key in data) {
              writeData('posts', data[key]);
            }
          });
        return res;
      })
    );
  } else if (isInArray(event.request.url, STATIC_FILES)) {
    // **if case for static file
    event.respondWith(caches.match(event.request));
  } else {
    // ** else case for dynamic data
    event.respondWith(
      caches.match(event.request).then(function(response) {
        if (response) {
          return response;
        } else {
          return fetch(event.request)
            .then(function(res) {
              // ** data is fetched form network, If it fails them we have to display offline error [this is shown in cactch case]
              return caches.open(CACHE_DYNAMIC_NAME).then(function(cache) {
                // trimCache(CACHE_DYNAMIC_NAME, 3);
                // ** cache.put() is a method to put item into cache, it is differeent from cache.add() method
                cache.put(event.request.url, res.clone());
                return res;
              });
            })
            .catch(function(err) {
              // ** as network rewquest is failed we need torespont to user with Offline screen
              // ** remeber this offline page must be stored in Static cache (obious)
              return caches.open(CACHE_STATIC_NAME).then(function(cache) {
                if (event.request.headers.get('accept').includes('text/html')) {
                  //** event.request.headers.get('accept').includes('text/html') >> this method will check the request type [offline page only appear only request asking for HTML page whicch is not cached]
                  // ** cache.match() is a method whicch get the requested resourse from cache storage
                  return cache.match('/offline.html');
                }
              });
            });
        }
      })
    );
  }
});

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     caches.match(event.request)
//       .then(function(response) {
//         if (response) {
//           return response;
//         } else {
//           return fetch(event.request)
//             .then(function(res) {
//               return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//             })
//             .catch(function(err) {
//               return caches.open(CACHE_STATIC_NAME)
//                 .then(function(cache) {
//                   return cache.match('/offline.html');
//                 });
//             });
//         }
//       })
//   );
// });

// self.addEventListener('fetch', function(event) {
//   event.respondWith(
//     fetch(event.request)
//       .then(function(res) {
//         return caches.open(CACHE_DYNAMIC_NAME)
//                 .then(function(cache) {
//                   cache.put(event.request.url, res.clone());
//                   return res;
//                 })
//       })
//       .catch(function(err) {
//         return caches.match(event.request);
//       })
//   );
// });

// Cache-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     caches.match(event.request)
//   );
// });

// Network-only
// self.addEventListener('fetch', function (event) {
//   event.respondWith(
//     fetch(event.request)
//   );
// });

self.addEventListener('sync', function(event) {
  console.log('[Service Worker] Background syncing', event);
  //** sync is an event form service wokrer which is responsible for Background Sync
  if (event.tag === 'sync-new-posts') {
    //* event.tag will give name of the registered task [generally taks for getting data from indexedDB]
    // *task name or TagNmae is specified in Feed.js
    console.log('[Service Worker] Syncing new Posts');
    event.waitUntil(
      readAllData('sync-posts').then(function(data) {
        // ** readAllData is method in utility.js [this method read all data from indexedDb]
        for (var dt of data) {
          // ** here we are sending data captured from indexedDb
          // ** below is POST requst to firebase
          fetch(
            'https://us-central1-pwagram-45c69.cloudfunctions.net/storePostData',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
              },
              body: JSON.stringify({
                id: dt.id,
                title: dt.title,
                location: dt.location,
                image:
                  'https://firebasestorage.googleapis.com/v0/b/pwagram-45c69.appspot.com/o/sf-boat.jpg?alt=media&token=d583c8f6-2cc2-4676-8487-e21a4fc7d2ca'
              })
            }
          )
            .then(function(res) {
              console.log('Sent data', res);
              if (res.ok) {
                deleteItemFromData('sync-posts', dt.id); // Isn't working correctly!
              }
            })
            .catch(function(err) {
              console.log('Error while sending data', err);
            });
        }
      })
    );
  }
});
