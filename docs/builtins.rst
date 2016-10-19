================
Builtins in L20n
================

L20n ships with a number of built-in functions that can be used from within
localization messages.

The list of built-ins is extensible and environments may want to add additional
built-ins designated to aid localizers writing translations targeted
for a given environment.


How to use Built-ins
====================

Localizers can reference builtin in a message within a placeable and either
display the return value, or use it in the selector expression to select
the right value.

Examples::


  today-is = Today is { DATETIME($date, weekday=long) } 


Default built-ins
=================

Default built-ins are very generic and should be applicable to any translation
environment.

``NUMBER``
    Formats a number to a string in a given locale.
    Accepts the same parameters as `Intl.NumberFormat`_ API.

    Example::

      dpi-ratio = Your DPI ratio is { NUMBER($ratio, minimumFractionDigits=2) } 

``DATETIME``
    Formats a date to a string in a given locale.
    Accepts the same parameters as `Intl.DateTimeFormat`_ API.

    Example::

      today-is = Today is { DATETIME($date, month=long, year=numeric, day=numeric) } 

``PLURAL``
    Returns a plural form that matches the number for a given locale.
    Accepts the same parameters as `Intl.PluralRules`_ API.

    Example::
  
      liked-count = { PLURAL($num) ->
        [one]   One person liked your message
       *[other] { $num } people liked your message
      }
      

``LIST``
    Formats a list to a string in a given locale.
    Accepts the same parameters as `Intl.ListFormat`_ API.

    Example::

      users = { LIST($user1, $user2, $user3) }

      users2 = { LIST($users) }


``LEN``
    Returns the number that represents the length of the list argument.
    Similar to JS `Array.length`_ API.

    Example::

      unread-emails = Number of unread emails: { LEN($emails) }

``TAKE``
    Returns a slice of a list.
    Similar to JS `Array.prototype.slice`_ API.

    Example::

      first-user = Primarely, { TAKE($users, 1) } likesd your message.

``DROP``
    Returns a slice of the list starting from a given index.
    Similar to JS `Array.prototype.slice`_ API.

    Example::

      more-users = But ultimately, { DROP($users, 1) } like your message as well.


Implicit use
============

In order to simplify most common scenarios, L20n will run a default
built-in while resolving placeables.

For the list of implicit built-ins, the implict example has exactly the same
result as the explicit one.

``NUMBER``
    If the variable passed from the developer is a number and is used in
    a placeable, L20n will implicitly call a `NUMBER` built-in on it.

    Example::

      emails = Number of unread emails { $unreadEmails }

      emails2 = Number of unread emails { NUMBER($undeadEmails) }

``DATETIME``
    If the variable passed from the developer is a date and is used in
    a placeable, L20n will implicitly call a `DATE` built-in on it.

    Example::

      log-time = Entry time: { $date }

      log-time2 = Entry time: { DATETIME($date) }

``PLURAL``
    If the variable passed from the developer is a number and is used in
    a selector expression, L20n will implicitly call a `PLURAL` built-in on it.

    Example::

      liked-count = { PLURAL($num) ->
        [one]   One person liked your message
       *[other] { $num } people liked your message
      }

      liked-count2 = { $num ->
        [one]   One person liked your message
       *[other] { $num } people liked your message
      }

``LIST``
    If the variable passed from the developer is a number and is used in
    a placeable, L20n will implicitly call a `LIST` built-in on it.

    Also, if the placeable is a list of variables, L20n will implicitly
    call a `LIST` built-in on it.

    Example::

      users = { LIST($user1, $user2, $user3) }

      users2 = { $user1, $user2, $user3 }

      users = { LIST($users) }

      users2 = { $users }


Partially resolved built-ins
============================

In the future we'll want to allow for partially resolved builtins to be
constructed by the developer and passed to the localization.
This scenario will be used when the developer wants to define the
default parameters for the built-in, but allow the localizer
to override them if needed.

It may look like this::

  main.js:

  let s = document.l10n.formatValue('key1', {
    'date': L20n.DateTime({
      month: 'long',
      year: 'numeric',
      day: 'numeric'
    })
  });

  main.ftl:

  # If the localizers doesn't need to change anything
  key1 = Current date is { $date }

  # If the localizer needs to change the way we display month to fit the text
  key1 = Current date is { DATETIME($date, month=short) }


Gecko runtime specific built-ins
================================

At the moment Gecko supports the following OS-specific built-ins:

``OS``
    Returns a code-name that matches the host environment in which the
    translation is being resolved.

    Example::

      settings-menu = { OS() ->
        [mac] Preferences
       *[other] Settings
      }

      downloads =
        [html/accesskey] { OS -> 
          [win] J
          [lin] U
         *[other] Y
        }

.. _Intl.NumberFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/NumberFormat
.. _Intl.DateTimeFormat: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/DateTimeFormat
.. _Intl.PluralRules: https://rawgit.com/caridy/intl-plural-rules-spec/master/index.html
.. _Intl.ListFormat: https://rawgit.com/zbraniecki/proposal-intl-list-format/master/index.html
.. _array.length: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/length
.. _Array.prototype.slice: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
