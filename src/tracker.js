/*
 * JavaScript tracker for Songkick
 * 
 * Significant portions copyright 2010 Anthon Pang. 
 * Significant portions copyright 2012-2013 SnowPlow Analytics Ltd.
 * Remainder copyright 2013 Songkick.com.
 * All rights reserved. 
 * 
 * Redistribution and use in source and binary forms, with or without 
 * modification, are permitted provided that the following conditions are 
 * met: 
 *
 * * Redistributions of source code must retain the above copyright 
 *   notice, this list of conditions and the following disclaimer. 
 *
 * * Redistributions in binary form must reproduce the above copyright 
 *   notice, this list of conditions and the following disclaimer in the 
 *   documentation and/or other materials provided with the distribution. 
 *
 * * Neither the name of Anthon Pang nor SnowPlow Analytics Ltd 
 *   nor Songkick.com nor the names of their contributors may be used to 
 *   endorse or promote products derived from this software without 
 *   specific prior written permission. 
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR 
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, 
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/*
 * Songkick Tracker class
 *
 * Takes an argmap as its sole parameter. Argmap supports:
 *
 * 1. Empty             - to initialize an Async Tracker
 * 2. {cf: 'subdomain'} - to initialize a Sync Tracker with
 *                        a CloudFront-based collector 
 * 3. {url: 'rawurl'}   - to initialize a Sync Tracker with a
 *                        URL-based collector
 *
 * See also: Tracker.setCollectorUrl() and Tracker.setCollectorCf()
 */
SkAnalytics.Tracker = function Tracker(argmap) {

	/************************************************************
	 * Private members
	 ************************************************************/

	var
/*<DEBUG>*/
		/*
		 * registered test hooks
		 */
		registeredHooks = {},
/*</DEBUG>*/

		// Current URL and Referrer URL
		locationArray = SkAnalytics.fixupUrl(SkAnalytics.documentAlias.domain, SkAnalytics.windowAlias.location.href, SkAnalytics.getReferrer()),
		domainAlias = SkAnalytics.fixupDomain(locationArray[0]),
		locationHrefAlias = locationArray[1],
		configReferrerUrl = locationArray[2],

		// Request method is always GET for SkAnalytics
		configRequestMethod = 'GET',

		// Platform is always web for this tracker
		configPlatform = 'web',

		// SkAnalytics collector URL
		configCollectorUrl = constructCollectorUrl(argmap),

		// Site ID
		configTrackerSiteId = '', // Updated for SkAnalytics

		// Document URL
		configCustomUrl,

		// Document title
		configTitle = SkAnalytics.documentAlias.title,

		// Extensions to be treated as download links
		configDownloadExtensions = '7z|aac|ar[cj]|as[fx]|avi|bin|csv|deb|dmg|doc|exe|flv|gif|gz|gzip|hqx|jar|jpe?g|js|mp(2|3|4|e?g)|mov(ie)?|ms[ip]|od[bfgpst]|og[gv]|pdf|phps|png|ppt|qtm?|ra[mr]?|rpm|sea|sit|tar|t?bz2?|tgz|torrent|txt|wav|wm[av]|wpd||xls|xml|z|zip',

		// Hosts or alias(es) to not treat as outlinks
		configHostsAlias = [domainAlias],

		// HTML anchor element classes to not track
		configIgnoreClasses = [],

		// HTML anchor element classes to treat as downloads
		configDownloadClasses = [],

		// HTML anchor element classes to treat at outlinks
		configLinkClasses = [],

		// Maximum delay to wait for web bug image to be fetched (in milliseconds)
		configTrackerPause = 500,

		// Minimum visit time after initial page view (in milliseconds)
		configMinimumVisitTime,

		// Recurring heart beat after initial ping (in milliseconds)
		configHeartBeatTimer,

		// Disallow hash tags in URL
		configDiscardHashTag,

		// First-party cookie name prefix
		configCookieNamePrefix = '_sp_',

		// First-party cookie domain
		// User agent defaults to origin hostname
		configCookieDomain,

		// First-party cookie path
		// Default is user agent defined.
		configCookiePath,

		// Do Not Track
		configDoNotTrack,

		// Count sites which are pre-rendered
		configCountPreRendered,

		// Life of the visitor cookie (in milliseconds)
		configVisitorCookieTimeout = 63072000000, // 2 years

		// Life of the session cookie (in milliseconds)
		configSessionCookieTimeout = 1800000, // 30 minutes

		// Life of the referral cookie (in milliseconds)
		configReferralCookieTimeout = 15768000000, // 6 months

		// Document character set
		documentCharset = SkAnalytics.documentAlias.characterSet || SkAnalytics.documentAlias.charset,

		// Browser language (or Windows language for IE). Imperfect but CloudFront doesn't log the Accept-Language header
		browserLanguage = SkAnalytics.navigatorAlias.userLanguage || SkAnalytics.navigatorAlias.language,

		// Browser features via client-side data collection
		browserFeatures = detectBrowserFeatures(),

		// Visitor timezone
		timezone = detectTimezone(),

		// Visitor fingerprint
		fingerprint = generateFingerprint(),

		// Guard against installing the link tracker more than once per Tracker instance
		linkTrackingInstalled = false,

		// Guard against installing the activity tracker more than once per Tracker instance
		activityTrackingInstalled = false,

		// Last activity timestamp
		lastActivityTime,

		// How are we scrolling?
		minXOffset,
		maxXOffset,
		minYOffset,
		maxYOffset,

		// Internal state of the pseudo click handler
		lastButton,
		lastTarget,

		// Hash function
		hash = SkAnalytics.sha1,

		// Domain hash value
		domainHash,

		// Domain unique user ID
		domainUserId,

		// Business-defined unique user ID
		businessUserId,

		// Ecommerce transaction data
		// Will be committed, sent and emptied by a call to trackTrans.
		ecommerceTransaction = ecommerceTransactionTemplate();

	/**
	 * Determines how to build our collector URL,
	 * based on the argmap passed into the
	 * Tracker's constructor.
	 */
	function constructCollectorUrl(argmap) {
		if (typeof argmap === "undefined") {
			return null; // JavaScript joys, changing an undefined into a null
		} else if ('cf' in argmap) {
			return collectorUrlFromCfDist(argmap.cf);
		} else if ('url' in argmap) {
			return asCollectorUrl(argmap.url);
		}
	}

	/*
	 * Initializes an empty ecommerce
	 * transaction and line items
	 */
	function ecommerceTransactionTemplate() {
		return { transaction: {}, items: [] }
	}

	/*
	 * Removes hash tag from the URL
	 *
	 * URLs are purified before being recorded in the cookie,
	 * or before being sent as GET parameters
	 */
	function purify(url) {
		var targetPattern;

		if (configDiscardHashTag) {
			targetPattern = new RegExp('#.*');
			return url.replace(targetPattern, '');
		}
		return url;
	}

	/*
	 * Extract scheme/protocol from URL
	 */
	function getProtocolScheme(url) {
		var e = new RegExp('^([a-z]+):'),
		matches = e.exec(url);

		return matches ? matches[1] : null;
	}

	/*
	 * Resolve relative reference
	 *
	 * Note: not as described in rfc3986 section 5.2
	 */
	function resolveRelativeReference(baseUrl, url) {
		var protocol = getProtocolScheme(url),
			i;

		if (protocol) {
			return url;
		}

		if (url.slice(0, 1) === '/') {
			return getProtocolScheme(baseUrl) + '://' + SkAnalytics.getHostName(baseUrl) + url;
		}

		baseUrl = purify(baseUrl);
		if ((i = baseUrl.indexOf('?')) >= 0) {
			baseUrl = baseUrl.slice(0, i);
		}
		if ((i = baseUrl.lastIndexOf('/')) !== baseUrl.length - 1) {
			baseUrl = baseUrl.slice(0, i + 1);
		}

		return baseUrl + url;
	}

	/*
	 * Is the host local? (i.e., not an outlink)
	 *
	 * This is a pretty flawed approach - assumes
	 * a website only has one domain.
	 *
	 * TODO: I think we can blow this away for
	 * SkAnalytics and handle the equivalent with a
	 * whitelist of the site's domains. 
	 * 
	 */
	function isSiteHostName(hostName) {
		var i,
			alias,
			offset;

		for (i = 0; i < configHostsAlias.length; i++) {

			alias = SkAnalytics.fixupDomain(configHostsAlias[i].toLowerCase());

			if (hostName === alias) {
				return true;
			}

			if (alias.slice(0, 1) === '.') {
				if (hostName === alias.slice(1)) {
					return true;
				}

				offset = hostName.length - alias.length;
				if ((offset > 0) && (hostName.slice(offset) === alias)) {
					return true;
				}
			}
		}
		return false;
	}

	/*
	 * Send image request to the SkAnalytics Collector using GET.
	 * The Collector serves a transparent, single pixel (1x1) GIF
	 */
	function getImage(request) {

		var image = new Image(1, 1);

		// Let's chec that we have a Url to ping
		if (configCollectorUrl === null) {
			throw "No SkAnalytics collector configured, cannot track";
		}

		// Okay? Let's proceed.
		image.onload = function () { };
		image.src = configCollectorUrl + '?' + request;
	}

	/*
	 * Send request
	 */
	function sendRequest(request, delay) {
		var now = new Date();

		if (!configDoNotTrack) {
			getImage(request);
			SkAnalytics.expireDateTime = now.getTime() + delay;
		}
	}

	/*
	 * Get cookie name with prefix and domain hash
	 */
	function getCookieName(baseName) {
		return configCookieNamePrefix + baseName + '.' + domainHash;
	}

	/*
	 * Legacy getCookieName. This is the old version inherited from
	 * Piwik which includes the site ID. Including the site ID in
	 * the user cookie doesn't make sense, so we have removed it.
	 * But, to avoid breaking sites with existing cookies, we leave
	 * this function in as a legacy, and use it to check for a
	 * 'legacy' cookie.
	 *
	 * TODO: delete in February 2013 or so!
	 */
	function getLegacyCookieName(baseName) {
		return configCookieNamePrefix + baseName + '.' + configTrackerSiteId + '.' + domainHash;
	}

	/*
	 * Cookie getter.
	 *
	 * This exists because we cannot guarantee whether a cookie will
	 * be available using getCookieName or getLegacyCookieName (i.e.
	 * whether the cookie includes the legacy site ID in its name).
	 *
	 * This wrapper supports both.
	 *
	 * TODO: simplify in February 2013 back to:
	 * return SkAnalytics.getCookie(getCookieName(cookieName));
	 */
	function getCookieValue(cookieName) {

		// First we try the new cookie
		var cookieValue = SkAnalytics.getCookie(getCookieName(cookieName));
		if (cookieValue) {
			return cookieValue;
		}

		// Last we try the legacy cookie. May still return failure.
		return SkAnalytics.getCookie(getLegacyCookieName(cookieName));
	}

	/*
	 * Does browser have cookies enabled (for this site)?
	 */
	function hasCookies() {
		var testCookieName = getCookieName('testcookie');

		if (!SkAnalytics.isDefined(SkAnalytics.navigatorAlias.cookieEnabled)) {
			SkAnalytics.setCookie(testCookieName, '1');
			return SkAnalytics.getCookie(testCookieName) === '1' ? '1' : '0';
		}

		return SkAnalytics.navigatorAlias.cookieEnabled ? '1' : '0';
	}

	/*
	 * Update domain hash
	 */
	function updateDomainHash() {
		domainHash = hash((configCookieDomain || domainAlias) + (configCookiePath || '/')).slice(0, 4); // 4 hexits = 16 bits
	}

	/*
	 * Process all "activity" events.
	 * For performance, this function must have low overhead.
	 */
	function activityHandler() {
		var now = new Date();
		lastActivityTime = now.getTime();
	}

	/*
	 * Process all "scroll" events.
	 */
	function scrollHandler() {
		updateMaxScrolls();
		activityHandler();
	}

	/*
	 * Returns [pageXOffset, pageYOffset].
	 */
	function getPageOffsets() {
		return [SkAnalytics.documentAlias.body.scrollLeft || SkAnalytics.windowAlias.pageXOffset,
		       SkAnalytics.documentAlias.body.scrollTop || SkAnalytics.windowAlias.pageYOffset];
	}

	/*
	 * Quick initialization/reset of max scroll levels
	 */
	function resetMaxScrolls() {
		var offsets = getPageOffsets();
		
		var x = offsets[0];
		minXOffset = x;
		maxXOffset = x;
		
		var y = offsets[1];
		minYOffset = y;
		maxYOffset = y;
	}

	/*
	 * Check the max scroll levels, updating as necessary
	 */
	function updateMaxScrolls() {
		var offsets = getPageOffsets();
		
		var x = offsets[0];
		if (pageXOffset < minXOffset) {
			minXOffset = pageXOffset;
		} else if (pageXOffset > maxXOffset) {
			maxXOffset = pageXOffset;
		}

		var y = offsets[1];
		if (pageYOffset < minYOffset) {
			minYOffset = pageYOffset;
		} else if (pageYOffset > maxYOffset) {
			maxYOffset = pageYOffset;
		}	
	}

	/*
	 * Sets the Visitor ID cookie: either the first time loadDomainUserIdCookie is called
	 * or when there is a new visit or a new page view
	 */
	function setDomainUserIdCookie(_domainUserId, createTs, visitCount, nowTs, lastVisitTs) {
		SkAnalytics.setCookie(getCookieName('id'), _domainUserId + '.' + createTs + '.' + visitCount + '.' + nowTs + '.' + lastVisitTs, configVisitorCookieTimeout, configCookiePath, configCookieDomain);
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
					(SkAnalytics.navigatorAlias.userAgent || '') +
						(SkAnalytics.navigatorAlias.platform || '') +
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

	/*
	 * Get the current timestamp:
	 * milliseconds since epoch.
	 */
	function getTimestamp() {
		var now = new Date(),
			nowTs = now.getTime();

		return nowTs;
	}

	/*
	 * Attaches all the common web fields to the request
	 * (resolution, url, referrer, etc.)
	 * Also sets the required cookies.
	 *
	 * Takes in a string builder, adds in parameters to it
	 * and then generates the request.
	 */
	function getRequest(sb, pluginMethod) {
		var i,
			now = new Date(),
			nowTs = Math.round(now.getTime() / 1000),
			newVisitor,
			_domainUserId, // Don't shadow the global
			visitCount,
			createTs,
			currentVisitTs,
			lastVisitTs,
			referralTs,
			referralUrl,
			referralUrlMaxLength = 1024,
			currentReferrerHostName,
			originalReferrerHostName,
			idname = getCookieName('id'),
			sesname = getCookieName('ses'), // NOT sesname
			id = loadDomainUserIdCookie(),
			ses = getCookieValue('ses'),
			currentUrl = configCustomUrl || locationHrefAlias,
			featurePrefix;

		if (configDoNotTrack) {
			SkAnalytics.setCookie(idname, '', -1, configCookiePath, configCookieDomain);
			SkAnalytics.setCookie(sesname, '', -1, configCookiePath, configCookieDomain);
			return '';
		}

		newVisitor = id[0];
		_domainUserId = id[1]; // We could use the global (domainUserId) but this is better etiquette
		createTs = id[2];
		visitCount = id[3];
		currentVisitTs = id[4];
		lastVisitTs = id[5];

		// New session
		if (!ses) {
			// New session (aka new visit)
			visitCount++;
			// Update the last visit timestamp
			lastVisitTs = currentVisitTs;
		}

		// Build out the rest of the request - first add fields we can safely skip encoding
		sb.addRaw('dtm', getTimestamp());
		sb.addRaw('tid', String(Math.random()).slice(2, 8));
		sb.addRaw('vp', detectViewport());
		sb.addRaw('ds', detectDocumentSize());
		sb.addRaw('vid', visitCount);
		sb.addRaw('uid', _domainUserId); // Set to our local variable

		// Encode all these
		sb.add('buid', businessUserId); // Business-defined user ID

		// Adds with custom conditions
		if (configReferrerUrl.length) sb.add('refr', purify(configReferrerUrl));

		// Browser features. Cookies, color depth and resolution don't get prepended with f_ (because they're not optional features)
		for (i in browserFeatures) {
			if (Object.prototype.hasOwnProperty.call(browserFeatures, i)) {
				featurePrefix = (i === 'res' || i === 'cd' || i === 'cookie') ? '' : 'f_';
				sb.addRaw(featurePrefix + i, browserFeatures[i]);
			}
		}

		// Add the page URL last as it may take us over the IE limit (and we don't always need it)
		sb.add('url', purify(SkAnalytics.windowAlias.location));
		var request = sb.build();

		// Update cookies
		setDomainUserIdCookie(_domainUserId, createTs, visitCount, nowTs, lastVisitTs);
		SkAnalytics.setCookie(sesname, '*', configSessionCookieTimeout, configCookiePath, configCookieDomain);

		return request;
	}

	/**
	 * Builds a collector URL from a CloudFront distribution.
	 * We don't bother to support custom CNAMEs because Amazon CloudFront doesn't support that for SSL.
	 *
	 * @param string account The account ID to build the tracker URL from
	 *
	 * @return string The URL on which the collector is hosted
	 */
	function collectorUrlFromCfDist(distSubdomain) {
		return asCollectorUrl(distSubdomain + '.cloudfront.net');
	}

	/**
	 * Adds the protocol in front of our collector URL, and i to the end
	 *
	 * @param string rawUrl The collector URL without protocol
	 *
	 * @return string collectorUrl The tracker URL with protocol
	 */
	function asCollectorUrl(rawUrl) {
		return ('https:' == document.location.protocol ? 'https' : 'http') + '://' + rawUrl;
	}

	/**
	 * A helper to build a SkAnalytics request string from an
	 * an optional initial value plus a set of individual
	 * name-value pairs, provided using the add method.
	 *
	 * @param string initialValue The initial querystring, ready to have additional key-value pairs added
	 *
	 * @return object The request string builder, with add, addRaw and build methods
	 */
	function requestStringBuilder(initialValue) {
		var str = initialValue || '';
		var addNvPair = function(key, value, encode) {
			if (value !== undefined && value !== '') {
				str += '&' + key + '=' + (encode ? SkAnalytics.encodeWrapper(value) : value);
			}
		};
		return {
			add: function(key, value) {
				addNvPair(key, value, true);
			},
			addRaw: function(key, value) {
				addNvPair(key, value, false);
			},
			build: function() {
				return str;
			}
		}
	}

	function serializeObject(object) {
    var props = [];
    for(var key in object) {
      props.push(encodeURIComponent(key) + "=" + encodeURIComponent(object[key]));
    }
    return props.join("&");  
  }

	/**
	 * Log a structured event happening on this page
	 *
	 * @param string category The name you supply for the group of objects you want to track
	 * @param string action A string that is uniquely paired with each category, and commonly used to define the type of user interaction for the web object
	 * @param string label (optional) An optional string to provide additional dimensions to the event data
	 * @param string property (optional) Describes the object or the action performed on it, e.g. quantity of item added to basket
	 * @param int|float|string value (optional) An integer that you can use to provide numerical data about the user event
	 */
	function logStructEvent(category, action, properties) {
		var sb = requestStringBuilder();
		sb.add('e', 'se'); // 'se' for Structured Event
		sb.add('ev_ca', category);
		sb.add('ev_ac', action)
		sb.add('ev_pr', serializeObject(properties));
		request = getRequest(sb, 'event');
		sendRequest(request, configTrackerPause);
	}

	/*
	 * Log the page view / visit
	 *
	 * @param string customTitle The user-defined page title to attach to this page view
	 */
	function logPageView(customTitle) {

		// Fixup page title. We'll pass this to logPagePing too.
		var pageTitle = SkAnalytics.fixupTitle(customTitle || configTitle);

		// Log page view
		var sb = requestStringBuilder();
		sb.add('e', 'pv'); // 'pv' for Page View
		sb.add('page', pageTitle);
		var request = getRequest(sb, 'log');
		sendRequest(request, configTrackerPause);

		// Send ping (to log that user has stayed on page)
		var now = new Date();
		if (configMinimumVisitTime && configHeartBeatTimer && !activityTrackingInstalled) {
			activityTrackingInstalled = true;

			// Capture our initial scroll points
			resetMaxScrolls();

			// Add event handlers; cross-browser compatibility here varies significantly
			// @see http://quirksmode.org/dom/events
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'click', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'mouseup', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'mousedown', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'mousemove', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'mousewheel', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'DOMMouseScroll', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'scroll', scrollHandler); // Will updateMaxScrolls() for us
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'keypress', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'keydown', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'keyup', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'resize', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'focus', activityHandler);
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'blur', activityHandler);

			// Periodic check for activity.
			lastActivityTime = now.getTime();
			setInterval(function heartBeat() {
				var now = new Date();

				// There was activity during the heart beat period;
				// on average, this is going to overstate the visitDuration by configHeartBeatTimer/2
				if ((lastActivityTime + configHeartBeatTimer) > now.getTime()) {
					// Send ping if minimum visit time has elapsed
					if (configMinimumVisitTime < now.getTime()) {
						logPagePing(pageTitle); // Grab the min/max globals
					}
				}
			}, configHeartBeatTimer);
		}
	}

	/*
	 * Log that a user is still viewing a given page
	 * by sending a page ping.
	 * Not part of the public API - only called from
	 * logPageView() above.
	 *
	 * @param string pageTitle The page title to attach to this page ping
	 */
	function logPagePing(pageTitle) {
		var sb = requestStringBuilder();
		sb.add('e', 'pp'); // 'pp' for Page Ping
		sb.add('page', pageTitle);
		sb.addRaw('pp_mix', minXOffset); // Global
		sb.addRaw('pp_max', maxXOffset); // Global
		sb.addRaw('pp_miy', minYOffset); // Global
		sb.addRaw('pp_may', maxYOffset); // Global
		resetMaxScrolls();
		var request = getRequest(sb, 'ping');
		sendRequest(request, configTrackerPause);
	}

	/*
	 * Log the link or click with the server
	 *
	 * @param string url The target URL
	 * @param string linkType The type of link - link or download (see getLinkType() for details)
	 */
	// TODO: this functionality is not yet fully implemented.
	// See https://github.com/snowplow/snowplow/issues/75
	function logLink(url, linkType) {
		var sb = requestStringBuilder();
		sb.add('e', linkType);
		sb.add('t_url', purify(url));
		var request = getRequest(sb, 'link');
		sendRequest(request, configTrackerPause);
	}

	/*
	 * Browser prefix
	 */
	function prefixPropertyName(prefix, propertyName) {
		
		if (prefix !== '') {
			return prefix + propertyName.charAt(0).toUpperCase() + propertyName.slice(1);
		}

		return propertyName;
	}

	/*
	 * Check for pre-rendered web pages, and log the page view/link
	 * according to the configuration and/or visibility
	 *
	 * @see http://dvcs.w3.org/hg/webperf/raw-file/tip/specs/PageVisibility/Overview.html
	 */
	function trackCallback(callback) {
		var isPreRendered,
			i,
			// Chrome 13, IE10, FF10
			prefixes = ['', 'webkit', 'ms', 'moz'],
			prefix;

		if (!configCountPreRendered) {
			for (i = 0; i < prefixes.length; i++) {
				prefix = prefixes[i];

				// does this browser support the page visibility API?
				if (Object.prototype.hasOwnProperty.call(SkAnalytics.documentAlias, prefixPropertyName(prefix, 'hidden'))) {
					// if pre-rendered, then defer callback until page visibility changes
					if (SkAnalytics.documentAlias[prefixPropertyName(prefix, 'visibilityState')] === 'prerender') {
						isPreRendered = true;
					}
					break;
				}
			}
		}

		if (isPreRendered) {
			// note: the event name doesn't follow the same naming convention as vendor properties
			SkAnalytics.addEventListener(SkAnalytics.documentAlias, prefix + 'visibilitychange', function ready() {
				SkAnalytics.documentAlias.removeEventListener(prefix + 'visibilitychange', ready, false);
				callback();
			});
			return;
		}

		// configCountPreRendered === true || isPreRendered === false
		callback();
	}

	/*
	 * Construct regular expression of classes
	 */
	function getClassesRegExp(configClasses, defaultClass) {
		var i,
			classesRegExp = '(^| )(piwik[_-]' + defaultClass;

		if (configClasses) {
			for (i = 0; i < configClasses.length; i++) {
				classesRegExp += '|' + configClasses[i];
			}
		}
		classesRegExp += ')( |$)';

		return new RegExp(classesRegExp);
	}

	/*
	 * Link or Download?
	 */
	// TODO: why is a download assumed to always be on the same host?
	// TODO: why return 0 if can't detect it as a link or download?
	function getLinkType(className, href, isInLink) {
		// outlinks
		if (!isInLink) {
			return 'lnk';
		}

		// does class indicate whether it is an (explicit/forced) outlink or a download?
		var downloadPattern = getClassesRegExp(configDownloadClasses, 'download'),
			linkPattern = getClassesRegExp(configLinkClasses, 'link'),

			// does file extension indicate that it is a download?
			downloadExtensionsPattern = new RegExp('\\.(' + configDownloadExtensions + ')([?&#]|$)', 'i');

		return linkPattern.test(className) ? 'lnk' : (downloadPattern.test(className) || downloadExtensionsPattern.test(href) ? 'dl' : 0);
	}

	/*
	 * Process clicks
	 */
	function processClick(sourceElement) {
		var parentElement,
			tag,
			linkType;

		while ((parentElement = sourceElement.parentNode) !== null &&
				SkAnalytics.isDefined(parentElement) && // buggy IE5.5
				((tag = sourceElement.tagName.toUpperCase()) !== 'A' && tag !== 'AREA')) {
			sourceElement = parentElement;
		}

		if (SkAnalytics.isDefined(sourceElement.href)) {
			// browsers, such as Safari, don't downcase hostname and href
			var originalSourceHostName = sourceElement.hostname || SkAnalytics.getHostName(sourceElement.href),
				sourceHostName = originalSourceHostName.toLowerCase(),
				sourceHref = sourceElement.href.replace(originalSourceHostName, sourceHostName),
				scriptProtocol = new RegExp('^(javascript|vbscript|jscript|mocha|livescript|ecmascript|mailto):', 'i');

			// Ignore script pseudo-protocol links
			if (!scriptProtocol.test(sourceHref)) {
				// Track outlinks and all downloads
				linkType = getLinkType(sourceElement.className, sourceHref, isSiteHostName(sourceHostName));
				if (linkType) {
					// decodeUrl %xx
					sourceHref = SkAnalytics.decodeUrl(sourceHref);
					logLink(sourceHref, linkType);
				}
			}
		}
	}

	/*
	 * Handle click event
	 */
	function clickHandler(evt) {
		var button,
			target;

		evt = evt || SkAnalytics.windowAlias.event;
		button = evt.which || evt.button;
		target = evt.target || evt.srcElement;

		// Using evt.type (added in IE4), we avoid defining separate handlers for mouseup and mousedown.
		if (evt.type === 'click') {
			if (target) {
				processClick(target);
			}
		} else if (evt.type === 'mousedown') {
			if ((button === 1 || button === 2) && target) {
				lastButton = button;
				lastTarget = target;
			} else {
				lastButton = lastTarget = null;
			}
		} else if (evt.type === 'mouseup') {
			if (button === lastButton && target === lastTarget) {
				processClick(target);
			}
			lastButton = lastTarget = null;
		}
	}

	/*
	 * Add click listener to a DOM element
	 */
	function addClickListener(element, enable) {
		if (enable) {
			// for simplicity and performance, we ignore drag events
			SkAnalytics.addEventListener(element, 'mouseup', clickHandler, false);
			SkAnalytics.addEventListener(element, 'mousedown', clickHandler, false);
		} else {
			SkAnalytics.addEventListener(element, 'click', clickHandler, false);
		}
	}

	/*
	 * Add click handlers to anchor and AREA elements, except those to be ignored
	 */
	function addClickListeners(enable) {
		if (!linkTrackingInstalled) {
			linkTrackingInstalled = true;

			// iterate through anchor elements with href and AREA elements

			var i,
				ignorePattern = getClassesRegExp(configIgnoreClasses, 'ignore'),
				linkElements = SkAnalytics.documentAlias.links;

			if (linkElements) {
				for (i = 0; i < linkElements.length; i++) {
					if (!ignorePattern.test(linkElements[i].className)) {
						addClickListener(linkElements[i], enable);
					}
				}
			}
		}
	}

	/*
	 * JS Implementation for browser fingerprint.
	 * Does not require any external resources.
	 * Based on https://github.com/carlo/jquery-browser-fingerprint
	 * @return {number} 32-bit positive integer hash 
	 */
	// TODO: make seed for hashing configurable
	function generateFingerprint() {

	    var fingerprint = [
	        navigator.userAgent,
	        [ screen.height, screen.width, screen.colorDepth ].join("x"),
	        ( new Date() ).getTimezoneOffset(),
	        !!window.sessionStorage,
	        !!window.localStorage,
	    ];

	    var plugins = [];
	    if (navigator.plugins)
	    {
	        for(var i = 0; i < navigator.plugins.length; i++)
	        {
	            var mt = [];
	            for(var j = 0; j < navigator.plugins[i].length; j++)
	            {
	                mt.push([navigator.plugins[i][j].type, navigator.plugins[i][j].suffixes]);
	            }
	            plugins.push([navigator.plugins[i].name + "::" + navigator.plugins[i].description, mt.join("~")]);
	        }
	    }
	    return SkAnalytics.murmurhash3_32_gc(fingerprint.join("###") + "###" + plugins.sort().join(";"), 123412414);
	}

	/*
	 * Returns visitor timezone
	 */
	function detectTimezone() {
		var tz = jstz.determine();  
        	return (typeof (tz) === 'undefined') ? '' : tz.name();
	}

	/**
	 * Gets the current viewport.
	 *
	 * Code based on:
	 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
	 * - http://responsejs.com/labs/dimensions/
	 */
	function detectViewport() {
		var e = SkAnalytics.windowAlias, a = 'inner';
		if (!('innerWidth' in SkAnalytics.windowAlias)) {
			a = 'client';
			e = SkAnalytics.documentAlias.documentElement || SkAnalytics.documentAlias.body;
		}
		return e[a+'Width'] + 'x' + e[a+'Height'];
	}

	/**
	 * Gets the dimensions of the current
	 * document.
	 *
	 * Code based on:
	 * - http://andylangton.co.uk/articles/javascript/get-viewport-size-javascript/
	 */
	function detectDocumentSize() {
		var de = SkAnalytics.documentAlias.documentElement; // Alias
		var w = Math.max(de.clientWidth, de.offsetWidth, de.scrollWidth);
		var h = Math.max(de.clientHeight, de.offsetHeight, de.scrollHeight);
		return w + 'x' + h;
	}

	/*
	 * Returns browser features (plugins, resolution, cookies)
	 */
	function detectBrowserFeatures() {
		var i,
			mimeType,
			pluginMap = {
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
				java: 'application/x-java-vm',
				gears: 'application/x-googlegears',
				ag: 'application/x-silverlight'
			},
			features = {};

		// General plugin detection
		if (SkAnalytics.navigatorAlias.mimeTypes && SkAnalytics.navigatorAlias.mimeTypes.length) {
			for (i in pluginMap) {
				if (Object.prototype.hasOwnProperty.call(pluginMap, i)) {
					mimeType = SkAnalytics.navigatorAlias.mimeTypes[pluginMap[i]];
					features[i] = (mimeType && mimeType.enabledPlugin) ? '1' : '0';
				}
			}
		}

		// Safari and Opera
		// IE6/IE7 navigator.javaEnabled can't be aliased, so test directly
		if (typeof navigator.javaEnabled !== 'unknown' &&
				SkAnalytics.isDefined(SkAnalytics.navigatorAlias.javaEnabled) &&
				SkAnalytics.navigatorAlias.javaEnabled()) {
			features.java = '1';
		}

		// Firefox
		if (SkAnalytics.isFunction(SkAnalytics.windowAlias.GearsFactory)) {
			features.gears = '1';
		}

		// Other browser features
		features.res = SkAnalytics.screenAlias.width + 'x' + SkAnalytics.screenAlias.height;
		features.cd = screen.colorDepth;
		features.cookie = hasCookies();

		return features;
	}

/*<DEBUG>*/
	/*
	 * Register a test hook. Using eval() permits access to otherwise
	 * privileged members.
	 */
	function registerHook(hookName, userHook) {
		var hookObj = null;

		if (SkAnalytics.isString(hookName) && !SkAnalytics.isDefined(registeredHooks[hookName]) && userHook) {
			if (SkAnalytics.isObject(userHook)) {
				hookObj = userHook;
			} else if (SkAnalytics.isString(userHook)) {
				try {
					eval('hookObj =' + userHook);
				} catch (e) { }
			}

			registeredHooks[hookName] = hookObj;
		}
		return hookObj;
	}
/*</DEBUG>*/

	/************************************************************
	 * Constructor
	 ************************************************************/

	/*
	 * Initialize tracker
	 */
	updateDomainHash();

/*<DEBUG>*/
	/*
	 * initialize test plugin
	 */
	SkAnalytics.executePluginMethod('run', registerHook);
/*</DEBUG>*/

	/************************************************************
	 * Public data and methods
	 ************************************************************/

	return {
/*<DEBUG>*/
		/*
		 * Test hook accessors
		 */
		hook: registeredHooks,
		getHook: function (hookName) {
			return registeredHooks[hookName];
		},
/*</DEBUG>*/

		/**
		 * Get the current user ID (as set previously
		 * with setUserId()).
		 *
		 * @return string Business-defined user ID
		 */
		getUserId: function () {
			return businessUserId;
		},

		/**
		 * Get visitor ID (from first party cookie)
		 *
		 * @return string Visitor ID in hexits (or null, if not yet known)
		 */
		getDomainUserId: function () {
			return (loadDomainUserIdCookie())[1];
		},

		/**
		 * Get the visitor information (from first party cookie)
		 *
		 * @return array
		 */
		getDomainUserInfo: function () {
			return loadDomainUserIdCookie();
		},

		/**
		 * Get visitor ID (from first party cookie)
		 *
		 * DEPRECATED: use getDomainUserId() above.
		 *
		 * @return string Visitor ID in hexits (or null, if not yet known)
		 */
		getVisitorId: function () {
			if (typeof console !== 'undefined') {
				console.log("SkAnalytics: getVisitorId() is deprecated and will be removed in an upcoming version. Please use getDomainUserId() instead.");
			}
			return (loadVisitorIdCookie())[1];
		},

		/**
		 * Get the visitor information (from first party cookie)
		 *
		 * DEPRECATED: use getDomainUserInfo() above.
		 *
		 * @return array
		 */
		getVisitorInfo: function () {
			if (typeof console !== 'undefined') {
				console.log("SkAnalytics: getVisitorInfo() is deprecated and will be removed in an upcoming version. Please use getDomainUserInfo() instead.");
			}
			return loadVisitorIdCookie();
		},

		/**
		 * Specify the site ID
		 *
		 * DEPRECATED: use setAppId() below
		 *
		 * @param int|string siteId
		 */
		setSiteId: function (siteId) {
			if (typeof console !== 'undefined') {
				console.log("SkAnalytics: setSiteId() is deprecated and will be removed in an upcoming version. Please use setAppId() instead.");
			}
			configTrackerSiteId = siteId;
		},

		/**
		 * Specify the app ID
		 *
		 * @param int|string appId
		 */
		setAppId: function (appId) {
			configTrackerSiteId = appId;
		},

		/**
		 * Set delay for link tracking (in milliseconds)
		 *
		 * @param int delay
		 */
		setLinkTrackingTimer: function (delay) {
			configTrackerPause = delay;
		},

		/**
		 * Set list of file extensions to be recognized as downloads
		 *
		 * @param string extensions
		 */
		setDownloadExtensions: function (extensions) {
			configDownloadExtensions = extensions;
		},

		/**
		 * Specify additional file extensions to be recognized as downloads
		 *
		 * @param string extensions
		 */
		addDownloadExtensions: function (extensions) {
			configDownloadExtensions += '|' + extensions;
		},

		/**
		 * Set array of domains to be treated as local
		 *
		 * @param string|array hostsAlias
		 */
		setDomains: function (hostsAlias) {
			configHostsAlias = SkAnalytics.isString(hostsAlias) ? [hostsAlias] : hostsAlias;
			configHostsAlias.push(domainAlias);
		},

		/**
		 * Set array of classes to be ignored if present in link
		 *
		 * @param string|array ignoreClasses
		 */
		setIgnoreClasses: function (ignoreClasses) {
			configIgnoreClasses = SkAnalytics.isString(ignoreClasses) ? [ignoreClasses] : ignoreClasses;
		},

		/**
		 * Override referrer
		 *
		 * @param string url
		 */
		setReferrerUrl: function (url) {
			configReferrerUrl = url;
		},

		/**
		 * Override url
		 *
		 * @param string url
		 */
		setCustomUrl: function (url) {
			configCustomUrl = resolveRelativeReference(locationHrefAlias, url);
		},

		/**
		 * Override document.title
		 *
		 * @param string title
		 */
		setDocumentTitle: function (title) {
			configTitle = title;
		},

		/**
		 * Set array of classes to be treated as downloads
		 *
		 * @param string|array downloadClasses
		 */
		setDownloadClasses: function (downloadClasses) {
			configDownloadClasses = SkAnalytics.isString(downloadClasses) ? [downloadClasses] : downloadClasses;
		},

		/**
		 * Set array of classes to be treated as outlinks
		 *
		 * @param string|array linkClasses
		 */
		setLinkClasses: function (linkClasses) {
			configLinkClasses = SkAnalytics.isString(linkClasses) ? [linkClasses] : linkClasses;
		},

		/**
		 * Strip hash tag (or anchor) from URL
		 *
		 * @param bool enableFilter
		 */
		discardHashTag: function (enableFilter) {
			configDiscardHashTag = enableFilter;
		},

		/**
		 * Set first-party cookie name prefix
		 *
		 * @param string cookieNamePrefix
		 */
		setCookieNamePrefix: function (cookieNamePrefix) {
			configCookieNamePrefix = cookieNamePrefix;
		},

		/**
		 * Set first-party cookie domain
		 *
		 * @param string domain
		 */
		setCookieDomain: function (domain) {

			configCookieDomain = SkAnalytics.fixupDomain(domain);
			updateDomainHash();
		},

		/**
		 * Set first-party cookie path
		 *
		 * @param string domain
		 */
		setCookiePath: function (path) {
			configCookiePath = path;
			updateDomainHash();
		},

		/**
		 * Set visitor cookie timeout (in seconds)
		 *
		 * @param int timeout
		 */
		setVisitorCookieTimeout: function (timeout) {
			configVisitorCookieTimeout = timeout * 1000;
		},

		/**
		 * Set session cookie timeout (in seconds)
		 *
		 * @param int timeout
		 */
		setSessionCookieTimeout: function (timeout) {
			configSessionCookieTimeout = timeout * 1000;
		},

		/**
		 * Set referral cookie timeout (in seconds)
		 *
		 * @param int timeout
		 */
		setReferralCookieTimeout: function (timeout) {
			configReferralCookieTimeout = timeout * 1000;
		},

		/**
		 * Handle do-not-track requests
		 *
		 * @param bool enable If true, don't track if user agent sends 'do-not-track' header
		 */
		setDoNotTrack: function (enable) {
			var dnt = SkAnalytics.navigatorAlias.doNotTrack || SkAnalytics.navigatorAlias.msDoNotTrack;

			configDoNotTrack = enable && (dnt === 'yes' || dnt === '1');
		},

		/**
		 * Add click listener to a specific link element.
		 * When clicked, Piwik will log the click automatically.
		 *
		 * @param DOMElement element
		 * @param bool enable If true, use pseudo click-handler (mousedown+mouseup)
		 */
		addListener: function (element, enable) {
			addClickListener(element, enable);
		},

		/**
		 * Install link tracker
		 *
		 * The default behaviour is to use actual click events. However, some browsers
		 * (e.g., Firefox, Opera, and Konqueror) don't generate click events for the middle mouse button.
		 *
		 * To capture more "clicks", the pseudo click-handler uses mousedown + mouseup events.
		 * This is not industry standard and is vulnerable to false positives (e.g., drag events).
		 *
		 * There is a Safari/Chrome/Webkit bug that prevents tracking requests from being sent
		 * by either click handler.  The workaround is to set a target attribute (which can't
		 * be "_self", "_top", or "_parent").
		 *
		 * @see https://bugs.webkit.org/show_bug.cgi?id=54783
		 *
		 * @param bool enable If true, use pseudo click-handler (mousedown+mouseup)
		 */
		enableLinkTracking: function (enable) {
			if (SkAnalytics.hasLoaded) {
				// the load event has already fired, add the click listeners now
				addClickListeners(enable);
			} else {
				// defer until page has loaded
				SkAnalytics.registeredOnLoadHandlers.push(function () {
					addClickListeners(enable);
				});
			}
		},

		/**
		 * Enables page activity tracking (sends page
		 * pings to the Collector regularly).
		 *
		 * @param int minimumVisitLength Seconds to wait before sending first page ping
		 * @param int heartBeatDelay Seconds to wait between pings
		 */
		enableActivityTracking: function (minimumVisitLength, heartBeatDelay) {
			
			var now = new Date();

			configMinimumVisitTime = now.getTime() + minimumVisitLength * 1000;
			configHeartBeatTimer = heartBeatDelay * 1000;
		},

		/**
		 * Frame buster
		 */
		killFrame: function () {
			if (SkAnalytics.windowAlias.location !== SkAnalytics.windowAlias.top.location) {
				SkAnalytics.windowAlias.top.location = SkAnalytics.windowAlias.location;
			}
		},

		/**
		 * Redirect if browsing offline (aka file: buster)
		 *
		 * @param string url Redirect to this URL
		 */
		redirectFile: function (url) {
			if (SkAnalytics.windowAlias.location.protocol === 'file:') {
				SkAnalytics.windowAlias.location = url;
			}
		},

		/**
		 * Count sites in pre-rendered state
		 *
		 * @param bool enable If true, track when in pre-rendered state
		 */
		setCountPreRendered: function (enable) {
			configCountPreRendered = enable;
		},

		/**
		 * Manually log a click from your own code
		 *
		 * @param string sourceUrl
		 * @param string linkType
		 */
		// TODO: break this into trackLink(destUrl) and trackDownload(destUrl)
		trackLink: function (sourceUrl, linkType) {
			trackCallback(function () {
				logLink(sourceUrl, linkType);
			});
		},

		/**
		 * Log visit to this page
		 *
		 * @param string customTitle
		 */
		trackPageView: function (customTitle) {
			trackCallback(function () {
				logPageView(customTitle);
			});
		},

		/**
		 * Set the business-defined user ID for this user.
		 *
		 * @param string userId The business-defined user ID
		 */
		setUserId: function(userId) {
			businessUserId = userId;
		},

		/**
		 * Configure this tracker to log to a CloudFront collector. 
		 *
		 * @param string distSubdomain The subdomain on your CloudFront collector's distribution
		 */
		setCollectorCf: function (distSubdomain) {
			configCollectorUrl = collectorUrlFromCfDist(distSubdomain);
		},

		/**
		 *
		 * Specify the SkAnalytics collector URL. No need to include HTTP
		 * or HTTPS - we will add this.
		 * 
		 * @param string rawUrl The collector URL minus protocol
		 */
		setCollectorUrl: function (rawUrl) {
			configCollectorUrl = asCollectorUrl(rawUrl);
		},

		/**
		 * Track an event happening on this page
		 *
		 * @param string category The name you supply for the group of objects you want to track
		 * @param string action A string that is uniquely paired with each category, and commonly used to define the type of user interaction for the web object
		 * @param string properties (optional) Object for aditional information, eg application data like application user id, test group.
		 */
		logEvent: function (category, action, properties) {
			logStructEvent(category, action, properties);
		},

		/**
		 * Track an event happening on this page
		 *
		 * @param string category The name you supply for the group of objects you want to track
		 * @param string action A string that is uniquely paired with each category, and commonly used to define the type of user interaction for the web object
		 * @param string properties (optional) Object for aditional information, eg application data like application user id, test group.
		 */
		logEventObject: function (eventObject) {
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
			logStructEvent(category, action, properties);
		},
	}
}
