importScripts('node_modules/sw-toolbox/sw-toolbox.js');

self.toolbox.precache([
  'index.html',
  './img/less.png',
  './img/more.png',
  './styles/main.css',
  './scripts/build.js',
  './scripts/buildbot_client.js',
  './scripts/config.js',
  './scripts/main.js',
  './scripts/ui.js',
  './scripts/vendor/threads.browser.js'
]);

toolbox.router.get('/(.*)', function(request, values, options) {
  // networkFirst will attempt to return a response from the network,
  // then attempt to return a response from the cache.
  return toolbox.networkFirst(request, values, options).catch(function(error) {
    // XXX Serve offline content.
    throw error;
  });
});
