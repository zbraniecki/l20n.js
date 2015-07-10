(function() {

  const observerConfig = {
    attributes: true,
    characterData: false,
    childList: false,
    subtree: false,
  };

  var htmlElement = document.documentElement;
  var observer = new MutationObserver(onMutations);
  observer.observe(htmlElement, observerConfig);

  function onMutations(mutations) {
    console.log(mutations);
  }

  let l10nMeta = new Map();
  let localeChain = new Set();

  function getLangRevisionMap(str) {
    return str.split(',');
  }

  for (let key of ['defaultLanguage', 'availableLanguages',
      'requestedLanguages']) {
    if (htmlElement.hasAttribute(key)) {
      l10nMeta.set(key, getLangRevisionMap(htmlElement.getAttribute(key)));
    }
  }

  negotiateLocales();

  function negotiateLocales() {
    localeChain.add('en-US');
    localeChain.add('fr');
  }

  document.l10n = {
    languages: new Promise(function(resolve, reject) {
      resolve(localeChain);
    })
  };
})();
