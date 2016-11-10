import Localization from '../../lib/localization';
import LocalizationObserver from '../../bindings/dom';

import { ChromeResourceBundle } from './io';
import { documentReady, getResourceLinks } from '../web/util';

Components.utils.import('resource://gre/modules/Services.jsm');
Components.utils.import('resource://gre/modules/L10nRegistry.jsm');
Components.utils.import('resource://gre/modules/IntlMessageContext.jsm');

// List of functions passed to `MessageContext` that will be available from
// within the localization entities.
//
// Example use (in FTL):
//
// open-settings = { PLATFORM() ->
//   [mac] Open Preferences
//  *[other] Open Settings
// }
const functions = {
  PLATFORM: function() {
    switch (Services.appinfo.OS) {
      case 'WINNT':
        return 'windows';
      case 'Linux':
        return 'linux';
      case 'Darwin':
        return 'macos';
      case 'Android':
        return 'android';
      default:
        return 'other';
    }
  }
};

// This function is provided to the constructor of `Localization` object and is
// used to create new `MessageContext` objects for a given `lang` with selected
// builtin functions.
function createContext(lang) {
  return new MessageContext(lang, { functions });
}

// Following is the initial running code of l20n.js

// We create a new  `LocalizationObserver` and define an event listener
// for `languagechange` on it.
document.l10n = new LocalizationObserver();
window.addEventListener('languagechange', document.l10n);

// Next, we collect all l10n resource links, create new `Localization` objects
// and bind them to the `LocalizationObserver` instance.
for (const [name, resIds] of getResourceLinks(document.head || document)) {
  if (!document.l10n.has(name)) {
    createLocalization(name, resIds);
  }
}

function createLocalization(name, resIds) {
  // This function is called by `Localization` class to retrieve an array of
  // `ResourceBundle`s. In chrome-privileged setup we use the `L10nRegistry` to
  // get this array.
  function requestBundles(requestedLangs = navigator.languages) {
    return L10nRegistry.getResources(requestedLangs, resIds).then(
      ({bundles}) => bundles.map(
        bundle => new ChromeResourceBundle(bundle.locale, bundle.resources)
      )
    );
  }

  const l10n = new Localization(requestBundles, createContext);
  document.l10n.set(name, l10n);

  if (name === 'main') {
    // When document is ready, we trigger it's localization and initialize
    // `MutationObserver` on the root.
    documentReady().then(() => {
      const rootElem = document.documentElement;
      document.l10n.observeRoot(rootElem, l10n);
      document.l10n.translateRoot(rootElem, l10n);
    });
  }
}
