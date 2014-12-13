
// API

Element.prototype.onL10nAttrs = function(cb) {
  if (!(this in moList)) {
    moList[this] = new MutationObserver(onMutations.bind(this, cb));
    moList[this].observe(this, moConfig);
  }
}

Element.prototype.setL10n = function(domFragment, attrs) {
  this.l10n.root = this.createShadowRoot();
  this.l10n.root.appendChild(domFragment);

  for (var key in attrs) {
    this.setAttribute(key, attrs[key]);
  }
}

Element.prototype.l10n = {
  args: {},
  id: null,
};

/// INTERNAL 

var moList = new WeakMap();

var moConfig = {
  attributes: true,
  characterData: false,
  childList: true,
  subtree: true,
  attributeFilter: ['l10n-id', 'l10n-args']
};

function onMutations(cb, mutations, self) {
  localizeMutations(cb, mutations);
}

function localizeMutations(cb, mutations) {
  var mutation;

  for (var i = 0; i < mutations.length; i++) {
    mutation = mutations[i];

    if (mutation.type === 'attributes') {
      mutation.target.l10n.id = mutation.target.getAttribute('l10n-id');
      mutation.target.l10n.args =
        JSON.parse(mutation.target.getAttribute('l10n-args'));
      cb([mutation.target]);
    }
  }
}



///// HEAD

// API

HTMLDocument.prototype.l10n = {
  manifest: new Promise(function(resolve, reject) {
    document.addEventListener('DOMContentLoaded', function onDOMContentLoaded() {
      document.removeEventListener('DOMContentLoaded', onDOMContentLoaded);
      if (l10nManifest instanceof Promise) {
        l10nManifest.then(function(manifest) {
          resolve(manifest);
        });
      } else {
        resolve(l10nManifest);
      }
    });
  }),

  registerLanguages: function(manifest) {
    return new Promise(function(resolve, reject) {
      resolve(manifest);
    });
  },

  args: {},

  resources: [],
};

//// INTERNAL

var l10nManifest = {
  default_locale: null,
  locales: []
};

var headMOConfig = {
  attributes: false,
  characterData: false,
  childList: true,
  subtree: true,
};

var headObserver = new MutationObserver(onHeadMutations);
headObserver.observe(document.head, headMOConfig);

function onHeadMutations(mutations, self) {
  var mutation;

  for (var i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    if (mutation.type === 'childList') {
      var addedNode;

      for (var j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode instanceof HTMLMetaElement) {
          switch (addedNode.getAttribute('name')) {
            case 'locales':
              l10nManifest.locales =
                addedNode.getAttribute('content').split(',').map(
                  Function.prototype.call, String.prototype.trim);
              break;
            case 'default_locale':
              l10nManifest.default_locale = addedNode.getAttribute('content');
              break;
          }
        } else if (addedNode instanceof HTMLLinkElement) {
          switch (addedNode.getAttribute('rel')) {
            case 'localization':
              document.l10n.resources.push(addedNode.getAttribute('href'));
              break;
          }
        }
      }
    }
  }
}

/// Intl

Intl.prioritizeLocales = function(availableLocales,
                                  requestedLocales,
                                  defaultLocale) {
  return ['en-US', 'pl'];
}

// navigator.l10n

var hardDrive = {
  'locales/example.en-US.properties': {
    hello: {
      value: 'Hello',
      attrs: {
        title: 'Hello Title'
      }
    }
  }
};

Navigator.prototype.l10n = {
  getResource: function(lang, uri) {
    return new Promise(function(resolve, reject) {
      var url = uri.replace('{locale}', lang);

      if (!navigator.l10n.resources[uri]) {
        navigator.l10n.resources[uri] = {};
      }
      navigator.l10n.resources[uri][lang] = hardDrive[url];
      resolve(hardDrive[url]);
    });
  },
  getAvailableLanguages: function(id, version) {
  },
  resources: {},
};

/// HELPERS

function loadJSON(url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();

    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('application/json');
    }

    xhr.open('GET', url);

    xhr.responseType = 'json';
    xhr.addEventListener('load', function io_loadjson(e) {
      if (e.target.status === 200 || e.target.status === 0) {
        resolve(e.target.response);
      } else {
        reject(e);
      }
    });
    xhr.addEventListener('error', reject);
    xhr.addEventListener('timeout', reject);
    xhr.send(null);
  });
}
