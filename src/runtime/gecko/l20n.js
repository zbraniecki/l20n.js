import LocalizationObserver from '../../bindings/dom';
import { documentReady } from '../web/util';

const l10n = {
  interactive: Promise.resolve([
    {lang: 'en-US'}
  ]),

  formatEntities(keys) {
    return this.interactive.then(() => {
      return keys.map(key => {
        return {value: null, attrs: [
          ['xul', 'label', key[0]]
        ]};
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

