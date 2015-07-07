(function() {

  console.log('langneg start');

  const observerConfig = {
    attributes: false,
    characterData: false,
    childList: true,
    subtree: false,
  };

  var observer = new MutationObserver(onMutations);
  observer.observe(document.head, observerConfig);

  let l10nMeta = new Map();
  let localeChain = new Set();
  let languagesResolve;

  function onMutations(mutations) {
    for (let mutation of mutations) {
      for (let addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          onAddedHeadElement(addedNode);
        }
      }
    }
  }

  function onAddedHeadElement(element) {
    if (element.nodeName === 'META') {
      let name = element.getAttribute('name');
      if (name === 'defaultLanguage' || name === 'availableLanguages') {
        l10nMeta.set(name, element.getAttribute('content'));
        if (l10nMeta.size === 2) {
          observer.disconnect();
          negotiateLocales();
        }
      }
    }
  }

  function negotiateLocales() {
    localeChain.add('en-US');
    localeChain.add('fr');
    languagesResolve(localeChain);
  }

  document.l10n = {
    languages: new Promise(function(resolve, reject) {
      if (localeChain.size) {
        resolve(localeChain);
      } else {
        languagesResolve = resolve;
      }
    })
  };
})();
