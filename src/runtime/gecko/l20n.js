import LocalizationObserver from '../../bindings/dom';
import { documentReady } from '../web/util';

const entities4elems = {
  'broadcaster': (id) => {
    return {value: null, attrs: [
      ['xul', 'label', id]
    ]};
  },
  'key': (id) => {
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return {value: null, attrs: [
      ['xul', 'key', letter]
    ]};
  },
  'menuitem': (id) => {
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return {value: null, attrs: [
      ['xul', 'label', id],
      ['xul', 'accesskey', letter],
    ]};
  },
  // why is new-navigator-command a toolbarbutton with xul/key only?
  'toolbarbutton': (id) => {
    return {value: null, attrs: [
      ['xul', 'label', id]
    ]};
  },
  'menu': (id) => {
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return {value: null, attrs: [
      ['xul', 'label', id],
      ['xul', 'accesskey', letter],
    ]};
  },
  'textbox': (id) => {
    let letter = String.fromCharCode(97 + Math.floor(Math.random() * 26));
    return {value: null, attrs: [
      ['xul', 'placeholder', id],
      ['xul', 'accesskey', letter],
    ]};
  },
};

const l10n = {
  interactive: Promise.resolve([
    {lang: 'en-US'}
  ]),

  formatEntities(keys, elements) {
    return this.interactive.then(() => {
      return keys.map((key, i) => {
        let elemName = elements[i].tagName.toLowerCase();
        return entities4elems[elemName](key[0]);
      });
    });
  }
};

document.addEventListener('MozBeforeLayout', () => {
// documentReady().then(() => {
  const rootElem = document.documentElement;
  document.l10n.set('main', l10n);
  document.l10n.translateRoot(rootElem, l10n);
});

document.l10n = new LocalizationObserver();
window.addEventListener('languagechange', document.l10n);

