(function(global) {

  global.mozIntl = {
    DateTimeFormat: function(locales, options) {
      var resolvedOptions = Object.assign({}, options);

      if(options.dayperiod) {
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
