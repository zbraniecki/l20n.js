(function() {
  'use strict';

  this.PerfTest = PerfTest;
  this.init = init;

function PerfTest() {
  this.files = [];
  this.perfData = {
    'doc': {
      'performance.*': {},
      'load': [],
      'l10n bootstrap': [],
      'pages': {},
      'localized': [],
    },
    'contexts': {}
  };

  var self = this;

  // this is an object for
  // storing asynchronous timers
  this.timers = {};

  this.registerTimer = function(id, test, callback) {
    if (!id) {
      id = 'doc';
    }
    if (!this.timers[id]) {
      this.timers[id] = {};
    }
    if (!this.timers[id][test]) {
      this.timers[id][test] = {};
    }
    this.timers[id][test]['start'] = this.getTime();
  }

  this.addPerformanceAPINumbers = function() {
    for (var i in performance.timing) {
      if (performance.timing[i] === 0) {
        this.perfData['doc']['performance.*'][i] = [0, 0];
      } else {
        this.perfData['doc']['performance.*'][i] = [performance.timing.navigationStart, performance.timing[i]];
      }
    }
  }

  this.setTimerCallback = function(id, test, callback) {
    if (!this.timers[id]) {
      this.timers[id] = {};
    }
    if (!this.timers[id][test]) {
      this.timers[id][test] = {};
    }
    this.timers[id][test]['done'] = callback;
  }

  this.resolveTimer = function(id, test, start, end) {
    if (!id) {
      id = 'doc';
    }
    if (!start) {
      start = this.timers[id][test]['start'];
    }
    if (!end) {
      end = this.getTime();
    }
    if (this.timers[id][test]['done']) {
      this.timers[id][test]['done'](start, end);
    }
    return [start, end];
  }

  this.addDataPoint = function(ctxid, tname, elem, start, end) {
    if (!end) {
      end = this.getTime();
    }
    if (ctxid) {
      this.ensureContext(ctxid);
      var test = this.perfData['contexts'][ctxid][tname];
    } else {
      var test = this.perfData['doc'][tname];
    }
    if (elem) {
      test[elem] = [start, end];
    } else {
      test.push([start, end]);
    }
  }

  this.getTime = function() {
    return window.performance.now();
  }

  this.start = function(callback) {
    if (window.performanceTimer.files.length) {
      measureCodeLoading(callback);
    } else {
      callback();
    }
  }

  function max(array){
    return Math.max.apply(Math, array);
  }

  function min(array){
    return Math.min.apply(Math, array);
  }

  function sum(array) {
    return array.reduce(function(a,b){return a+b;});
  }

  this.addHook = function() {
    var body = document.body;
    var button = document.createElement('button');
    button.addEventListener('click', self.showStats);
    button.innerHTML = "click me";
    button.style.position = "fixed";
    button.style.bottom = 0;
    button.style.right = 0;
    body.appendChild(button);
  }

  function drawTestRow(table, name, test, subrow) {
    var tr = document.createElement('tr');
    var tds = [];
    var i;
    var values = [];

    for (i in test) {
      values.push(test[i][1] - test[i][0]);
    }
    if (values.length == 0) {
      return;
    }
    if (subrow) {
      name = '&nbsp;&nbsp;&nbsp;&nbsp;'+name;
    }
    tds.push(name);
    tds.push(values.length.toFixed(2));
    if (values.length > 1 && name !== 'performance.*') {
      tds.push(min(values).toFixed(2));
      tds.push((sum(values)/values.length).toFixed(2));
      tds.push(max(values).toFixed(2));
    } else {
      tds.push('&nbsp;');
      tds.push('&nbsp;');
      tds.push('&nbsp;');
    }
    if (name == 'performance.*') {
      tds.push(max(values).toFixed(2));
    } else {
      tds.push(sum(values).toFixed(2));
    }

    for (var j=0;j<tds.length;j++) {
      var td = document.createElement('td');
      td.innerHTML = tds[j];
      tr.appendChild(td);
    }
    if (!subrow && !Array.isArray(test)) {
      tr.setAttribute('expanded', 'false');
      tr.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        if (tr.getAttribute('expanded') == 'false') {
          var ns = tr.nextElementSibling;
          for (var j=0;j<values.length;j++) {
            ns.style.display = 'table-row';
            ns = ns.nextElementSibling;
          }
          tr.setAttribute('expanded', 'true');
        } else {
          var ns = tr.nextElementSibling;
          for (var j=0;j<values.length;j++) {
            ns.style.display = 'none';
            ns = ns.nextElementSibling;
          }
          tr.setAttribute('expanded', 'false');
        }
      });
    }
    if (subrow) {
      tr.style.display = 'none';
    }
    table.appendChild(tr);

    if (!Array.isArray(test)) {
      for (i in test) {
        drawTestRow(table, i, [test[i]], true);
      }
    }
  }

  this.showStats = function() {
    var body = document.getElementById('body');
    var tests = self.perfData['lib'];
    var cvs = document.createElement('div');
    cvs.setAttribute('style', 'z-index:100;position:absolute;top:0;left:0;background-color:#eee;border: 1px solid #333');
    cvs.addEventListener('click', function() {
      document.body.removeChild(cvs);
    });
    var h2;
    var headers = [
      'Name',
      'No.',
      'Min. time',
      'Avg. time',
      'Max. time',
      'Cum. time'  
    ];
    /* Document */
    var doc = self.perfData['doc'];
    h2 = document.createElement('h2');
    h2.innerHTML = 'Document';
    cvs.appendChild(h2);

    var button = document.createElement('button');
    button.innerHTML = 'Show graph';
    button.addEventListener('click', function(e) {
      showGraph();
      e.preventDefault();
      e.stopPropagation();
      return false;
    });
    cvs.appendChild(button);

    var table = document.createElement('table');
    table.setAttribute('border', '1');
    table.addEventListener('click', function(e) {
      e.preventDefault();
      e.stopPropagation();
    });
    var tr = document.createElement('tr');
    for (var j in headers) {
      var th = document.createElement('th');
      th.innerHTML = headers[j];
      tr.appendChild(th);
    } 
    table.appendChild(tr);
    for (var j in doc) {
      var test = doc[j];
      if (test.length == 0) {
        continue;
      }
      drawTestRow(table, j, test);
    }
    cvs.appendChild(table);

    /* Contexts */
    for (var i in self.perfData['contexts']) {
      var ctx = self.perfData['contexts'][i];
      h2 = document.createElement('h2');
      h2.innerHTML = 'Context "' + i + '"';
      cvs.appendChild(h2);

      var table = document.createElement('table');
      table.setAttribute('border', '1');
      table.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
      });
      var tr = document.createElement('tr');
      for (var j in headers) {
        var th = document.createElement('th');
        th.innerHTML = headers[j];
        tr.appendChild(th);
      } 
      table.appendChild(tr);
      for (var j in ctx) {
        var test = ctx[j];
        if (test.length == 0) {
          continue;
        }
        drawTestRow(table, j, test);
      }
      cvs.appendChild(table);
    }
    document.body.appendChild(cvs);
  }

  this.ensureContext = function(id) {
    if(!this.perfData.contexts[id]) {
      this.perfData.contexts[id] = {
        'bootstrap': [],
        'resloading': {},
        'parsing': {},
        'compilation': [],
        'execution': {}
      }; 
    }
  }

  /*
   * The reason why load scripts synchronously is because
   * otherwise they load in random order and that screws the library
   */
  function measureCodeLoading(callback) {
    var start = 0;
    var end = 0;

    var onLoad = function(e) { 
      if (!performanceTimer.files.length) {
        self.addDataPoint(null, 'load', null, start);
        callback();
      } else {
      var script = document.createElement('script');
      script.setAttribute('type', 'text/javascript');
      script.setAttribute('src', performanceTimer.files.shift());
      script.addEventListener('load', onLoad);
      document.body.appendChild(script); 
      }
    }

    start = performanceTimer.getTime();
    onLoad();
  }
}

function showGraph(){
  if(!window.__profiler || window.__profiler.scriptLoaded!==true){var d=document,h=d.getElementsByTagName("head")[0],s=d.createElement("script"),l=d.createElement("div"),c=function(){if(l){d.body.removeChild(l)}},t=new Date();s.type="text/javascript";l.style.cssText="z-index:999;position:fixed;top:10px;left:10px;display:inline;width:auto;font-size:14px;line-height:1.5em;font-family:Helvetica,Calibri,Arial,sans-serif;text-shadow:none;padding:3px 10px 0;background:#FFFDF2;box-shadow:0 0 0 3px rgba(0,0,0,.25),0 0 5px 5px rgba(0,0,0,.25); border-radius:1px";l.innerHTML="Just a moment";s.src="./js/graph.js?"+t.getTime();s.onload=c;s.onreadystatechange=function(){if(this.readyState=="loaded"){c()}};d.body.appendChild(l);h.appendChild(s);} else if(typeof window.__profiler === "function") {window.__profiler();}};

var performanceTimer;
window.performanceTimer = performanceTimer;

function init() {
  window.performanceTimer = new PerfTest();
  window.performanceTimer.addPerformanceAPINumbers();
  window.performanceTimer.addHook();
  init_l20n();
}

window.addEventListener('load', function() {
    init();
});
this.lol = '<proj "L20n"><settings "Settings {{proj}} Inline"><advancedSettings "Advanced Settings"><default "Default"><enabled "Enabled"><disabled "Disabled"><error "error"><ok "OK"><yes "Yes"><no "No"><cancel "Cancel"><close "Close"><back "Back"><pair "Pair"><done "Done">/* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# *//*  Connectivity *//* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# */<networkAndConnectivity "Network & Connectivity"><airplaneMode "Airplane Mode"><gps "GPS">/*  Connectivity :: Wi-Fi */<wifi "Wi-Fi"><wifi_disabled "Turn Wi-Fi on to view available networks."><availableNetworks "Available Networks"><knownNetworks "Known Networks"><hiddenNetworks "Hidden Networks"><scanning "Searching…"><scanNetworks "Search Again"><fullStatus_initializing       " initializing…"><fullStatus_connecting         " connecting to {{ssid}}…"><fullStatus_associated         " obtaining an IP address…"><fullStatus_connected          " connected to {{ssid}}."><fullStatus_connectingfailed   " connection failed."><fullStatus_disconnected       " offline."><shortStatus_connecting        " connecting…"><shortStatus_associated        " obtaining an IP address…"><shortStatus_connected         " connected."><shortStatus_connectingfailed  " connection failed."><shortStatus_disconnected      " offline."><manageNetworks "Manage Networks"><joinHiddenNetwork "Join Hidden Network"><securedBy "secured by {{capabilities}}"><security      " security"><securityNone  " none"><securityOpen  " open"><ipAddress "IP address"><linkSpeed "link speed"><linkSpeedMbs "{{ linkSpeed }} Mbit/s"><signalStrength  " signal strength"><signalLevel0    " very weak"><signalLevel1    " weak"><signalLevel2    " average"><signalLevel3    " good"><signalLevel4    " very good"><forget "Forget"><forgetNetwork "Forget network"><authentication "Authentication"><identity "Identifier"><password "Password"><showPassword "show password"><networkNotification "Network notification"><networkNotification_expl "Notify me when an open network is available"><macAddress "MAC Address"><noNetworksFound "no networks found"><noKnownNetworks "no known networks">/*  Connectivity :: Wi-Fi :: WPS */<wps "Wi-Fi Protected Setup"><wpsMessage "Connect with WPS"><fullStatus_wps_inprogress  " WPS is in progress…"><fullStatus_wps_canceled    " WPS was canceled."><fullStatus_wps_timedout    " WPS was timedout."><fullStatus_wps_failed      " WPS was failed."><fullStatus_wps_overlapped  " Another WPS PBC AP was found."><wpsDescription "Automatic wireless network configuration"><wpsMethodSelection "Select a WPS method:"><wpsPbcLabel "Button connection"><wpsMyPinLabel "My PIN connection"><wpsApPinLabel "AP PIN connection"><wpsPinDescription "PIN is 4 or 8 digits"><wpsPinInput "Input {{pin}} to opposite device"><wpsCancelMessage "Cancel WPS"><wpsCancelFailedMessage "Failed to cancel WPS">/*  Connectivity :: Cellular & Data */<cellularAndData "Cellular & Data"><dataNetwork "Carrier"><callWaiting "Call Waiting"><dataConnectivity "Data"><dataConnection "Data Connection"><dataRoaming "Data Roaming"><dataRoaming_enabled "Depending on your service agreement, extra charges may apply for data when you are in a roaming area."><dataRoaming_disabled "When entering a roaming area, your data connection will be turned off."><networkOperator "Network Operator"><availableOperators "Network Operators in the Area"><operator_networkType "Network Type"><operator_networkType_auto "Automatic"><operator_networkType_2G "2G only"><operator_networkType_3G "3G only"><operator_autoSelect "Automatic Selection"><operator_turnAutoSelectOff "Turn Automatic Selection off to view available network operators."><operator_status_connecting        " connecting…"><operator_status_connectingfailed  " connection failed"><operator_status_connected         " connected"><apn "APN"><apnSettings "APN Settings"><mmsSettings "MMS Settings"><mmsport "MMS Port"><mmsproxy "MMS Proxy"><mmsc "MMSC"><autoConfigure "Auto-Configure"><httpProxyHost "HTTP Proxy Host"><httpProxyPort "HTTP Proxy Port"><custom "(custom settings)">/*  Connectivity :: Bluetooth */<bluetooth  " Bluetooth"><bluetooth_enable_msg  " Turn Bluetooth on to view devices in the area."><bluetooth_paired_devices    " Paired Devices"><bluetooth_devices_in_area   " Devices in the Area"><bluetooth_visible_to_all  " Visible to all"><bt_status_nopaired  " No devices paired"><bt_status_turnoff   " Turned off"><bt_status_pairmore  " , +{{n}} more"><device_status_tap_connect  " Tap to connect"><device_status_pairing      " Pairing with device…"><device_status_waiting      " Waiting for other device…"><device_status_paired       " Paired"><device_status_connecting   " Connecting…"><device_status_connected    " Connected"><device_option_unpair       " Unpair"><device_option_connect      " Connect"><device_option_disconnect   " Disconnect"><search_for_device    " Searching for devices…"><search_device        " Search for Devices"><rename_device        " Rename My Device"><unnamed_device       " Unknown device"><change_phone_name    " Change Phone Name"><bluetooth_new_name   " New Name"><active_pair               " Confirm Devices to Pair"><active_pair_confirmation  " To pair with {{device}}, make sure that both devices currently have the following PIN displayed:"><active_pair_pincode       " To pair with {{device}}, enter the PIN on the device."><active_pair_passkey       " To pair with {{device}}, enter the Passkey on the device."><passive_pair               " Bluetooth Pairing Request"><passive_pair_confirmation  " {{device}} would like to pair with this phone. To accept, make sure that both devices currently have the following PIN displayed:"><passive_pair_pincode       " {{device}} would like to pair with this phone. To accept, enter the PIN on the device."><passive_pair_passkey       " {{device}} would like to pair with this phone. To accept, enter the Passkey on the device."><error_pair_title       " Unable to Pair Devices"><error_pair_pincode     " Unable to pair with the device. Check that the PIN is correct."><error_connect_title    " Unable to Connect Devices"><error_connect_msg      " Check that the device you\'re trying to connect with is still in range and has Bluetooth turned on."><unpair_title  " Unpair a connected device?"><unpair_msg    " You are currently connected to this device. Unpairing will also disconnect from it.">/*  Connectivity :: Internet Sharing */<internetSharing "Internet Sharing"><internetSharing_usb "USB"><internetSharing_usb_desc "Share my phone’s Internet connection with a USB-connected device."><internetSharing_wifi "Wi-Fi"><internetSharing_wifi_desc "Allow other devices to share my phone’s Internet connection by connecting via Wi-Fi."><hotspot "HotSpot"><wifi_hotspot "Wi-Fi Hotspot"><wifi_name "Name"><wifi_password "Password"><wifi_security "Security"><usb_tethering "USB Tethering"><hotspotSettings "HotSpot Settings"><ssid_name "SSID Network Name">/* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# *//*  Personalization *//* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# */<personalization "Personalization">/*  Personalization :: Sound */<sound "Sound"><message "Message"><volume "Volume"><select_tone "Select a Tone"><ring_tones "Ringtones"><alert_tones "Alert Tones"><classic "Classic"><oldSchool "Old School"><lowBit "Low Bit"><beep "Beep Beep"><volume_and_tones "Volume and Tones"><call "Call"><other_sounds "Other Sounds"><alerts "Alerts"><unlock_screen "Unlock Screen"><camera_shutter "Camera Shutter">/*  Personalization :: Display */<display "Display"><brightness "Brightness"><brightness_autoAdjust "Adjust Automatically"><lockScreen "Lock Screen"><wallpaper "Wallpaper"><screen_timeout "Screen Timeout"><one_minute    "  1 minute"><two_minutes   "  2 minutes"><five_minutes  "  5 minutes"><ten_minutes   " 10 minutes"><never "never">/*  Personalization :: Notifications */<notifications "Notifications"><lockscreen_notifications "Show on Lock Screen">/*  Personalization :: Date & Time */<dateAndTime "Date & Time"><setTimeAutomatically "Set Automatically"><setTimeManually "Set Manually"><timezoneMessage "Time Zone"><dateMessage "Date"><timeMessage "Time"><selectTimezoneContinent "Select Continent"><selectTimezone "Select Time Zone">/*  Personalization :: Language & Region */<languageAndRegion "Language & Region"><language "Language"><region "Region">/*  see http://www.cplusplus.com/reference/clibrary/ctime/strftime/ */<longDateFormat "%A, %B %d, %Y">/*  Personalization :: Keyboard */<keyboard "Keyboard"><keyboardLayouts "Keyboard Layouts"><keypad "Keypad"><vibration "Vibration"><clickSound "Click sound"><wordSuggestion "Word suggestion"><english "English"><dvorak "English (Dvorak)"><spanish "Spanish"><portuguese "Portuguese Brazilian"><latin "Other Latin scripts"><latin_desc "French, German, Norwegian (Bokmål), Slovak, Turkish"><cyrillic "Cyrillic scripts"><cyrillic_desc "Russian, Serbian (cyrillic)"><arabic "Arabic"><greek "Greek"><hebrew "Hebrew"><jp_kanji "Japanese"><jp_kanji_desc "Kanji"><traditionalChinese "Traditional Chinese"><traditionalChinese_desc "Zhuyin"><simplifiedChinese "Simplified Chinese"><simplifiedChinese_desc "Pinyin">/* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# *//*  Accounts (N/A) *//* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# */<accounts "Accounts"><persona "Persona"><mail "Mail">/* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# *//*  Security *//* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# */<securityAndPrivacy "Security & Privacy"><passcode_lock "Passcode Lock"><passcode_lock_desc "Passcode: {{code}}"><phoneLock "Phone Lock"><simSecurity "SIM Security">/*  Security :: Application Permissions */<appPermissions "Application Permissions"><permissions "Permissions"><revoke "Revoke"><ask "Ask"><deny "Deny"><allow "Grant"><uninstallApp "Uninstall App"><uninstallConfirm "Are you sure you want to uninstall {{ app }}?">/*  Security :: Phone Lock */<phone "Phone"><messages "Messages"><vibrate "Vibrate"><ring "Ring"><change "Change"><create "Create"><create_passcode "Create a Passcode"><enter_passcode "Enter Passcode"><new_passcode "New Passcode"><current_passcode "Current Passcode"><incorrect_passcode "Passcode is incorrect."><passcode_dont_match "Passcode don\'t match. Try again."><passcode "Passcode"><confirm_passcode "Confirm Passcode"><immediately "Immediately"><after_one_minute "After 1 minute"><after_five_minutes "After 5 minutes"><after_fifteen_minutes "After 15 minutes"><after_one_hour "After 1 hour"><after_four_hours "After 4 hours"><require_passcode "Require Passcode"><change_passcode "Change Passcode">/*  Security :: SIM PIN Lock */<noSimCard "No SIM Card"><simPin "SIM PIN"><pukCode "PUK Code"><whatIsSimPin "What is a SIM PIN?"><simPinIntro1 "A SIM PIN prevents access to the SIM card cellular data networks. When it’s on, any device containing the SIM card will request the PIN upon restart."><simPinIntro2 "A SIM PIN is not the same as the passcode used to unlock the device."><changeSimPin "Change PIN"><pinTitle "Enter SIM PIN"><pukTitle "Enter PUK Code"><newpinTitle "New PIN"><pinErrorMsg "The PIN was incorrect.">/*<pinAttemptMsg "{[ plural(n) ]}"><pinAttemptMsg[one] "one last try."><pinAttemptMsg[other] "{{n}} tries left.">*/<pinLastChanceMsg "This is your last chance to enter the correct PIN. Otherwise, you must enter the PUK code to use this SIM card."><simCardLockedMsg "The SIM Card is Locked."><enterPukMsg "You must enter the Personal Unlocking Key (PUK) Code for the SIM card. Refer to your SIM card documentation or contact your carrier for more information."><pukErrorMsg "The PUK Code is incorrect."><pukAttemptMsg "You have {{n}} tries left to enter the correct code before this SIM card will be permanently unusable. Refer to your SIM card documentation or contact your carrier for more information."><pukLastChanceMsg "Last chance to enter the correct PUK code. Your SIM card will be permanently unusable if you enter in the wrong PUK code. Refer to your SIM card documentation or contact your carrier for more information."><newSimPinMsg "Create PIN (must contain 4 to 8 digits)"><confirmNewSimPinMsg "Confirm New PIN"><newPinErrorMsg "PINs don’t match.">/*  Security :: Do Not Track */<doNotTrack "Do Not Track"><doNotTrack_dt "How does Do Not Track work?"><doNotTrack_dd1 "When you turn on the Do Not Track feature, your device tells every website and app (as well as advertisers and other content providers) that you don’t want your behavior tracked."><doNotTrack_dd2 "Turning on Do Not Track won’t affect your ability to log into websites, nor cause your device to forget your private information — such as the contents of shopping carts, location information, or log-in information.">/* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# *//*  Device *//* =#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=#=# */<device "Device"><storage "Storage"><helpAndFeedback "Help & Feedback">/*  Device :: Information */<deviceInfo "Device Information"><gitInfo "Git commit info"><developer "Developer"><devSettings "Developer Settings"><debug "Debug"><grid "Grid"><fps_monitor "Show frames per second"><paint_flashing "Flash repainted area"><log_animations "Log slow animations"><dev_mode "Developer Mode"><oop_disabled "Disable Out-Of-Process"><remote_debugging "Remote Debugging"><wifi_debugging "Wi-Fi output in adb"><ttl_monitor "Show time to load"><model_name "Model"><os_version "OS Version"><last_updated "Last Updated"><more_info "More Information"><softwareUpdates "Software Updates"><check_update_daily      " Daily"><check_update_weekly     " Weekly"><check_update_monthly    " Monthly"><check_for_updates       " Check for Updates"><check_update_now        " Check Now"><update_status           " Update Status"><checking_for_update     " Checking for Updates..."><no_updates              " No updates were found"><retry_when_online       " Network is offline, will check again when the network is online"><already_latest_version  " This is already the latest version of Firefox OS"><aboutFirefoxOS   " About Firefox OS"><firefox_os_desc  " Firefox OS is the free and open source operating system from Mozilla. Our mission is to promote openness, innovation and opportunity by keeping the power of the Web in your hands."><learn_more "Learn More"><reset_phone "Reset Phone"><reset_warning_1 " CAUTION: Resetting will erase all your data, including any apps you\'ve purchased."><reset_warning_2 " The phone will be restored to its factory condition. None of your settings or data will be saved.">/*  Localization note: the about* and licensing* strings below aren’t ready for translation yet. */<about_your_rights    " About Your Rights"><about_your_rights_0  " Mozilla Firefox is free and open source software, built by a community of thousands from all over the world. There are a few things you should know:"><about_your_rights_1  " Firefox is made available to you under the terms of the Mozilla Public License. This means you may use, copy and distribute Firefox to others.  You are also welcome to modify the source code of Firefox as you want to meet your needs. The Mozilla Public License also gives you the right to distribute your modified versions."><about_your_rights_2  " You are not granted any trademark rights or licenses to the trademarks of the Mozilla Foundation or any party, including without Temporary Text limitation the Firefox name or logo. Additional information on trademarks may be found only here."><about_your_rights_3  " Some features in Firefox, such as the Crash Reporter, give you the option to provide feedback to Mozilla. By choosing to submit feedback, you give Mozilla permission to use the feedback to improve its products, to publish the feedback on its websites, and to distribute the feedback."><about_your_privacy  " About Your Privacy"><licensing         " Licensing"><licensing_1       " Binaries of this product have been made available to you by the Mozilla Project, under the Mozilla Public License 2.0 (MPL). Know your rights."><licensing_2       " All of the source code to this product is available under licenses which are both free and open source. Most of it is available under the Mozilla Public License 2.0 (MPL)."><licensing_3       " The remainder of the software which is not under the Mozilla Public License 2.0 MPL is available under one of a variety of other licenses.  Those that require reproduction of the license text in the distribution are given below. (Note: your copy of this product may not contain code covered by one or more of the licenses listed here, depending on the exact product and version you choose.)"><licensing_MPL     " Mozilla Public License 2.0"><licensing_Apache  " Apache License 2.0">/*  Device :: Device Storage */<deviceStorage "Device Storage"><umsEnabled "USB Mass Storage Enabled"><umsUnplugToDisable "Unplug USB cable to disable"><appStorage "Application Storage"><size_B  " {{size}} B"><size_KB  " {{size}} KB"><size_MB  " {{size}} MB"><size_GB  " {{size}} GB"><size_TB  " {{size}} TB"><available_size_B  " {{size}} B available"><available_size_KB  " {{size}} KB available"><available_size_MB  " {{size}} MB available"><available_size_GB  " {{size}} GB available"><available_size_TB  " {{size}} TB available"><apps_total_space "Total Space"><apps_used_space "Used"><apps_free_space "Left"><media_storage_details "Photos, videos, and music are stored in the SD Card. See Media Storage for details.">/*  Device :: Media Storage */<mediaStorage "Media Storage"><music_space "Music"><pictures_space "Pictures"><videos_space "Movies"><left_space "Space Left"><size_not_available "Not available"><no_storage "No storage found"><advanced "Advanced">/*  Device :: Battery */<battery "Battery"><batteryLevel "Current Level"><batteryLevel_percent_unplugged  " {{level}}%"><batteryLevel_percent_charging   " {{level}}% (charging)"><batteryLevel_percent_charged   " {{level}}% (charged)"><powerSaveMode "Power Save Mode"><powerSave_threshold "{{level}}% battery left"><powerSave_expl "Turning on Power Save Mode turns off the phone’s Data, Bluetooth, and GPS connections to extend battery life. You can still turn these services back on manually."><never "Never"><turnOnAuto "Turn on automatically">/*  Device :: Accessibility */<accessibility "Accessibility"><invertColors "Invert Colors"><screenReader "Screen Reader">/*  Device :: Improve Firefox OS */<improveFirefoxOS "Improve Firefox OS"><performanceData "Performance Data"><performanceDataInfo "Make Firefox OS faster and easier to use by sharing information over Wi-Fi about your phone’s performance."><sharePerformanceData "Submit performance data"><crashReports "Crash Reports"><crashReportInfo "Sending Mozilla a report when a crash occurs helps us fix the problem for everyone. Reports are sent over Wi-Fi only."><alwaysSendReport "Always send a report"><neverSendReport "Never send a report"><askToSendReport "Ask me when a crash occurs">/*  Device :: Help */<online_support "Online support:"><online_support_link "www.telefonica.com"><call_support "Call support:"><call_support_number "+1 650-903-0800"><user_guide "User Guide">/*  Device :: SIM Toolkit */<stkAppsNotAvailable "SIM card applications not available."><simToolkit "SIM Toolkit">';

function init_l20n() {
  window.performanceTimer.start(function() {
    var start = window.performanceTimer.getTime();
    document.addEventListener('LocalizationReady', function() {
      var end = window.performanceTimer.getTime();
      window.performanceTimer.addDataPoint(null, 'l10n bootstrap', null, start, end);
    });
    translateDocument();
    //ctx.freeze();
  });
}

function init_l10n() {
  var start = window.performanceTimer.getTime();
  l10nStartup();
  window.addEventListener('localized', function() {
    var panel = document.getElementById('root');
    //navigator.mozL10n.translate(panel);
    var end = window.performanceTimer.getTime();
    window.performanceTimer.addDataPoint(null, 'l10n bootstrap', null, start, end);
  });
}

}).call(this);
