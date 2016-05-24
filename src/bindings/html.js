import { getDirection } from '../intl/locale';

import { keysFromContext, valueFromContext, entityFromContext }
  from '../lib/format';

import { initMutationObserver, translateRoots, observe, disconnect }
  from './observer';
import { setAttributes, getAttributes, translateFragment }
  from './dom';

Components.utils.import('resource://gre/modules/Services.jsm');

const properties = new WeakMap();
const contexts = new WeakMap();

export class Localization {
  constructor(doc, requestBundles) {
    this.interactive = requestBundles();
    this.ready = this.interactive
      .then(bundles => fetchFirstBundle(bundles))
      .then(bundles => translateDocument(this, bundles));

    this.interactive.then(bundles => {
      this.getValue = function(id, args) {
        return keysFromContext(
          contexts.get(bundles[0]), [[id, args]], valueFromContext)[0];
      };
    });

    properties.set(this, { doc, requestBundles, ready: false });
    initMutationObserver(this);
    this.observeRoot(doc.documentElement);
  }

  requestLanguages(requestedLangs) {
    return this.ready = this.interactive.then(
      bundles => changeLanguages(this, bundles, requestedLangs)
    );
  }

  handleEvent() {
    return this.requestLanguages();
  }

  formatEntities(...keys) {
    // XXX add async fallback
    return this.interactive.then(
      ([bundle]) => keysFromContext(
        contexts.get(bundle), keys, entityFromContext
      )
    );
  }

  formatValues(...keys) {
    return this.interactive.then(
      ([bundle]) => keysFromContext(
        contexts.get(bundle), keys, valueFromContext
      )
    );
  }

  formatValue(id, args) {
    return this.formatValues([id, args]).then(
      ([val]) => val
    );
  }

  translateFragment(frag) {
    return translateFragment(this, frag);
  }

  observeRoot(root) {
    observe(this, root);
  }

  disconnectRoot(root) {
    disconnect(this, root);
  }
}

Localization.prototype.setAttributes = setAttributes;
Localization.prototype.getAttributes = getAttributes;

const functions = {
  OS: function() {
    switch (Services.appinfo.OS) {
      case 'WINNT':
        return 'win';
      case 'Linux':
        return 'lin';
      case 'Darwin':
        return 'mac';
      case 'Android':
        return 'android';
      default:
        return 'other';
    }
  }
};

function createContextFromBundle(bundle) {
  return bundle.fetch().then(resources => {
    const ctx = new Intl.MessageContext(bundle.lang, {
      functions
    });
    resources.forEach(res => ctx.addMessages(res));
    contexts.set(bundle, ctx);
    return ctx;
  });
}

function fetchFirstBundle(bundles) {
  const [bundle] = bundles;
  return createContextFromBundle(bundle).then(
    () => bundles
  );
}

function changeLanguages(l10n, oldBundles, requestedLangs) {
  const { requestBundles } = properties.get(l10n);

  l10n.interactive = requestBundles(requestedLangs).then(
    newBundles => equal(oldBundles, newBundles) ?
      oldBundles : fetchFirstBundle(newBundles)
  );

  return l10n.interactive.then(
    bundles => translateDocument(l10n, bundles)
  );
}

function equal(bundles1, bundles2) {
  return bundles1.length === bundles2.length &&
    bundles1.every(({lang}, i) => lang === bundles2[i].lang);
}

function translateDocument(l10n, bundles) {
  const langs = bundles.map(bundle => bundle.lang);
  const props = properties.get(l10n);
  const html = props.doc.documentElement;

  function setLangs() {
    html.setAttribute('langs', langs.join(' '));
    html.setAttribute('lang', langs[0]);
    html.setAttribute('dir', getDirection(langs[0]));
  }

  function emit() {
    html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated', {
      bubbles: false,
      cancelable: false,
    }));
  }

  const next = props.ready ?
    emit : () => props.ready = true;

  return translateRoots(l10n)
    .then(setLangs)
    .then(next);
}
