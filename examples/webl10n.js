
Element.prototype.onL10nAttrs = function(cb) {
  if (!(this in moList)) {
    moList[this] = new MutationObserver(onMutations.bind(this, cb));
    moList[this].observe(this, moConfig);
  }
}

Element.prototype.setShadowL10n = function(domFragment) {
  var root = this.createShadowRoot();
  root.appendChild(domFragment);
}

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
    /*if (mutation.type === 'childList') {
      var addedNode;

      for (var j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        if (addedNode.childElementCount) {
          //translateFragment.call(this, addedNode);
        } else if (addedNode.hasAttribute('data-l10n-id')) {
          //translateElement.call(this, addedNode);
        }
      }
    }*/

    if (mutation.type === 'attributes') {
      cb([mutation.target]);
    }
  }
}



///// HEAD

var headObserver = new MutationObserver(onHeadMutations);

var headMOConfig = {
  attributes: false,
  characterData: false,
  childList: true,
  subtree: true,
};

function onHeadMutations(mutations, self) {
  var mutation;

  for (var i = 0; i < mutations.length; i++) {
    mutation = mutations[i];
    /*if (mutation.type === 'childList') {
      var addedNode;

      for (var j = 0; j < mutation.addedNodes.length; j++) {
        addedNode = mutation.addedNodes[j];

        if (addedNode.nodeType !== Node.ELEMENT_NODE) {
          continue;
        }

        if (addedNode.childElementCount) {
          //translateFragment.call(this, addedNode);
        } else if (addedNode.hasAttribute('data-l10n-id')) {
          //translateElement.call(this, addedNode);
        }
      }
    }*/

    if (mutation.type === 'attributes') {
      cb([mutation.target]);
    }
  }
}
