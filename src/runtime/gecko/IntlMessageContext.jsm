import { MessageContext } from '../../intl/context';


this.EXPORTED_SYMBOLS = ["MessageContext", "MessageArgument"];


function MessageArgument(formatter, options, values) {
  if (values === undefined) {
    return (values) => {
      if (values === undefined) {
        throw new Error('Cannot resolve Argument without a value');
      }
      if (!Array.isArray(values)) {
        values = [values];
      }
      return {
        formatter,
        options,
        values
      };
    };
  }
  if (!Array.isArray(values)) {
    values = [values];
  }
  return {
    formatter,
    options,
    values
  };
}

this.MessageContext = MessageContext;
this.MessageArgument = MessageArgument;
