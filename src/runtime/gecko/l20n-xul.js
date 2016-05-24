import { prioritizeLocales } from '../../intl/locale';
import { Localization } from '../../bindings/html';
import { documentReady, getXULResourceLinks, getXULMeta } from './util';
import { keysFromContext, valueFromContext } from '../../lib/format';

Components.utils.import('resource://gre/modules/L20n.jsm');
Components.utils.import('resource://gre/modules/IntlMessageContext.jsm');
Components.utils.import('resource://gre/modules/IntlListFormat.jsm');
Components.utils.import('resource://gre/modules/IntlPluralRules.jsm');
Components.utils.import('resource://gre/modules/IntlRelativeTimeFormat.jsm');

function requestBundles(requestedLangs = navigator.languages) {
  return documentReady().then(() => {
    const { defaultLang, availableLangs } = getXULMeta(document);
    const resIds = getXULResourceLinks(document);

    const newLangs = prioritizeLocales(
      defaultLang, Object.keys(availableLangs), requestedLangs
    );

    return newLangs.map(
      lang => new ResourceBundle(lang, resIds)
    );
  });
}

Intl.MessageContext = MessageContext;
Intl.PluralRules = PluralRules;
Intl.ListFormat = ListFormat;
Intl.RelativeTimeFormat = RelativeTimeFormat;

document.l10n = new Localization(document, requestBundles);

document.l10n.interactive.then(bundles => {
  document.l10n.getValue = function(id, args) {
    return keysFromContext(
      contexts.get(bundles[0]), [[id, args]], valueFromContext)[0];
  };
});

window.addEventListener('languagechange', document.l10n);
