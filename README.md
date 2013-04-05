# Songkick Analytics

This is our analytics framework. It provides a simple API for
recording user behaviour, and is designed to make it as easy as
possible to instrument everything which might be of interest when
trying to understand how people interact with all Songkick web
properties. Currently the framework does not cover non-web
applications or server side events.

This framework aims to provide an abstraction layer on top of the
underlying logging framework. For a more technical descripion of the
process see <LINK NEEDED>.

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

1. Load the JavaScript sorce from (URL). This is hosted separately to
project specific code, and may be upgraded centrally. No breaking
changes will ever be made without incrementing the version number.

2. Initialize the framework (syntax TBD).

3. Register the page load event (syntax TBD).

### Logging Additional Events

#### The Easy Way

The JavaScript library recognises a number of data attributes which
can be used to indicate that DOM events should be logged (details TBC).

#### Manually Logging Events

Alternatively, events can be manually triggered by scripts (syntax TBC
- make it possible to send multiple events at once here).

#### Tying Events To Page Load

Finally, additional events can be specified at the same time as the
page load event is recorded. (syntax TBC).

### Parameterised Events

Page level parameters are specified at the time of library
initialiation (syntax TBC).

Page level parameters will be attached to all events logged from the
page. Additional parameters can be specified when individual events
are logged, either through data attributes (details TBC), or as
arguments to the logEvent call (details TBC).

### Instrumenting Split Tests

Split test groups are derived based on the unique UID combined with
the name of the test. If this scheme is followed, it is not necessary
to record split test group membership explicitly, only the exact
period during which the test was active.  Group membership can
subsequently be reconstructed at the time of analysis.

### Page Model Support

Server-side impementation is beyond the scope of this document, so
this section should be considered as recommendations.

(details TBC)

## Roadmap

* Support for mobile applications
* Support for server-side events
* Association with releases / flipper configuration.

