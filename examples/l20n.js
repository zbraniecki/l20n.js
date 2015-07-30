const readyStates = {
  loading: 0,
  interactive: 1,
  complete: 2
};

function whenInteractive(callback) {
  if (readyStates[document.readyState] >= readyStates.interactive) {
    return callback();
  }

  document.addEventListener('readystatechange', function onrsc() {
    if (readyStates[document.readyState] >= readyStates.interactive) {
      document.removeEventListener('readystatechange', onrsc);
      callback();
    }
  });
}

whenInteractive(init);









function init() {
  let promises = [];


  let l10nResLinks =
    [...document.head.querySelectorAll('link[rel=localization]')];


  Promise.all(l10nResLinks.map(link => link.ready)).then(function (resources) {
    return Promise.all(resources.map(function(response) {
      if (!response.ok) {
        console.log('error fetching ' + response.url);
        return;
      }
      if (response.url.endsWith('.json')) {
        return response.json();
      } else {
        return response.text();
      }
    }));
  }).then(function(responses) {
    console.log(responses);
  });
}

