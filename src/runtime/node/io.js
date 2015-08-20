'use strict';

import { readFile } from 'fs';
import { L10nError } from '../../lib/errors';
import 'string.prototype.endswith';

function load(url) {
  return new Promise(function(resolve, reject) {
    readFile(url, function(err, data) {
      if (err) {
        reject(new L10nError(err.message));
      } else {
        resolve(data.toString());
      }
    });
  });
}

export function fetch(res, lang) {
  const url = res.replace('{locale}', lang.code);
  return res.endsWith('.json') ?
    load(url).then(JSON.parse) : load(url);
}
