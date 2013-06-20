# Songkick Analytics

## Intro

This is our analytics framework. It provides a simple API for
recording user behaviour, and is designed to make it as easy as
possible to instrument everything which might be of interest when
trying to understand how people interact with all Songkick web
properties. Currently the framework does not cover non-web
applications or server side events.

## Deployment

To deploy a new version, increment the version number in the Rakefile and

    bundle exec rake default deploy

Then for each project which uses songkick-analytics be sure to increment
the version fetched.

## The Analytics Domain Model

The core object is the Event. Each Event belongs to a category, which
covers page load events, interactions with the page and application
specific items (e.g. successful completion of a purchase).

Events should have semantic interpretations, and it's encouraged to
send multiple events from the same interaction, for example it's a
good idea to record the successful completion of a purchase separately
to the event corresponding to loading the purchase confirmation page,
as this allows for URLs to change in the future.

Events have an arbitrary set of parameters associated with
them. (TODO: More detail on how to use parameters - need to make sure
we've got this right first.)

## Using The Framework

### Basic Use

Typlically all pages will implement at least the following:

Load the JavaScript source from (URL). This is hosted separately to
project specific code, and may be upgraded centrally. No breaking
changes will ever be made without incrementing the version number.

    <script type="text/javascript" src="//d20omhqjbcr74g.cloudfront.net/javascripts/songkick-analytics.0.2.1.min.js"></script>

Initialize the framework.

    <script type="text/javascript">
      var page_properties = {user_id: 12345}
      var songkickAnalytics = new SongkickAnalytics("//localhost:8000/pixel.png", page_properties);
      songkickAnalytics.init()
    </script>

Send the page load event

    var category = "page";
    var action = "load";
    var properties = {something: 1234};
    songkickAnalytics.logEvent(category, action, properties);

### Logging Additional Events

#### The Easy Way

The JavaScript library recognises a number of data attributes which
can be used to indicate that DOM events should be logged.

To log onClick events:

    <button class="analytics-click" data-analytics-category="click" data-analytics-action="example1" data-analytics-item-id="123">Click this and we'll send an analytics event</button>

This will send `category="click"` `action="example1"` and `properties={itemId:"123"}`

To log onChange events:

    <select class="analytics-change" data-analytics-category="change" data-analytics-action="example2" data-analytics-test="123">
      <option value="A">Option A</option>
      <option value="B">Option B</option>
    </select>

If the selector is changed to option A, this will send `category="change"` `action="example2"` and `properties={selected:"A", test:"123"}`.

#### Manually Logging Events

    var category = "topic";
    var action = "thing";
    var properties = {};
    songkickAnalytics.logEvent(category, action, properties);

#### Tying Events To Page Load

Any properties set when creating the songkick analytics object will be added to every event sent.

    var page_properties = {user_id: 12345}
    var songkickAnalytics = new SongkickAnalytics("//localhost:8000/pixel.png", page_properties);

### Instrumenting Split Tests

(TBC)

Split test groups are derived based on the unique UID combined with
the name of the test. If this scheme is followed, it is not necessary
to record split test group membership explicitly, only the exact
period during which the test was active.  Group membership can
subsequently be reconstructed at the time of analysis.

## Roadmap

* Support for mobile applications
* Support for server-side events
* Association with releases / flipper configuration.
