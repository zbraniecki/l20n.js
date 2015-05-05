'use strict';

export default function localeFormat(formatValueSync, d, format) {
  d = new Date(d);
  var tokens = format.match(/(%E.|%O.|%.)/g);

  for (var i = 0; tokens && i < tokens.length; i++) {
    var value = '';

    // http://pubs.opengroup.org/onlinepubs/007908799/xsh/strftime.html
    switch (tokens[i]) {
      // localized day/month names
      case '%a':
        value = 'weekday-' + d.getDay() + '-short';
        break;
      case '%A':
        value = 'weekday-' + d.getDay() + '-long';
        break;
      case '%b':
      case '%h':
        value = 'month-' + d.getMonth() + '-short';
        break;
      case '%B':
        value = 'month-' + d.getMonth() + '-long';
        break;
      case '%Eb':
        value = 'month-' + d.getMonth() + '-genitive';
        break;

      // like %H, but in 12-hour format and without any leading zero
      case '%I':
        value = d.getHours() % 12 || 12;
        break;

      // like %d, without any leading zero
      case '%e':
        value = d.getDate();
        break;

      // %p: 12 hours format (AM/PM)
      case '%p':
        value = d.getHours() < 12 ? 'time_am' : 'time_pm';
        break;

      // localized date/time strings
      case '%c':
      case '%x':
      case '%X':
        // ensure the localized format string doesn't contain any %c|%x|%X
        var tmp = formatValueSync('dateTimeFormat_' + tokens[i][1])[1];
        if (tmp && !/(%c|%x|%X)/.test(tmp)) {
          value = localeFormat(formatValueSync, d, tmp);
        }
        break;

        // other tokens don't require any localization
    }

    if (typeof value === 'string' && value.length > 0) {
      value = formatValueSync(value)[1];
    } else if (Array.isArray(value)) {
      value = value[1];
    }

    format = format.replace(tokens[i], value || d.toLocaleFormat(tokens[i]));
  }

  return [{}, format];
}
