
let promises = [];


let l10nResLinks = document.head.querySelectorAll('link[rel=localization]');

for (link of l10nResLinks) {
  promises.push(link.ready);
};


Promise.all(promises).then(function (resources) {
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
  }).filter(n => n !== undefined));
}).then(function(responses) {
  console.log(responses);
});
