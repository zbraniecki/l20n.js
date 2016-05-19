import { L10nError } from '../../lib/errors';

const HTTP_STATUS_CODE_OK = 200;

function load(url) {
  const { classes: Cc, interfaces: Ci, utils: Cu } = Components;
  return new Promise((resolve, reject) => {
    var req = Cc["@mozilla.org/xmlextras/xmlhttprequest;1"]
                      .createInstance(Ci.nsIXMLHttpRequest)

    req.mozBackgroundRequest = true;
    req.overrideMimeType("text/plain");
    req.open("GET", url, true);

    req.addEventListener('load', () => {
      if (req.status == 200) {
        resolve(req.responseText);
      }
    });
    req.send(null);
  });
}

export function fetchResource(res, { code }) {
  const url = res.replace('{locale}', code);
  return load(url);
}
