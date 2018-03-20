importScripts('vendor/sw-toolbox/sw-toolbox.js');

self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  self.clients.claim();
});

self.toolbox.precache([
  'index.html',
  './img/less.png',
  './img/more.png',
  './styles/main.css',
  './app.js',
  './vendor/threads.browser.js'
]);

toolbox.options.debug = false;

var fetchingCachedBuilds = false;

self.addEventListener('message', function(message) {
  fetchingCachedBuilds = (message.data == 'cached');
});

toolbox.router.get(/build.servo.org\/json\/builders\/.*\/builds/,
                   function(request, values, options) {
  // For current builds we always try to get from the network first.
  // For server cached builds, it's fine to go straight to the local cache.
  if (fetchingCachedBuilds) {
    return toolbox.cacheFirst(request, values, options);
  }
  return toolbox.networkFirst(request, values, options);
});

toolbox.router.get('/(.*)', function(request, values, options) {
  // networkFirst will attempt to return a response from the network,
  // then attempt to return a response from the cache.
  return toolbox.networkFirst(request, values, options).catch(function(error) {
    // XXX Serve offline content.
    throw error;
  });
});
