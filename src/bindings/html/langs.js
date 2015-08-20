'use strict';

import { prioritizeLocales } from '../../lib/intl';
import { qps } from '../../lib/pseudo';

const rtlList = ['ar', 'he', 'fa', 'ps', 'qps-plocm', 'ur'];

export function negotiateLanguages(
  fn, appVersion, defaultLang, availableLangs, additionalLangs, prevLangs,
  requestedLangs) {

  const allAvailableLangs = Object.keys(availableLangs).concat(
    additionalLangs || []).concat(Object.keys(qps));
  const newLangs = prioritizeLocales(
    defaultLang, allAvailableLangs, requestedLangs);

  const langs = newLangs.map(code => ({
    code: code,
    src: getLangSource(appVersion, availableLangs, additionalLangs, code),
    dir: getDirection(code)
  }));

  if (!arrEqual(prevLangs, newLangs)) {
    fn(langs);
  }

  return langs;
}

export function getDirection(code) {
  return (rtlList.indexOf(code) >= 0) ? 'rtl' : 'ltr';
}

function arrEqual(arr1, arr2) {
  return arr1.length === arr2.length &&
    arr1.every((elem, i) => elem === arr2[i]);
}

function getMatchingLangpack(appVersion, langpacks) {
  for (let i = 0, langpack; (langpack = langpacks[i]); i++) {
    if (langpack.target === appVersion) {
      return langpack;
    }
  }
  return null;
}

function getLangSource(appVersion, availableLangs, additionalLangs, code) {
  if (additionalLangs && additionalLangs[code]) {
    const lp = getMatchingLangpack(appVersion, additionalLangs[code]);
    if (lp &&
        (!(code in availableLangs) ||
         parseInt(lp.revision) > availableLangs[code])) {
      return 'extra';
    }
  }

  if ((code in qps) && !(code in availableLangs)) {
    return 'qps';
  }

  return 'app';
}
