'use strict';

/* jshint -W104 */
/* global io */
/* exported loadINI */

function loadManifest(url, callback) {
  io.loadJSON(url, function(err, json) {
    callback(json);
  });
}

function relativePath(baseUrl, url) {
  if (url[0] === '/') {
    return url;
  }

  var dirs = baseUrl.split('/')
    .slice(0, -1)
    .concat(url.split('/'))
    .filter(function(path) {
      return path !== '.';
    });

  return dirs.join('/');
}

