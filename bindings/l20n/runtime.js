'use strict';

/* global Entity, Locale, Context, L10nError */
/* global getPluralRule, rePlaceables, parse, compile */
/* global translateDocument, loadINI */
/* global translateFragment, localizeElement, translateElement */
/* global getTranslatableChildren, getL10nAttributes */

var DEBUG = false;
var isPretranslated = false;
var rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];
var manifest = null;
var resLinks = [];
var resToLoad = 0;
var nodesToTranslate = [];
var ctxReady = false;

var moNodeConfig = {
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
};

// Public API

var ctx = new Context();

navigator.mozL10n = {
  ctx: ctx,
  get: function get(id, ctxdata) {
    return ctx.get(id, ctxdata);
  },
  localize: function localize(element, id, args) {
    return localizeElement.call(ctx, element, id, args);
  },
  translateFragment: function (fragment) {
    return translateFragment.call(ctx, fragment);
  },
  ready: function ready(callback) {
    return ctx.ready(callback);
  },
  once: function once(callback) {
    return ctx.once(callback);
  },
  get readyState() {
    return ctx.isReady ? 'complete' : 'loading';
  },
  language: {
    set code(lang) {
      ctx.requestLocales(lang);
    },
    get code() {
      return ctx.supportedLocales[0];
    },
    get direction() {
      return getDirection(ctx.supportedLocales[0]);
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
  startHeadWatching();
  ctx.once(loadPendingResources.bind(navigator.mozL10n));
  var nodeObserver = new MutationObserver(onNodeMutations.bind(this));
  nodeObserver.observe(document.documentElement, moNodeConfig);
}

function onL10nLinkInjected(url) {
  var type = getURLType(url);
  switch (type) {
    case 'manifest':
      loadManifest(url, parseManifest);
      break;
    case 'properties':
      loadResource(url);
      resToLoad++;
      break;
  }
}

function startHeadWatching() {
  var links = document.querySelectorAll('link[type="application/l10n"]');
  for (var i = 0; i < links.length; i++) {
    onL10nLinkInjected(links[i].getAttribute('href'));
  }
  var headObserver = new MutationObserver(onHeadMutations.bind(this));
  headObserver.observe(document.head, moHeadConfig);
}

function parseManifest(json) {
  manifest = json;
  ctx.negotiateLocales(manifest.languages,
                       navigator.languages,
                       manifest.default_language);
}

function loadPendingResources() {
  for (var i = 0; i < resLinks.length; i++) {
    ctx.addResource(resLinks[i], onResourceLoaded.bind(this));
  }
  resLinks = null;
}

function loadResource(url) {
  if (ctx.isReady) {
    ctx.addResource(url, onResourceLoaded);
    return;
  }
  resLinks.push(url);
}

function onResourceLoaded() {
  resToLoad--;
  if (resToLoad === 0) {
    localizePendingNodes.call(this);
    translateFragment.call(this, document.body);
  }
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
          onL10nLinkInjected(addedNode.getAttribute('href'));
        }
      }
    }
  }
}

function loadResourceNode(node) {
  var url = node.getAttribute('href');
  var type = url.substr(url.lastIndexOf('.') + 1);
  if (type === 'ini') {
    loadINIResource.call(this, url, onINILoaded.bind(this));
  }
}

function getURLType(url) {
  return url.substr(url.lastIndexOf('.') + 1);
}

function onNodeMutations(mutations, self) {
  self.disconnect();
  localizeNodeMutations.call(this, mutations);
  self.observe(document, moNodeConfig);
}

function onNodeInjected(node) {
  if (node.firstElementChild) {
    translateFragment.call(this, node);
  } else {
    translateElement.call(this, node);
  }
}

function localizePendingNodes() {
  for (var i = 0; i < nodesToTranslate.length; i++) {
    onNodeInjected.call(this, nodesToTranslate[i]);
  }
  nodesToTranslate = null;
}

function localizeNodeMutations(mutations) {
  var mutation, i;

  for (i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    if (mutation.type === 'childList') {
      var addedNode, j;

      for (j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode.nodeType === Node.ELEMENT_NODE) {
          if (ctxReady) {
            onNodeInjected.call(this, addedNode);
          } else {
            nodesToTranslate.push(addedNode);
          }
        }
      }
    }
  }
}
