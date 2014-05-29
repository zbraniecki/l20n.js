'use strict';

function L20nMutationObserver(cb) {
  this._callback = cb;
  this._rootNode = null;
  this._observer = null;
  this._l10nIdName = 'data-l10n-id';
  this._config = { attributes: true,
    characterData: false,
    childList: true,
    subtree: true,
    attributeFilter: [this._l10nIdName]};
}


L20nMutationObserver.prototype.harvestDocument = function harvestDocument() {
  var nodes = this._rootNode.querySelectorAll('['+this._l10nIdName+']');

  if (nodes.length) {
    this._callback({added: nodes, modified: null});
  }
};

L20nMutationObserver.prototype.fireCallback = function(mutations) {
  var observerActive = false;

  if (this._observer) {
    this._observer.disconnect();
    observerActive = true;
  }

  var affectedNodes = {
    'added': null,
    'modified': null,
  };

  var mutation, i;

  for (i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    if (mutation.type === 'childList') {
      var addedNode, j;

      for (j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode.nodeType === 1 &&
            (addedNode.firstElementChild ||
             addedNode.hasAttribute(this._l10nIdName))) {
          if (!affectedNodes.added) {
            affectedNodes.added = [];
          }
          affectedNodes.added.push(addedNode);
        }
      }
    }

    if (mutation.type === 'attributes') {
      if (!affectedNodes.modified) {
        affectedNodes.modified = [];
      }
      affectedNodes.modified.push(mutation.target);
    }
  }

  if (affectedNodes.added || affectedNodes.modified) {
    this._callback(affectedNodes);
  }

  if (observerActive) {
    this._observer.observe(this._rootNode, this._config);
  }
};

L20nMutationObserver.prototype.observe = function(node, config, backlog) {
  this._rootNode = node || document;
  if (config) {
    this._config = config;
  }

  if (backlog) {
    switch (document.readyState) {
      case 'loading':
        break;
      case 'interactive':
      case 'complete':
        this.harvestDocument();
        break;
    }
  }

  this._observer = new MutationObserver(this.fireCallback.bind(this));
  this._observer.observe(this._rootNode, this._config);
};

L20nMutationObserver.prototype.disconnect = function() {
  this.observer.disconnect();
};

