export { documentReady, getResourceLinks, getMeta } from '../web/util';
import { getLangRevisionMap, getLangRevisionTuple } from '../web/util';

export function getXULResourceLinks(doc) {
  return Array.prototype.map.call(
    doc.querySelectorAll('messagebundle'),
    el => el.getAttribute('src'));
}

export function getXULMeta(doc) {
  const winElem = doc.documentElement;
  let availableLangs = Object.create(null);
  let defaultLang = null;
  let appVersion = null;

  if (winElem.hasAttribute('defaultLanguage')) {
    let [lang, rev] =
      getLangRevisionTuple(winElem.getAttribute('defaultLanguage').trim());
    defaultLang = lang;
    if (!(lang in availableLangs)) {
      availableLangs[lang] = rev;
    }
  }

  if (winElem.hasAttribute('availableLanguages')) {
    availableLangs = getLangRevisionMap(
      availableLangs,
      winElem.getAttribute('availableLanguages').trim()
    );
  }

  if (winElem.hasAttribute('appVersion')) {
    appVersion = winElem.getAttribute('appVersion').trim();
  }

  return {
    defaultLang,
    availableLangs,
    appVersion
  };
}
