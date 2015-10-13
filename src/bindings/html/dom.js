'use strict';

import { overlayElement } from './overlay';

const reHtml = /[&<>]/g;
const htmlEntities = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
};

export function getResourceLinks(head) {
  return Array.prototype.map.call(
    head.querySelectorAll('link[rel="localization"]'),
    el => decodeURI(el.getAttribute('href')));
}

export function setAttributes(element, id, args) {
  element.setAttribute('data-l10n-id', id);
  if (args) {
    element.setAttribute('data-l10n-args', JSON.stringify(args));
  }
}

export function getAttributes(element) {
  return {
    id: element.getAttribute('data-l10n-id'),
    args: JSON.parse(element.getAttribute('data-l10n-args'))
  };
}

function getTranslatables(element) {
  const nodes = Array.from(element.querySelectorAll('[data-l10n-id]'));

  if (typeof element.hasAttribute === 'function' &&
      element.hasAttribute('data-l10n-id')) {
    nodes.push(element);
  }

  return nodes;
}

export function translateChanges(view, langs, elements) {

  const targets =
    Array.from(elements.get('added')).concat(Array.from(elements.get('modified')));

  return translateElements(view, langs, targets);
}

export function translateFragment(view, langs, frag) {
  return translateElements(view, langs, getTranslatables(frag));
}

function getElementsTranslation(view, langs, elems) {
  const keys = elems.map(elem => {
    const id = elem.getAttribute('data-l10n-id');
    const args = elem.getAttribute('data-l10n-args');
    return args ? [
      id,
      JSON.parse(args.replace(reHtml, match => htmlEntities[match]))
    ] : id;
  });

  return view._resolveEntities(langs, keys);
}

function translateElements(view, langs, elements) {
  return getElementsTranslation(view, langs, elements).then(
    translations => applyTranslations(view, elements, translations));
}

function applyTranslations(view, elems, translations) {
  view._disconnect();
  for (let i = 0; i < elems.length; i++) {
    overlayElement(elems[i], translations[i]);
  }
  view._observe();
}
