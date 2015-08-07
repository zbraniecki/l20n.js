(function() {

  /**
   * Custom Link, with optional URL Template:
   *
   * <link rel="localization" href="./path/to/{locale}.resource"></link>
   *
   * JS:
   *
   * linkElement.loaded is a Promise
   *
   * linkElement.data.locale = 'en-US';
   * linkElement.addEventListener('load', cb);
   *
   * Could be later standardized for l10n and themes so that platform
   * can provide the variables for certain rel types.
   **/

// https://w3c.github.io/resource-hints/
// https://bugzilla.mozilla.org/show_bug.cgi?id=1177203

  const observerConfig = {
    attributes: false,
    characterData: false,
    childList: true,
    subtree: false,
  };

  var observer = new MutationObserver(onMutations);
  observer.observe(document.head, observerConfig);

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
    if (element.nodeName === 'LINK' &&
        element.getAttribute('rel') === 'localization') {

      element.ready = document.l10n.locales.then(langs => {
        let currentLocale = [...langs][0];
        let href = element.getAttribute('href');
        href = href.replace('{locale}', currentLocale);
        return fetch(href);
      });

    }
  }
})();