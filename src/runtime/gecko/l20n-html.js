import { prioritizeLocales } from '../../intl/locale';
import { Localization } from '../../bindings/html';
import { documentReady, getResourceLinks, getMeta } from './util';

Components.utils.import("resource://gre/modules/L20n.jsm");

function requestBundles(requestedLangs = navigator.languages) {
  return documentReady().then(() => {
    const { defaultLang, availableLangs } = getMeta(document.head);
    const resIds = getResourceLinks(document.head);

    const newLangs = prioritizeLocales(
      defaultLang, Object.keys(availableLangs), requestedLangs
    );

    return newLangs.map(
      lang => new ResourceBundle(lang, resIds)
    );
  });
}

document.l10n = new Localization(document, requestBundles);
window.addEventListener('languagechange', document.l10n);
