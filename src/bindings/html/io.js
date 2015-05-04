'use strict';

import { L10nError } from '../../lib/errors';
import L20nParser from '../../lib/format/l20n/parser';

function load(type, url) {
  return new Promise(function(resolve, reject) {
    var xhr = new XMLHttpRequest();

    if (xhr.overrideMimeType) {
      xhr.overrideMimeType(type);
    }

    xhr.open('GET', url, true);

    if (type === 'application/json') {
      xhr.responseType = 'json';
    }

    xhr.addEventListener('load', function io_onload(e) {
      if (e.target.status === 200 || e.target.status === 0) {
        // Sinon.JS's FakeXHR doesn't have the response property
        resolve(e.target.response || e.target.responseText);
      } else {
        reject(new L10nError('Not found: ' + url));
      }
    });
    xhr.addEventListener('error', reject);
    xhr.addEventListener('timeout', reject);

    // the app: protocol throws on 404, see https://bugzil.la/827243
    try {
      xhr.send(null);
    } catch (e) {
      if (e.name === 'NS_ERROR_FILE_NOT_FOUND') {
        // the app: protocol throws on 404, see https://bugzil.la/827243
        reject(new L10nError('Not found: ' + url));
      } else {
        throw e;
      }
    }
  });
}

const io = {
  extra: function(lang, ver, path, type) {
    if (type === 'properties') {
      type = 'text';
    }
    return navigator.mozApps.getLocalizationResource(
      lang, ver, path, type);
  },
  app: function(lang, ver, path, type) {
    switch (type) {
      case 'l20n':
        return load('text/plain', path);
      case 'json':
        return load('application/json', path);
      default:
        throw new L10nError('Unknown file type: ' + type);
    }
  },
};

const parsers = {
  l20n: L20nParser.parse.bind(L20nParser),
  json: null
};


export default {
  fetch: function(getSource, ver, res, lang) {
    var url = res.replace('{locale}', lang);
    var type = res.substr(res.lastIndexOf('.') + 1);
    var raw = io[getSource(lang) || 'app'](lang, ver, url, type);
    return parsers[type] ? raw.then(parsers[type]) : raw;
  }
};

