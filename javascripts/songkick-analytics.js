//= require banner.js
//= require init.js
//= require lib/json.js
//= require lib/jstz.js
//= require helpers.js
//= require lib/sha1.js
//= require lib/murmur.js
//= require tracker.js

/*jslint browser:true, plusplus:true, vars:true, nomen:true, evil:true */
/*global window */
/*global unescape */
/*global ActiveXObject */
/*members encodeURIComponent, decodeURIComponent, getElementsByTagName,
	shift, unshift,
	addEventListener, attachEvent, removeEventListener, detachEvent,
	cookie, domain, readyState, documentElement, doScroll, title, text,
	location, top, document, referrer, parent, links, href, protocol, GearsFactory,
	event, which, button, srcElement, type, target,
	parentNode, tagName, hostname, className,
	userAgent, cookieEnabled, platform, mimeTypes, enabledPlugin, javaEnabled,
	XDomainRequest, XMLHttpRequest, ActiveXObject, open, setRequestHeader, onreadystatechange, setRequestHeader, send, readyState, status,
	getTime, getTimeAlias, setTime, toGMTString, getHours, getMinutes, getSeconds,
	toLowerCase, charAt, indexOf, lastIndexOf, split, slice, toUpperCase,
	onload, src,
	round, random,
	exec,
	res, width, height,
	pdf, qt, realp, wma, dir, fla, java, gears, ag,
	hook, getHook, getVisitorId, getVisitorInfo,
	setCollectorCf, setCollectorUrl, setSiteId, setAppId,
	setDownloadExtensions, addDownloadExtensions,
	setDomains, setIgnoreClasses, setRequestMethod,
	setReferrerUrl, setCustomUrl, setDocumentTitle,
	setDownloadClasses, setLinkClasses,
	discardHashTag,
	setCookieNamePrefix, setCookieDomain, setCookiePath, setVisitorIdCookie,
	setVisitorCookieTimeout, setSessionCookieTimeout, setReferralCookieTimeout,
	doNotTrack, setDoNotTrack, msDoNotTrack, getTimestamp, getCookieValue,
	detectTimezone, detectViewport,
	addListener, enableLinkTracking, enableActivityTracking, setLinkTrackingTimer,
	enableDarkSocialTracking,
	killFrame, redirectFile, setCountPreRendered,
	trackEvent, trackLink, trackPageView, trackImpression,
	addPlugin, getAsyncTracker
*/

SkAnalytics.build = function () {
		"use strict";

		/************************************************************
		 * Private methods
		 ************************************************************/

		/*
		 * apply wrapper
		 *
		 * @param array parameterArray An array comprising either:
		 *      [ 'methodName', optional_parameters ]
		 * or:
		 *      [ functionObject, optional_parameters ]
		 */
		function apply() {
			var i, f, parameterArray;

			for (i = 0; i < arguments.length; i += 1) {
				parameterArray = arguments[i];
				f = parameterArray.shift();

				if (SkAnalytics.isString(f)) {
					SkAnalytics.asyncTracker[f].apply(SkAnalytics.asyncTracker, parameterArray);
				} else {
					f.apply(SkAnalytics.asyncTracker, parameterArray);
				}
			}
		}

		/*
		 * Handle beforeunload event
		 *
		 * Subject to Safari's "Runaway JavaScript Timer" and
		 * Chrome V8 extension that terminates JS that exhibits
		 * "slow unload", i.e., calling getTime() > 1000 times
		 */
		function beforeUnloadHandler() {
			var now;

			SkAnalytics.executePluginMethod('unload');

			/*
			 * Delay/pause (blocks UI)
			 */
			if (SkAnalytics.expireDateTime) {
				// the things we do for backwards compatibility...
				// in ECMA-262 5th ed., we could simply use:
				//     while (Date.now() < SkAnalytics.expireDateTime) { }
				do {
					now = new Date();
				} while (now.getTimeAlias() < SkAnalytics.expireDateTime);
			}
		}

		/*
		 * Handler for onload event
		 */
		function loadHandler() {
			var i;

			if (!SkAnalytics.hasLoaded) {
				SkAnalytics.hasLoaded = true;
				SkAnalytics.executePluginMethod('load');
				for (i = 0; i < SkAnalytics.registeredOnLoadHandlers.length; i++) {
					SkAnalytics.registeredOnLoadHandlers[i]();
				}
			}
			return true;
		}

		/*
		 * Add onload or DOM ready handler
		 */
		function addReadyListener() {
			var _timer;

			if (SkAnalytics.documentAlias.addEventListener) {
				SkAnalytics.addEventListener(SkAnalytics.documentAlias, 'DOMContentLoaded', function ready() {
					SkAnalytics.documentAlias.removeEventListener('DOMContentLoaded', ready, false);
					loadHandler();
				});
			} else if (SkAnalytics.documentAlias.attachEvent) {
				SkAnalytics.documentAlias.attachEvent('onreadystatechange', function ready() {
					if (SkAnalytics.documentAlias.readyState === 'complete') {
						SkAnalytics.documentAlias.detachEvent('onreadystatechange', ready);
						loadHandler();
					}
				});

				if (SkAnalytics.documentAlias.documentElement.doScroll && SkAnalytics.windowAlias === SkAnalytics.windowAlias.top) {
					(function ready() {
						if (!SkAnalytics.hasLoaded) {
							try {
								SkAnalytics.documentAlias.documentElement.doScroll('left');
							} catch (error) {
								setTimeout(ready, 0);
								return;
							}
							loadHandler();
						}
					}());
				}
			}

			// sniff for older WebKit versions
			if ((new RegExp('WebKit')).test(SkAnalytics.navigatorAlias.userAgent)) {
				_timer = setInterval(function () {
					if (SkAnalytics.hasLoaded || /loaded|complete/.test(SkAnalytics.documentAlias.readyState)) {
						clearInterval(_timer);
						loadHandler();
					}
				}, 10);
			}

			// fallback
			SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'load', loadHandler, false);
		}


		/************************************************************
		 * Proxy object
		 * - this allows the caller to continue push()'ing to SkAnalytics.asyncQueue
		 *   after the Tracker has been initialized and loaded
		 ************************************************************/

		function TrackerProxy() {
			return {
				push: apply
			};
		}

		/************************************************************
		 * Constructor
		 ************************************************************/

		// initialize the SkAnalytics singleton
		SkAnalytics.addEventListener(SkAnalytics.windowAlias, 'beforeunload', beforeUnloadHandler, false);
		addReadyListener();

		Date.prototype.getTimeAlias = Date.prototype.getTime;

		SkAnalytics.asyncTracker = new SkAnalytics.Tracker();

		for (var i = 0; i < SkAnalytics.asyncQueue.length; i++) {
			apply(SkAnalytics.asyncQueue[i]);
		}

		// replace initialization array with proxy object
		SkAnalytics.asyncQueue = new TrackerProxy();


		/************************************************************
		 * Public data and methods
		 ************************************************************/

	return {
		/**
		* Add plugin
		*
		* @param string pluginName
		* @param Object pluginObj
		*/
		addPlugin: function (pluginName, pluginObj) {
			SkAnalytics.plugins[pluginName] = pluginObj;
		},

		/**
		* Returns a Tracker object, configured with a
		* CloudFront collector.
		*
		* @param string distSubdomain The subdomain on your CloudFront collector's distribution
		*/
		getTrackerCf: function (distSubdomain) {
			return new SkAnalytics.Tracker({cf: distSubdomain});
		},

		/**
		* Returns a Tracker object, configured with the
		* URL to the collector to use.
		*
		* @param string rawUrl The collector URL minus protocol
		*/
		getTrackerUrl: function (rawUrl) {
			return new SkAnalytics.Tracker({url: rawUrl});
		},

		/**
		* Get internal asynchronous tracker object
		*
		* @return Tracker
		*/
		getAsyncTracker: function () {
			return SkAnalytics.asyncTracker;
		}
	};
};

(function() {
	var skAnalytics = SkAnalytics.build();
	for (prop in skAnalytics) {
		if (skAnalytics.hasOwnProperty(prop)) {
			if (SkAnalytics[prop] === undefined) {
				SkAnalytics[prop] = skAnalytics[prop];
			}
		}
	}
}());


