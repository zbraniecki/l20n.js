'use strict';

//XXX: We'd need to know on which root the mutation callback is fired

let pending = false;
const observedElements = new Map();

function onMutations() {
  if (pending) {
    return;
  }

  pending = true;

  window.requestAnimationFrame(() => {
    pending = false;
    const affectedElements = this.scanRootForChanges(this._root);
    
    let dirty = false;

    for (let [,type] of affectedElements) {
      if (type.size > 0) {
        dirty = true;
        break;
      }
    }
    if (dirty) {
      console.log('calling');
      this._callback(affectedElements);
    }
  });
}


export class NodeWatcher {
  constructor(callback, config) {
    this._callback = callback;
    this._config = config;
    this._root = null;
    this._mo = new MutationObserver(onMutations.bind(this));
  }

  observe(root) {
    //XXX: This is wrong, but we should know where it's coming from
    // and set `pending` for a given root
    // For now there's only going to be one
    this._root = root;
    const observerConfig = {
      childList: true,
      characterData: false,
      subtree: true,
      attributes: true,
      attributeFilter: this._config.args
    };

    this._mo.observe(root, observerConfig);
  }

  disconnect() {
    this._mo.disconnect();
  }


  scanRootForChanges(root) {
    const targets = [...root.querySelectorAll('[data-l10n-id]')];
    const types = this._config.types;

    const affectedElements = new Map();
    for (let key of types) {
      affectedElements.set(key, new Set());
    }

    targets.forEach(target => {
      //XXX: We will want to handle pre-translated scenario
      // which sucks, because without knowing if the element changed
      // it means we have to scan all elements regardles of
      // pre-translation.
      if (types.includes('added') && !observedElements.has(target)) {
        affectedElements.get('added').add(target);

        const args = {};
        for (let arg of this._config.args) {
          args[arg] = target.getAttribute(arg);
        }
        observedElements.set(target, args);
        return;
      }

      if (types.includes('modified')) {
        const elemData = observedElements.get(target);

        for (let arg of this._config.args) {
          if (elemData[arg] !== target.getAttribute(arg)) {
            affectedElements.get('modified').add(target);
            const args = {};
            for (let arg of this._config.args) {
              args[arg] = target.getAttribute(arg);
            }
            observedElements.set(target, args);
            break;
          }
        }
      }
    });

    if (types.includes('removed')) {
      for (let elem in observedElements) {
        if (targets.indexOf(elem) === -1) {
          affectedElements.get('removed').add(elem);
          observedElements.delete(elem);
        }
      }
    }

    return affectedElements;
  }
}
