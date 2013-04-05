/*global SkAnalytics */

/*
 * Is property defined?
 */
SkAnalytics.isDefined = function (property) {
	return typeof property !== 'undefined';
};

/*
 * Is property a function?
 */
SkAnalytics.isFunction = function (property) {
	return typeof property === 'function';
};

/*
 * Is property an object?
 *
 * @return bool Returns true if property is null, an Object, or subclass of Object (i.e., an instanceof String, Date, etc.)
 */
SkAnalytics.isObject = function (property) {
	return typeof property === 'object';
};

/*
 * Is property a string?
 */
SkAnalytics.isString = function (property) {
	return typeof property === 'string' || property instanceof String;
};

/*
 * UTF-8 encoding
 */
SkAnalytics.encodeUtf8 = function (argString) {
	return SkAnalytics.decodeUrl(SkAnalytics.encodeWrapper(argString));
};

/**
 * Cleans up the page title
 */
SkAnalytics.fixupTitle = function (title) {
	if (!SkAnalytics.isString(title)) {
		title = title.text || '';

		var tmp = SkAnalytics.documentAlias.getElementsByTagName('title');
		if (tmp && SkAnalytics.isDefined(tmp[0])) {
			title = tmp[0].text;
		}
	}
	return title;
};

/*
 * Extract hostname from URL
 */
SkAnalytics.getHostName = function (url) {
	// scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
	var e = new RegExp('^(?:(?:https?|ftp):)/*(?:[^@]+@)?([^:/#]+)'),
		matches = e.exec(url);

	return matches ? matches[1] : url;
};

/*
 * Fix-up URL when page rendered from search engine cache or translated page.
 * TODO: it would be nice to generalise this and/or move into the ETL phase.
 */
SkAnalytics.fixupUrl = function (hostName, href, referrer) {
	/*
	 * Extract parameter from URL
	 */
	function getParameter(url, name) {
		// scheme : // [username [: password] @] hostname [: port] [/ [path] [? query] [# fragment]]
		var e = new RegExp('^(?:https?|ftp)(?::/*(?:[^?]+)[?])([^#]+)'),
			matches = e.exec(url),
			f = new RegExp('(?:^|&)' + name + '=([^&]*)'),
			result = matches ? f.exec(matches[1]) : 0;

		return result ? SkAnalytics.decodeWrapper(result[1]) : '';
	}

	if (hostName === 'translate.googleusercontent.com') {		// Google
		if (referrer === '') {
			referrer = href;
		}
		href = getParameter(href, 'u');
		hostName = SkAnalytics.getHostName(href);
	} else if (hostName === 'cc.bingj.com' ||					// Bing
			hostName === 'webcache.googleusercontent.com' ||	// Google
			hostName.slice(0, 5) === '74.6.') {					// Yahoo (via Inktomi 74.6.0.0/16)
		href = SkAnalytics.documentAlias.links[0].href;
		hostName = SkAnalytics.getHostName(href);
	}
	return [hostName, href, referrer];
};

/*
 * Fix-up domain
 */
SkAnalytics.fixupDomain = function (domain) {
	var dl = domain.length;
	dl -= 1;
	// remove trailing '.'
	if (domain.charAt(dl) === '.') {
		domain = domain.slice(0, dl);
	}
	// remove leading '*'
	if (domain.slice(0, 2) === '*.') {
		domain = domain.slice(1);
	}
	return domain;
};

/*
 * Get page referrer
 */
SkAnalytics.getReferrer = function () {
	var referrer = '';

	try {
		referrer = SkAnalytics.windowAlias.top.document.referrer;
	} catch (e) {
		if (SkAnalytics.windowAlias.parent) {
			try {
				referrer = SkAnalytics.windowAlias.parent.document.referrer;
			} catch (e2) {
				referrer = '';
			}
		}
	}
	if (referrer === '') {
		referrer = SkAnalytics.documentAlias.referrer;
	}

	return referrer;
};

/*
 * Cross-browser helper function to add event handler
 */
SkAnalytics.addEventListener = function (element, eventType, eventHandler, useCapture) {
	if (element.addEventListener) {
		element.addEventListener(eventType, eventHandler, useCapture);
		return true;
	}
	if (element.attachEvent) {
		return element.attachEvent('on' + eventType, eventHandler);
	}
	element['on' + eventType] = eventHandler;
};

/*
 * Get cookie value
 */
SkAnalytics.getCookie = function (cookieName) {
	var cookiePattern = new RegExp('(^|;)[ ]*' + cookieName + '=([^;]*)'),
			cookieMatch = cookiePattern.exec(SkAnalytics.documentAlias.cookie);

	return cookieMatch ? SkAnalytics.decodeWrapper(cookieMatch[2]) : 0;
};

/*
 * Set cookie value
 */
SkAnalytics.setCookie = function (cookieName, value, msToExpire, path, domain, secure) {
	var expiryDate;

	// relative time to expire in milliseconds
	if (msToExpire) {
		expiryDate = new Date();
		expiryDate.setTime(expiryDate.getTime() + msToExpire);
	}

	SkAnalytics.documentAlias.cookie = cookieName + '=' + SkAnalytics.encodeWrapper(value) +
		(msToExpire ? ';expires=' + expiryDate.toGMTString() : '') +
		';path=' + (path || '/') +
		(domain ? ';domain=' + domain : '') +
		(secure ? ';secure' : '');
};

/*
 * Call plugin hook methods
 */
SkAnalytics.executePluginMethod = function (methodName, callback) {
	var result = '',
			i,
			pluginMethod;

	for (i in SkAnalytics.plugins) {
		if (Object.prototype.hasOwnProperty.call(SkAnalytics.plugins, i)) {
			pluginMethod = SkAnalytics.plugins[i][methodName];
			if (SkAnalytics.isFunction(pluginMethod)) {
				result += pluginMethod(callback);
			}
		}
	}

	return result;
};

