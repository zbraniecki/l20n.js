'use strict';

import { L10nError } from '../../../lib/errors';
import { Env, amendError } from '../../../lib/env';
import { LegacyContext } from './context';
import { createEntry } from './resolver';
import PropertiesParser from './parser';
import { walkContent } from './pseudo';
import { qps } from '../../../lib/pseudo';

// XXX babel's inheritance code triggers JavaScript warnings about modifying 
// the prototype object so we use regular prototypal inheritance here
export function LegacyEnv(defaultLang, fetch) {
  Env.call(this, defaultLang, fetch);
}

LegacyEnv.prototype = Object.create(Env.prototype);

LegacyEnv.prototype.createContext = function(resIds) {
  return new LegacyContext(this, resIds);
};

LegacyEnv.prototype._parse = function(syntax, lang, data) {
  const emit = (type, err) => this.emit(type, amendError(lang, err));
  return PropertiesParser.parse.call(PropertiesParser, emit, data);
};

LegacyEnv.prototype._create = function(lang, ast) {
  const entries = Object.create(null);
  const create = lang.src === 'qps' ?
    createPseudoEntry : createEntry;

  for (let i = 0, node; node = ast[i]; i++) {
    const id = node.$i;
    if (id in entries) {
      this.emit('duplicateerror', new L10nError(
       'Duplicate string "' + id + '" found in ' + lang.code, id, lang));
    }
    entries[id] = create(node, lang);
  }

  return entries;
};

function createPseudoEntry(node, lang) {
  return createEntry(walkContent(node, qps[lang.code].translate));
}
