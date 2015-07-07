(function() {

  console.log('webl10n start');

  const observerConfig = {
    attributes: false,
    characterData: false,
    childList: true,
    subtree: false,
  };

  var observer = new MutationObserver(onMutations);
  observer.observe(document.head, observerConfig);

  function onMutations(mutations) {
    console.log('webL10n onMutations');
    for (let mutation of mutations) {
      for (let addedNode of mutation.addedNodes) {
        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          onAddedHeadElement(addedNode);
        }
      }
    }
  }

  function onAddedHeadElement(element) {
    if (element.nodeName === 'LINK' &&
        element.getAttribute('rel') === 'localization') {

      console.log('element ready set');
      element.ready = document.l10n.languages.then(langs => {
        let currentLocale = [...langs][0];
        let href = element.getAttribute('href');
        href = href.replace('{locale}', currentLocale);
        return fetch(href);
      });

    }
  }
})();
