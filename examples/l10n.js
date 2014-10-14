
document.body.onL10nAttrs(function(nodes) {
  var f = document.createDocumentFragment();
  f.textContent = 'foo';
  nodes[0].setShadowL10n(f);
});
