var SongkickAnalytics = function(_collectorUrl, pageProperties) {
  this._cookiePrefix = "_skan_"
  this._cookieVersion = "2";  //increment to start new cookies.
  this._cookieExpiresMs = 63072000000;  // 2 years
  this._collectorUrl = _collectorUrl;
  this._pageProperties = pageProperties;
  this._analyticsCookie = null;
}

SongkickAnalytics.prototype.getV1AnalyticsCookieName = function() {
  return this._uidCookieName = this._cookiePrefix + "_id_1";
}

SongkickAnalytics.prototype.getAnalyticsCookieName = function() {
  return this._uidCookieName = this._cookiePrefix + "_id_" + this._cookieVersion;
}

SongkickAnalytics.prototype.getEventRequestObject = function(category, action, properties) {
  var properties = typeof properties === "undefined" ? {} : properties;
  for (var k in this._pageProperties) {
    properties[k] = this._pageProperties[k];
  }
  if (!this._analyticsCookie) {
    this._analyticsCookie = this.initAnalyticsCookie();
  }
  var requestObj = {
    uid: this._analyticsCookie.analyticsUserId,
    url: window.location.href,
    refr: this.getReferrer(),
    ev_ca: category,
    ev_ac: action,
    ev_pr: this.serializeQueryParams(properties),
    res: this.getBrowserFeatures().res
  }
  return requestObj;
}

SongkickAnalytics.prototype.logEventObject = function(eventObject) {
  var category = null;
  var action = null;
  var properties = {}
  for (key in eventObject) {
    if (key == "category") {
      category = eventObject[key];
    } else if (key == "action") {
      action = eventObject[key];
    } else {
      properties[key] = eventObject[key];
    }
  }
  this.logEvent(category, action, properties);
}

SongkickAnalytics.prototype.logEvent = function(category, action, properties) {
  var requestObj = this.getEventRequestObject(category, action, properties)
  var request = this.serializeQueryParams(requestObj);
  if (typeof this._collectorUrl  === 'undefined' ||
      typeof this._collectorUrl  === null)
  {
    throw "No collector url set, cannot log events";
  }
  this.loadImage(this._collectorUrl + '?' + request);
}

SongkickAnalytics.prototype.loadImage = function(src) {
  var image = new Image(1, 1);
  image.onload = function () {};
  image.src = src;
}


SongkickAnalytics.prototype.getAnalyticsData = function(data) {
  var analyticsData = {};
  $.each(data, function(key, value) {
    var m;
    if(m = /^analytics(.*)/.exec(key)) {
      var propertyKey = m[1].replace(/^([A-Z])/, function($1){return $1.toLowerCase();});
      analyticsData[propertyKey] = value;
    }
  });
  return analyticsData;
}

SongkickAnalytics.prototype.serializeQueryParams = function(object) {
  var props = [];
  var sortedKeys = [];
  for(var key in object) {
    sortedKeys.push(key);
  }
  sortedKeys.sort();
  for(var i in sortedKeys) {
    var key = sortedKeys[i];
    props.push(encodeURIComponent(key) + "=" + encodeURIComponent(object[key]));
  }
  return props.join("&");
}

/*
* Register event tracking on elements with class="analytics-click" or class="analytics-change"
* and log all attributes prefixed with data-analytics- as event properties.
*/
SongkickAnalytics.prototype.init = function() {
  var instance = this;
  var getAnalyticsDataForCategory = function(data, eventType) {
    var analyticsData = instance.getAnalyticsData(data);
    if (!("category" in analyticsData)) {
      analyticsData.category = eventType;
    }
    return analyticsData;
    instance.logEventObject(analyticsData);
  }
  $(".analytics-click").click(function() {
    var analyticsData = getAnalyticsDataForCategory($(this).data(), "click")
    instance.logEventObject(analyticsData);
  });
  $(".analytics-change").change(function() {
    var analyticsData = getAnalyticsDataForCategory($(this).data(), "change")
    var selected = $(this).find("option:selected");
    if (selected && selected.length === 1) {
      analyticsData.selected = selected.val();
    }
    instance.logEventObject(analyticsData);
  });
  this._analyticsCookie = this.initAnalyticsCookie();
}

SongkickAnalytics.prototype.deserializeCookie = function(cookieValue) {
  var cookieValues = cookieValue.split('.');
  var cookieData = {};
  cookieData.analyticsUserId = cookieValues[0];
  cookieData.creationTs = cookieValues[1];
  cookieData.currentTs = cookieValues[2];
  cookieData.lastVisitTs = cookieValues[3];
  return cookieData;
}

SongkickAnalytics.prototype.serializeCookie = function(cookieData) {
  return cookieData.analyticsUserId+"."+cookieData.creationTs+"."+cookieData.currentTs+"."+cookieData.lastVisitTs;
}

SongkickAnalytics.prototype.identifyDomain = function(host) {
  // Strip the trailing :port if present.
  subdomain = new RegExp('([^:]*):?.*').exec(host)[1];
  // Bail out for IPv4 addresses.  This function can't handle IPv6 addresses yet.
  if (new RegExp('^((\\d{1,3}\\.){3}\\d{1,3})(:\\d+)?$').exec(subdomain)) {
    return subdomain;
  }
  // Strip down to the domain.  Regexp used here is identical to
  // DOMAIN_REGEXP in Rails' ActionDispatch:
  // https://github.com/rails/rails/blob/master/actionpack/lib/action_dispatch/middleware/cookies.rb
  domain_result = new RegExp('[^.]*\.([^.]*|..\...|...\...)$').exec(subdomain);
  if (domain_result && domain_result.length > 0) {
    return "." + domain_result[0];
  }
  return subdomain;
}

SongkickAnalytics.prototype.initAnalyticsCookie = function() {
  var nowTs = Math.round(new Date().getTime() / 1000);

  // Check if we are upgrading a V1 analytics cookie. This
  // entails preserving the analytics user ID from V1 to V2 and
  // deleting the V1 cookie.
  var v1CookieName = this.getV1AnalyticsCookieName();
  var v1CookieValue = this.getCookie(v1CookieName);
  var v1AnalyticsUserId = undefined;
  if (v1CookieValue) {
    v1CookieData = this.deserializeCookie(v1CookieValue);
    v1AnalyticsUserId = v1CookieData.analyticsUserId;
    this.setCookie(v1CookieName, '', 0, '/');
  }

  var cookieName = this.getAnalyticsCookieName();
  var cookieValue = this.getCookie(cookieName);
  var cookieData = {};

  if (cookieValue) {
    cookieData = this.deserializeCookie(cookieValue);
    if (cookieData.lastVisitTs == '-') {
      cookieData.lastVisitTs = '';
    }
    else {
      cookieData.lastVisitTs = cookieData.currentTs;
      cookieData.currentTs = nowTs;
    }
  } else {
    cookieData = {
      analyticsUserId: v1AnalyticsUserId ? v1AnalyticsUserId : this.generateAnalyticsUserId(),
      creationTs: nowTs,
      currentTs: nowTs,
      lastVisitTs: ''
    }
  }

  domain = this.identifyDomain(window.location.host);
  cookieValue = this.serializeCookie(cookieData);
  this.setCookie(cookieName, cookieValue, this._cookieExpiresMs, '/', domain);
  return cookieData;
}

// Domain - generate a pseudo-unique ID to fingerprint this user;
SongkickAnalytics.prototype.generateAnalyticsUserId = function() {
  var nowMillis = new Date().getTime();
  var browserFeatures = this.getBrowserFeatures();
  uid = this.sha1(
    (navigator.userAgent || '') +
    (navigator.platform || '') +
    JSON2.stringify(browserFeatures) +
    nowMillis
  ).slice(0, 16); // 16 hexits = 64 bits
  return uid
}

/*
 * Load visitor ID cookie
 */
function loadDomainUserIdCookie() {
  var now = new Date(),
    nowTs = Math.round(now.getTime() / 1000),
    id = getCookieValue('id'),
    tmpContainer;

  if (id) {
    tmpContainer = id.split('.');
    // New visitor set to 0 now
    tmpContainer.unshift('0');
  } else {
    // Domain - generate a pseudo-unique ID to fingerprint this user;
    // Note: this isn't a RFC4122-compliant UUID
    if (!domainUserId) {
      domainUserId = hash(
        (SongkickAnalytics.navigatorAlias.userAgent || '') +
          (SongkickAnalytics.navigatorAlias.platform || '') +
          JSON2.stringify(browserFeatures) + nowTs
      ).slice(0, 16); // 16 hexits = 64 bits
    }

    tmpContainer = [
      // New visitor
      '1',
      // Domain user ID
      domainUserId,
      // Creation timestamp - seconds since Unix epoch
      nowTs,
      // visitCount - 0 = no previous visit
      0,
      // Current visit timestamp
      nowTs,
      // Last visit timestamp - blank meaning no previous visit
      ''
    ];
  }
  return tmpContainer;
}

SongkickAnalytics.prototype.getBrowserFeatures = function() {
  var i;
  var mimeType;
  var pluginMap = {
    // document types
    pdf: 'application/pdf',

    // media players
    qt: 'video/quicktime',
    realp: 'audio/x-pn-realaudio-plugin',
    wma: 'application/x-mplayer2',

    // interactive multimedia
    dir: 'application/x-director',
    fla: 'application/x-shockwave-flash',

    // RIA
    //java: 'application/x-java-vm',
    gears: 'application/x-googlegears',
    ag: 'application/x-silverlight'
  };
  var features = {};

  // General plugin detection
  if (navigator.mimeTypes && navigator.mimeTypes.length) {
    for (i in pluginMap) {
      if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
        mimeType = navigator.mimeTypes[pluginMap[i]];
        features[i] = (mimeType && mimeType.enabledPlugin) ? '1' : '0';
      }
    }
  }

  // Safari and Opera
  // IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
  if (typeof navigator.javaEnabled !== 'unknown' &&
      typeof navigator.javaEnabled !== 'undefined' &&
      navigator.javaEnabled()) {
    features.java = '1';
  }

  // Firefox
  if (typeof window.GearsFactory === 'function') {
    features.gears = '1';
  }

  // Other browser features
  features.res = screen.width + 'x' + screen.height;
  features.cd = screen.colorDepth;

  if (typeof navigator.cookieEnabled !== 'undefined') {
    features.cookie = navigator.cookieEnabled ? '1' : '0'
  } else {
    this.setCookie('test', '1')
    features.cookie = (this.getCookie('test') === '1') ? '1' : '0';
  }

  return features;
}

SongkickAnalytics.prototype.encodeUtf8 = function(s) {
  return unescape(encodeURIComponent(s));
}

SongkickAnalytics.prototype.decodeUtf8 = function(s) {
  return decodeURIComponent(escape(s));
}

SongkickAnalytics.prototype.getReferrer = function() {
  var referrer = '';
  try {
    referrer = window.top.document.referrer;
  } catch (e) {
    if (window.parent) {
      try {
        referrer = window.parent.document.referrer;
      } catch (e2) {
        referrer = '';
      }
    }
  }
  if (referrer === '') {
    referrer = document.referrer;
  }
  return referrer;
};

/*
 * Get cookie value
 */
SongkickAnalytics.prototype.getCookie = function (cookieName) {
  var cookiePattern = new RegExp('(^|;)[ ]*' + cookieName + '=([^;]*)'),
      cookieMatch = cookiePattern.exec(document.cookie);
  return cookieMatch ? decodeURIComponent(cookieMatch[2]) : 0;
};

/*
 * Set cookie value
 */
SongkickAnalytics.prototype.setCookie = function (cookieName, value, msToExpire, path, domain, secure) {
  var expiryDate;
  // relative time to expire in milliseconds
  if (msToExpire) {
    expiryDate = new Date();
    expiryDate.setTime(expiryDate.getTime() + msToExpire);
  }
  document.cookie = cookieName + '=' + encodeURIComponent(value) +
    (msToExpire ? ';expires=' + expiryDate.toGMTString() : '') +
    ';path=' + (path || '/') +
    (domain ? ';domain=' + domain : '') +
    (secure ? ';secure' : '');
};
