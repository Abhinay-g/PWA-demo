var deferredPrompt;

if (!window.Promise) {
  window.Promise = Promise;
}

if ('serviceWorker' in navigator) {
  // ** SW is registered here
  navigator.serviceWorker
    .register('/sw.js')
    .then(function() {
      console.log('Service worker registered!');
    })
    .catch(function(err) {
      console.log(err);
    });
}

window.addEventListener('beforeinstallprompt', function(event) {
  console.log('beforeinstallprompt fired');
  // ** this method will prevent default event to be executed {add to home screen}
  event.preventDefault();
  deferredPrompt = event;
  return false;
});
