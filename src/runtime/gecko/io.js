const HTTP_STATUS_CODE_OK = 200;

function load(url) {
  return new Promise((resolve) => {
    const req = Components.classes['@mozilla.org/xmlextras/xmlhttprequest;1']
                      .createInstance(Ci.nsIXMLHttpRequest)

    req.mozBackgroundRequest = true;
    req.overrideMimeType('text/plain');
    req.open('GET', url, true);

    req.addEventListener('load', () => {
      if (req.status === HTTP_STATUS_CODE_OK) {
        resolve(req.responseText);
      }
    });
    req.send(null);
  });
}

export function fetchResource(res, code) {
  const url = res.replace('{locale}', code);
  return load(url);
}
