'use strict';

/* global Entity, Locale, Context, L10nError */
/* global getPluralRule, rePlaceables, parse, compile */
/* global translateDocument, loadINI */
/* global translateFragment, localizeElement, translateElement */
/* global getTranslatableChildren, getL10nAttributes */

var DEBUG = false;
var isPretranslated = false;
var rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];
var manifest = {};
var resLinks = [];
var resToLoad = 0;
var nodesToTranslate = [];
var ctxReady = false;
var needToTranslateDocument = true;

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

var readyStates = {
  'loading': 0,
  'interactive': 1,
  'complete': 2
};

function waitFor(state, callback) {
  state = readyStates[state];
  if (readyStates[document.readyState] >= state) {
    callback();
    return;
  }

  document.addEventListener('readystatechange', function l10n_onrsc() {
    if (readyStates[document.readyState] >= state) {
      document.removeEventListener('readystatechange', l10n_onrsc);
      callback();
    }
  });
}

if (window.document) {
  /* Startup logic */
  startHeadWatching();
  waitFor('interactive', function() {
    ctx.once(function() {
      if (resToLoad === 0) {
        localizePendingNodes.call(navigator.mozL10n);
        if (needToTranslateDocument) {
          translateFragment.call(navigator.mozL10n, document.body);
        }
        ctxReady = true;
        fireDOMContentLocalized();
      }
    });
  });
  var nodeObserver = new MutationObserver(onNodeMutations.bind(navigator.mozL10n));
  nodeObserver.observe(document.documentElement, moNodeConfig);
  if (document.readyState === 'loading') {
    needToTranslateDocument = false;
  }
}

function startHeadWatching() {
  var nodes = document.head.querySelectorAll('meta[name="l10n-resources"],' +
                                             'meta[name="l10n-languages"],' +
                                             'meta[name="l10n-default_language"],' +
                                             'link[type="application/l10n"],' +
                                             'script[type="l10n/resource+properties"],' +
                                             'script[type="l10n/resource+json"]');
  for (var i = 0; i < nodes.length; i++) {
    var nodeName = nodes[i].nodeName.toLowerCase();
    switch (nodeName) {
      case 'link':
        onL10nLinkInjected(nodes[i]);
        break;
      case 'meta':
        onMetaInjected(nodes[i]);
        break;
      case 'script':
        onScriptInjected(nodes[i]);
        break;
    }
  }

  var headObserver = new MutationObserver(onHeadMutations.bind(this));
  headObserver.observe(document.head, moHeadConfig);
}

function parseManifest(json) {
  manifest = json;
  onManifestReady();
}


function loadPendingResources() {
  for (var i = 0; i < resLinks.length; i++) {
    ctx.addResource(resLinks[i], onResourceLoaded.bind(this));
  }
  resLinks = null;
}

function loadResource(url) {
  if (ctx.isReady) {
    ctx.addResource(url, onResourceLoaded.bind(this));
    return;
  }
  resLinks.push(url);
}

function onResourceLoaded() {
  resToLoad--;
}

function getURLType(url) {
  return url.substr(url.lastIndexOf('.') + 1);
}

function localizePendingNodes() {
  for (var i = 0; i < nodesToTranslate.length; i++) {
    onNodeInjected.call(this, nodesToTranslate[i]);
  }
  nodesToTranslate = null;
}

function onManifestReady() {
  ctx.negotiateLocales(manifest.languages,
                       navigator.languages,
                       manifest.default_language);
}

function fireDOMContentLocalized() {
  var event = new CustomEvent('mozDOMLocalized', {
    'bubbles': false,
    'cancelable': false,
    'detail': {
      'language': navigator.mozL10n.ctx.supportedLocales[0]
    }
  });
  document.dispatchEvent(event);
}


/* Head MO */

function onHeadMutations(mutations, self) {
  var mutation, i;

  for (i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    if (mutation.type === 'childList') {
      var addedNode, j;

      for (j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        name = addedNode.nodeName.toLowerCase();
        switch (name) {
          case 'link':
            if (addedNode.getAttribute('type') === 'application/l10n') {
              onL10nLinkInjected(addedNode);
            }
            break;
          case 'meta':
            if (addedNode.getAttribute('name').substr(0, 4) === 'l10n') {
              onMetaInjected(addedNode);
            }
            break;
          case 'script':
            if (addedNode.hasAttribute('type') &&
                addedNode.getAttribute('type').substr(0, 13) === 'l10n/resource') {
              onScriptInjected(addedNode);
            }
            break;
        }
      }
    }
  }
}

function onScriptInjected(node) {
  resToLoad++;

  var type = node.getAttribute('type').substr(14);
  var lang = node.getAttribute('lang');
  var locale = ctx.getLocale(lang);

  var source = node.textContent;

  switch(type) {
    case 'properties':
      var ast = parse(ctx, source);
      break;
    case 'json':
      var ast = JSON.parse(source);
      break;
  }

  locale.addAST(ast);
  resToLoad--;
}

function onMetaInjected(node) {
  var name = node.getAttribute('name').substr(5);
  manifest[name] = node.getAttribute('content');

  if (Object.keys(manifest).length == 3) {
    ctx.negotiateLocales(manifest.languages,
                         navigator.languages,
                         manifest.default_language);
  }
}

function onL10nLinkInjected(node) {
  var url = node.getAttribute('href');
  var type = getURLType(url);
  switch (type) {
    case 'manifest':
      loadManifest(url, parseManifest);
      break;
    case 'properties':
      loadResource.call(navigator.mozL10n, url);
      resToLoad++;
      break;
  }
}

/* Node MO */

function onNodeMutations(mutations, self) {
  self.disconnect();
  localizeNodeMutations.call(this, mutations);
  self.observe(document, moNodeConfig);
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
            if (addedNode.hasAttribute('data-l10n-id') ||
                addedNode.firstElementChild) {
              nodesToTranslate.push(addedNode);
            }
          }
        }
      }
    }
  }
}

function onNodeInjected(node) {
  if (node.firstElementChild) {
    translateFragment.call(this, node);
  } else if (node.hasAttribute('data-l10n-id')) {
    translateElement.call(this, node);
  }
}
