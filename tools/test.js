#!/usr/bin/env node

'use strict';

var Env = require('../lib/l20n/env').Environment;

var env = new Env('http://127.0.0.1');

var ctx = env.getContext();

function onResLoaded() {
  console.log('res loaded');
  ctx.get('title', null, function (entity) {
    console.log(entity);
  });
}


ctx.addEventListener('languagechange', function(locales) {
  ctx.addResource('./examples/locales/example.{locale}.properties', onResLoaded);
  console.log('language change');
  console.log(locales);
});
env.registerLocales('en-US', ['pl', 'en-US']);
env.requestLocales(['pl', 'en-US']);
