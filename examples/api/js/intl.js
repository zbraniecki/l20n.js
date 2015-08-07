(function(global) {

  /**
   * 1) Add `dayperiod` to options for 'am|pm'
   *
   * 2) Add format object that allows for formatting of each token
   *
   * Example:
   * Intl.DateTimeFormat(navigator.languages, {
   *   'hour': '2-digit',
   *   'minute: '2-digit',
   *   'format': {
   *     'hour': '<span class="hour">{{hour}}</span>',
   *     'minute': '<span class="minute">{{minute}}</span>'
   *   }
   * });
   *
   *
   * Future:
   * - Intl.LocaleData(navigator.languages)
   *   - DisplayNames
   *     - Alphabet(navigator.languages)
   *       - letters
   *       - auxiliary
   *       - index
   *       - punctuation
   *     - Language(navigator.languages, options)
   *       - options:
   *         - length: long|short
   *       - returns:
   *         - name
   *     - Script(navigator.languages, options)
   *       - options:
   *         - variant: stand-alone|long
   *       - returns:
   *         - name
   *     - Territory
   *   - Layout Elements
   *   - Character Elements
   *     - indexLabels
   *       - indexRangePattern
   *     - ellipsis
   *       - initial | medial | final
   *       - word-initial
   *   - Delimiter Elements
   *     - quotationStart | quotationEnd
   *     - alternativeQutationStart | alternativeQuotationEnd
   *   - Measurement Data
   *     - measurement data
   *       - metric | US | UK
   *     - paper size
   *       - A4 | US-Letter
   *   - Unit Elements
   *     - number of days "3 days"
   *     - "x kB"
   *     - "0 C"
   *     - "2 km/h"
   *     - "2 feet per second"
   *     - "2 kB/s"
   *     - "3 ft 2 in"
   *   - POSIX Elements
   *   - Reference Element
   *   - Segmentations
   *   - Transforms
   *   - List Patterns
   *     - "Monday, Tuesday and Saturday"
   *     - 2 | start | middle | end
   *     - gender for list (neutral | mixedNeutral | maleTaints)
   *   - ContextTransform Elements
   *   - Choice Patterns
   **/
  global.mozIntl = {
    DateTimeFormat: function(locales, options) {
      const resolvedOptions = Object.assign({}, options);

      if (options.dayperiod) {
        if (!('hour' in options)) {
          resolvedOptions.hour = 'numeric';
        }
      }

      var intlFormat = new Intl.DateTimeFormat(locales, resolvedOptions);

      return {
        format: function(d) {
          let res = intlFormat.format(d);

          if (options.dayperiod === false) {
            const dayPeriod = d.toLocaleFormat('%p');
            return res.replace(dayPeriod, '').trim();
          } else if (options.dayperiod === true &&
              options.hour === undefined) {
            const dayPeriod = d.toLocaleFormat('%p');
            const hour = d.toLocaleString(navigator.languages, {
              hour12: options.hour12,
              hour: 'numeric'
            }).replace(dayPeriod, '').trim();
            return res.replace(hour, '').trim();
          }

          return res;
        },
        range: function() {},
        relativeDateTime: function() {
         // option to decide if to use "last Thursday"
        },
        pluralRules: function() {},
        pluralRule: function() {}
        city: function() {},
        ranges: function() {},
      };
    }
  };
})(this);
