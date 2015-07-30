(function() {
/*
 L10n API

 Description: The API allows clients to retrieve, modify and operate on
 the three input variables for language negotiation:
  - default locale
  - available locales
  - requested languages (by default equals to navigator.languages)


 Usage:

 HTML:

 <html
   availablelocales="en-US, fr, pl"
   defaultlocale="en-US"
   requestedlocales="pl, en-US">

 JS:

 document.l10n.availableLocales => returns a Set
 document.l10n.defaultLocale = returns a string
 document.l10n.requestedLocales => returns a Set

 document.l10n.locales => returns a Promise that resolves to Set

 Event:

 document.onLocaleChainChange - event fired on document element when
   the value of document.l10n.locales changed.
*/

  function onMutations(mutations) {
    for (let mutation of mutations) {
      let value;
      const key = mutation.attributeName;
      onL10nMetaValueSetFromHTML(key);
    }
    negotiateLocales();
  }

  function getLangRevisionMap(str) {
    //XXX: allow availableLanguages to have version integer
    return str.split(',').map(String.trim);
  }

  function negotiateLocales() {
    let newChain = Locale.PrioritizeAvailableLocales(
      l10nMeta.get('availablelocales'),
      l10nMeta.get('requestedlocales'),
      l10nMeta.get('defaultlocale')
    );
    //XXX: real set equality test
    if (newChain !== localeChain) {
      localeChain = newChain;
      const event = new CustomEvent('localechainchange', {
        bubbles: false,
        cancelable: false,
        detail: {
          languages: newChain
        }
      });
      document.dispatchEvent(event);
    } 
  }

  function onL10nMetaValueSetFromHTML(key) {
    let value;
    if (key === 'defaultlocale') {
      value = getLangRevisionMap(htmlElement.getAttribute(key))[0];
    } else {
      value = new Set(getLangRevisionMap(htmlElement.getAttribute(key)));
    }
    l10nMeta.set(key, value);
  }

  /* Init */

  const htmlElement = document.documentElement;
  const attributes = new Set(['defaultlocale', 'availablelocales',
      'requestedlocales']);
  let l10nMeta = new Map();
  let localeChain = new Set();


  for (let key of attributes) {
    if (htmlElement.hasAttribute(key)) {
      onL10nMetaValueSetFromHTML(key);
    }
  }

  const observerConfig = {
    attributes: true,
    characterData: false,
    childList: false,
    subtree: false,
    attributeFilter: attributes,
  };

  var observer = new MutationObserver(onMutations);
  observer.observe(htmlElement, observerConfig);

  negotiateLocales();

  document.l10n = {
    locales: new Promise(function(resolve, reject) {
      // here we will have locales as we use them, like 'en'
      resolve(localeChain);
    }),
    get supportedLocales() {
      // here we will have locales as user passed them, like 'en-CA'
      return new Set(['en-US']);
    },
    get defaultLocale() {
      //XXX: Modifying the set should trigger negotiation
      return l10nMeta.get('defaultlocale');
    },
    set defaultLocale(newValue) {
      if (l10nMeta.get('defaultlocale') !== newValue) {
        l10nMeta.set('defaultlocale', newValue);
        negotiateLocales();
      }
    },
    get availableLocales() {
      return l10nMeta.get('availablelocales');
    },
    set availableLocales(newValue) {
      //XXX: real set equality test
      if (l10nMeta.get('availablelocales') !== newValue) {
        l10nMeta.set('availablelocales', newValue);
        negotiateLocales();
      }
    },
    get requestedLocales() {
      //XXX: Modifying the set should trigger negotiation
      if (l10nMeta.has('requestedLocales')) {
        return l10nMeta.get('requestedLocales');
      }
      return navigator.languages;
    },
    set requestedLocales(newValue) {
      //XXX: real set equality test
      if (l10nMeta.get('requestedLocales') !== newValue) {
        l10nMeta.set('requestedLocales', newValue);
        negotiateLocales();
      }
    },
  };
})();
