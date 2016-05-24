import FTLRuntimeParser from '../ftl/entries/parser';
import { format } from './resolver';
import { FTLNone } from './types';

export class MessageContext {
  constructor(lang, { functions } = {}) {
    this.lang = lang;
    this.functions = functions || {}
    this.messages = new Map();
    this.intls = new WeakMap();
  }

  addMessages(source) {
    const [entries, errors] = FTLRuntimeParser.parseResource(source);
    for (let id in entries) {
      this.messages.set(id, entries[id]);
    }

    return errors;
  }

  // format `entity` to a string or null
  formatToPrimitive(entity, args) {
    const result = format(this, args, entity);
    return (result[0] instanceof FTLNone) ?
      [null, result[1]] : result;
  }

  // format `entity` to a string
  format(entity, args) {
    const result = format(this, args, entity);
    return [result[0].toString(), result[1]];
  }

  _memoizeIntlObject(ctor, opts) {
    const cache = this.intls.get(ctor) || {};
    const id = JSON.stringify(opts);

    if (!cache[id]) {
      cache[id] = new ctor(this.lang, opts);
      this.intls.set(ctor, cache);
    }

    return cache[id];
  }

}
