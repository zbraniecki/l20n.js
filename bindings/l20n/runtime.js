'use strict';

/* global Entity, Locale, Context, L10nError */
/* global getPluralRule, rePlaceables, parse, compile */
/* global translateDocument, loadINI */
/* global translateFragment, localizeElement, translateElement */
/* global getTranslatableChildren, getL10nAttributes */

var DEBUG = false;
var isPretranslated = false;
var rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];
var nodeObserver = false;
var resources = [];

var moConfig = {
  attributes: true,
  characterData: false,
  childList: true,
  subtree: true,
  attributeFilter: ['data-l10n-id', 'data-l10n-args']
};

var moHeadConfig = {
  attributes: false,
  characterData: false,
  childList: true,
  subtree: false,
  attributeFilter: false
};

// Public API

navigator.mozL10n = {
  ctx: new Context(),
  get: function get(id, ctxdata) {
    return navigator.mozL10n.ctx.get(id, ctxdata);
  },
  localize: function localize(element, id, args) {
    return localizeElement.call(navigator.mozL10n, element, id, args);
  },
  translate: function () {
    // XXX: Remove after removing obsolete calls. Bug 992473
  },
  translateFragment: function (fragment) {
    return translateFragment.call(navigator.mozL10n, fragment);
  },
  ready: function ready(callback) {
    return navigator.mozL10n.ctx.ready(callback);
  },
  once: function once(callback) {
    return navigator.mozL10n.ctx.once(callback);
  },
  get readyState() {
    return navigator.mozL10n.ctx.isReady ? 'complete' : 'loading';
  },
  language: {
    set code(lang) {
      navigator.mozL10n.ctx.requestLocales(lang);
    },
    get code() {
      return navigator.mozL10n.ctx.supportedLocales[0];
    },
    get direction() {
      return getDirection(navigator.mozL10n.ctx.supportedLocales[0]);
    }
  },
  _getInternalAPI: function() {
    return {
      Error: L10nError,
      Context: Context,
      Locale: Locale,
      Entity: Entity,
      getPluralRule: getPluralRule,
      rePlaceables: rePlaceables,
      getTranslatableChildren:  getTranslatableChildren,
      translateDocument: translateDocument,
      getL10nAttributes: getL10nAttributes,
      loadINI: loadINI,
      fireLocalizedEvent: fireLocalizedEvent,
      parse: parse,
      compile: compile
    };
  }
};

if (window.document) {

  var headObserver = new MutationObserver(onHeadMutations.bind(this));
  var headObserver.observe(document, moHeadConfig);
}

function onHeadMutations(mutations, self) {
  var mutation, i;

  for (i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    if (mutation.type === 'childList') {
      var addedNode, j;

      for (j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode.nodeName.toLowerCase() === 'link' &&
            addedNode.getAttribute('type') === 'application/l10n') {

        }
      }
    }
  }
}

function loadResourceNode(node) {
  var url = node.getAttribute('href');
  var type = node.substr(url.lastIndexOf('.') + 1);
  if (type === 'ini') {
    loadINIResource.call(this, url, onINILoaded.bind(this));
  }
}

function onINILoaded(err) {
}






