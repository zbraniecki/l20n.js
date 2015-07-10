(function() {
/*
 Language Negotiation API

 Description: The API allows clients to retrieve, modify and operate on
 the three input variables for language negotiation:
  - default language
  - available languages
  - requested languages (by default equals to navigator.languages)


 Usage:

 HTML:

 <html
   availablelanguages="en-US, fr, pl"
   defaultlanguage="en-US"
   requestedlanguages="pl, en-US">

 JS:

 document.l10n.availableLanguages => returns a Set
 document.l10n.defaultLanguage = returns a string
 document.l10n.requestedLanguages => returns a Set

 document.l10n.languages => returns a Promise that resolves to Set

 Event:

 document.onLocaleChainChange - event fired on document element when
   the value of document.l10n.languages changed.
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
    return str.split(',');
  }

  function prioritizeLocales() {
    //XXX: figure out how to fit it into langpacks without having to
    // standardize langpack API
    let localeChain = new Set();
    localeChain.add('en-US');
    localeChain.add('fr');
    return localeChain;
  }

  function negotiateLocales() {
    let newChain = prioritizeLocales();
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
    if (key === 'defaultlanguage') {
      value = getLangRevisionMap(htmlElement.getAttribute(key))[0];
    } else {
      value = new Set(getLangRevisionMap(htmlElement.getAttribute(key)));
    }
    l10nMeta.set(key, value);
  }

  /* Init */

  const htmlElement = document.documentElement;
  const attributes = new Set(['defaultlanguage', 'availablelanguages',
      'requestedlanguages']);
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
    languages: new Promise(function(resolve, reject) {
      resolve(localeChain);
    }),
    get defaultLanguage() {
      //XXX: Modifying the set should trigger negotiation
      return l10nMeta.get('defaultlanguage');
    },
    set defaultLanguage(newValue) {
      if (l10nMeta.get('defaultlanguage') !== newValue) {
        l10nMeta.set('defaultlanguage', newValue);
        negotiateLocales();
      }
    },
    get availableLanguages() {
      return l10nMeta.get('availablelanguages');
    },
    set availableLanguages(newValue) {
      //XXX: real set equality test
      if (l10nMeta.get('availablelanguages') !== newValue) {
        l10nMeta.set('availablelanguages', newValue);
        negotiateLocales();
      }
    },
    get requestedLanguages() {
      //XXX: Modifying the set should trigger negotiation
      if (l10nMeta.has('requestedLanguages')) {
        return l10nMeta.get('requestedLanguages');
      }
      return navigator.languages;
    },
    set requestedLanguages(newValue) {
      //XXX: real set equality test
      if (l10nMeta.get('requestedLanguages') !== newValue) {
        l10nMeta.set('requestedLanguages', newValue);
        negotiateLocales();
      }
    },
  };
})();
