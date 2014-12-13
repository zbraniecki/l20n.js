
 // ENV

function Env(manifest) {
  this.manifest = manifest;
}

Env.prototype.createContext = function(langs, resources) {
  var ctx = new Context(
    getSupportedLanguages(this.manifest, langs),
    resources);

  return ctx;
}

function getSupportedLanguages(manifest, langs) {
  return getAvailableLanguages(manifest).then(function(manifest) {
      return Intl.prioritizeLocales(manifest.default_locale,
                                    manifest.locales,
                                    langs);
  });
}

function getAvailableLanguages(manifest) {
  return document.l10n.registerLanguages(manifest);
}

 // Context

function Context(supportedLanguages, resources) {
  this.ready = supportedLanguages.then(this.fetchResources.bind(this));
  this.resources = resources;
}

Context.prototype.fetchResources = function(supported) {
  return Promise.all(this.resources.map(function(resId) {
    return navigator.l10n.getResource(supported[0], resId);
  })).then(function() {
    return supported;
  });
}

Context.prototype.formatEntity = function(l10nId) {
  return this.ready.then(function(supported) {
    var lang = supported[0];
    for (var i = 0; i < this.resources.length; i++) {
      var resId = this.resources[i];
      var res = navigator.l10n.resources[resId][lang];

      if (l10nId in res) {
        return {
          value: res[l10nId].value,
          attrs: res[l10nId].attrs
        };
      }
    }
  }.bind(this));
}

 // BINDINGS

var defaultCtx;

var env = new Env(document.l10n.manifest);

defaultCtx = env.createContext(navigator.languages, document.l10n.resources);
defaultCtx.ready.then(translateDocument);

document.body.registerL10nListener(function(nodes) {
  var node = nodes[0];
  var l10nId = node.getAttribute('l10n-id');
  var l10nArgs = JSON.parse(node.getAttribute('l10n-args'));

  defaultCtx.formatEntity(l10nId, l10nArgs).then(function(entity) {
    var f = document.createDocumentFragment();
    f.textContent = entity.value;
    node.setL10n(f, entity.attrs);
  });
});

function translateDocument() {
}
