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
// SkAnalytics Asynchronous Queue
var _snaq = _snaq || [];

/**
 * SkAnalytics namespace.
 * Add classes and functions in this namespace.
 */
var SkAnalytics = SkAnalytics || function() {
	var windowAlias = window;
	return {

		/* Tracker identifier with version */
		version: 'js-0.11.1', // Update banner.js too

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
		asyncTracker: null
	}
}();

