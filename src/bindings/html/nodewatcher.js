var pending = false;
var observedElements = new Map();

var mo = new MutationObserver(onMutations);

function onMutations() {
  if (pending) {
    return;
  }
  pending = true;

  window.requestAnimationFrame(function() {
    pending = false;
    const targets = [...document.querySelectorAll('[data-l10n-id]')];

    const addedTargets = new Set();
    const modifiedTargets = new Set();
    const removedTargets = new Set();

    targets.forEach(target => {
      if (!observedElements.has(target)) {
        addedTargets.add(target);
        return;
      }
      
      const elemData = observedElements.get(target);

      if (elemData.l10nId !== target.getAttribute('data-l10n-id') ||
          elemData.l10nArgs !== target.getAttribute('data-l10n-args')) {
        modifiedTargets.add(target);
      }
    });

    for (elem in observerElements) {
      if (targets.indexOf(elem) === -1) {
        removedTargets.add(elem);
        observedElements.delete(elem);
      }
    }

    translateElements(addedTargets, modifiedTargets, removedTargets);
  });
}

mo.observe(document, {
  childList: true,
  characterData: false,
  subtree: true,
  attributes: true,
  attributeFilter: ['data-l10n-id', 'data-l10n-args']
});

