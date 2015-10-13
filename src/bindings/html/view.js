'use strict';

import { documentReady } from './shims';
import {
  setAttributes, getAttributes, translateFragment, translateChanges,
  getResourceLinks
} from './dom';
import { NodeWatcher } from './nodewatcher';

const readiness = new WeakMap();

const observerConfig = {
  query: '[data-l10n-id]',
  args: ['data-l10n-id', 'data-l10n-args'],
  types: ['added', 'modified']
};

export class View {
  constructor(client, doc) {
    this._doc = doc;
    this.pseudo = {
      'qps-ploc': createPseudo(this, 'qps-ploc'),
      'qps-plocm': createPseudo(this, 'qps-plocm')
    };

    this._interactive = documentReady().then(
      () => init(this, client));

    this._observer = new NodeWatcher(onNodeChanges.bind(this), observerConfig);
    this._observe = () => this._observer.observe(doc);
    this._disconnect = () => this._observer.disconnect();

    const translateView = langs => translateDocument(this, langs);
    client.on('translateDocument', translateView);
    this.ready = this.resolvedLanguages().then(translateView);
  }

  resolvedLanguages() {
    return this._interactive.then(
      client => client.method('resolvedLanguages'));
  }

  requestLanguages(langs) {
    return this._interactive.then(
      client => client.method('requestLanguages', langs));
  }

  _resolveEntities(langs, keys) {
    return this._interactive.then(
      client => client.method('resolveEntities', client.id, langs, keys));
  }

  formatValue(id, args) {
    return this._interactive.then(
      client => client.method('formatValues', client.id, [[id, args]])).then(
        values => values[0]);
  }

  formatValues(...keys) {
    return this._interactive.then(
      client => client.method('formatValues', client.id, keys));
  }

  translateFragment(frag) {
    return this.resolvedLanguages().then(
      langs => translateFragment(this, langs, frag));
  }
}

View.prototype.setAttributes = setAttributes;
View.prototype.getAttributes = getAttributes;

function createPseudo(view, code) {
  return {
    getName: () => view._interactive.then(
      client => client.method('getName', code)),
    processString: str => view._interactive.then(
      client => client.method('processString', code, str)),
  };
}

function init(view, client) {
  view._observe();
  return client.method(
    'registerView', client.id, getResourceLinks(view._doc.head)).then(
      () => client);
}

function onNodeChanges(...args) {
  return this.resolvedLanguages().then(
    langs => translateChanges(this, langs, ...args));
}

export function translateDocument(view, langs) {
  const html = view._doc.documentElement;

  if (readiness.has(html)) {
    const affectedElements =
      view.observer.scanRootForChanges(view._doc.documentElement);

    return translateChanges(view, langs, affectedElements).then(
      () => setDOMAttrsAndEmit(html, langs)).then(
        () => langs.map(takeCode));
  }

  const translated =
    // has the document been already pre-translated?
    langs[0].code === html.getAttribute('lang') ?
      Promise.resolve() : 
      translateChanges(view, langs,
        view._observer.scanRootForChanges(view._doc.documentElement)).then(
        () => setDOMAttrs(html, langs));

  return translated.then(
    () => readiness.set(html, true)).then(
      () => langs.map(takeCode));
}

function setDOMAttrsAndEmit(html, langs) {
  setDOMAttrs(html, langs);
  html.parentNode.dispatchEvent(new CustomEvent('DOMRetranslated', {
    bubbles: false,
    cancelable: false,
    detail: {
      languages: langs.map(takeCode)
    }
  }));
}

function setDOMAttrs(html, langs) {
  html.setAttribute('lang', langs[0].code);
  html.setAttribute('dir', langs[0].dir);
}

function takeCode(lang) {
  return lang.code;
}
