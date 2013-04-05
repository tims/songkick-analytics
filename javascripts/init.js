/**
 * SkAnalytics namespace.
 * Add classes and functions in this namespace.
 */
 /*jslink browser */
var SkAnalytics = SkAnalytics || (function () {
	var windowAlias = window;
	return {

		/* Tracker identifier with version */
		version: '0.0.1', // Update banner.js too

		expireDateTime: null,

		/* Plugins */
		plugins: {},

		/* DOM Ready */
		hasLoaded: false,
		registeredOnLoadHandlers: [],

		/* Alias frequently used globals for added minification */
		documentAlias: document,
		windowAlias: windowAlias,
		navigatorAlias: navigator,
		screenAlias: screen,

		/* Encode */
		encodeWrapper: windowAlias.encodeURIComponent,

		/* Decode */
		decodeWrapper: windowAlias.decodeURIComponent,

		/* decodeUrl */
		decodeUrl: unescape,

		/* Asynchronous tracker */
		asyncTracker: null,

		/* Asynchronous tracker event queue */
		asyncQueue: null
	};
}());

