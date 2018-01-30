importScripts('vendor/sw-toolbox/sw-toolbox.js');

self.toolbox.precache([
  'index.html',
  './img/less.png',
  './img/more.png',
  './styles/main.css',
  './app.js',
  './vendor/threads.browser.js'
]);

toolbox.router.get('/(.*)', function(request, values, options) {
  // networkFirst will attempt to return a response from the network,
  // then attempt to return a response from the cache.
  return toolbox.networkFirst(request, values, options).catch(function(error) {
    // XXX Serve offline content.
    throw error;
  });
});
