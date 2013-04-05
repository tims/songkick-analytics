/*!
 * SongkickAnalytics
 *
 * @description A cut down version of the SnowPlow tracker for sending analytics events, catered to Songkick's needs.
 * @version     0.11.1
 * @author      Alex Dean, Simon Andersson, Anthon Pang, Tim Sell
 * @copyright   Anthon Pang, SnowPlow Analytics Ltd, Songkick.com
 * @license     Simplified BSD
 */

/*
 * Original
 * https://github.com/snowplow/snowplow
 *
 * Songkick's version
 * https://github.com/songkick/songkick-analytics
 */

/*
 * Browser [In]Compatibility
 * - minimum required ECMAScript: ECMA-262, edition 3
 *
 * Incompatible with these (and earlier) versions of:
 * - IE4 - try..catch and for..in introduced in IE5
 * - IE5 - named anonymous functions, array.push, encodeURIComponent, decodeURIComponent, and getElementsByTagName introduced in IE5.5
 * - Firefox 1.0 and Netscape 8.x - FF1.5 adds array.indexOf, among other things
 * - Mozilla 1.7 and Netscape 6.x-7.x
 * - Netscape 4.8
 * - Opera 6 - Error object (and Presto) introduced in Opera 7
 * - Opera 7
 */
