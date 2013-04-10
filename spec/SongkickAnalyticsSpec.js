describe("logEventObject", function() {
  var tracker;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});
    spyOn(tracker, 'logEvent').andReturn();
    tracker.logEventObject({category: "cat", action: "act", x:1, y:2})
  });

  it("should call logEvent", function() {
    expect(tracker.logEvent).toHaveBeenCalled();
  });
  
  it("should extract category and action", function() {
    expect(tracker.logEvent).toHaveBeenCalledWith("cat","act",{x:1,y:2});
  });
});

describe("logEvent", function() {
  var tracker;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});
    spyOn(tracker, 'getEventRequestObject').andReturn({x:1,y:2});
    spyOn(tracker, 'loadImage').andReturn();
    tracker.logEvent(null, null, {})
  });

  it("should call load image", function() {
    expect(tracker.loadImage).toHaveBeenCalled();
  });
  
  it("should pass serialise event object as query params ", function() {
    expect(tracker.loadImage).toHaveBeenCalledWith("https://example.com/image.png?x=1&y=2")
  });
});

describe("getEventRequestObject", function() {
  var tracker;
  var requestObject;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});

    spyOn(tracker, 'initAnalyticsCookie').andReturn(
      {
        analyticsUserId: "xyz123",
        creationTs: 1,
        currentTs: 2,
        lastVisitTs: 3
      }
    );

    requestObject = tracker.getEventRequestObject("category", "action", {x: 1, y: 2});
  });

  it("should include analytics user id", function() {
    expect(requestObject.uid).toEqual("xyz123");
  });
  
  it("should include category", function() {
    expect(requestObject.ev_ca).toEqual("category");
  });
  
  it("should include action", function() {
    expect(requestObject.ev_ac).toEqual("action");
  });

  it("should include serialised properties", function() {
    expect(requestObject.ev_pr).toEqual("x=1&y=2");
  });

  it("should include screen resolution", function() {
    expect(requestObject.res).toBeDefined();
  });

  it("should include url", function() {
    expect(requestObject.url).toBeDefined();
  });

  it("should include referrer", function() {
    expect(requestObject.refr).toBeDefined();
  });
});

describe("getAnalyticsData", function() {
  var tracker;
  var analyticsData;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});
    analyticsData = tracker.getAnalyticsData(
      {
        analyticsCategory: "cat", 
        analyticsAction: "act",
        analyticsSomething: "thing",
        anotherThing: "what?"
      }
    );
  });

  it("should extract properties prefixed with 'analytics'", function() {
    expect(analyticsData.category).toEqual("cat");
    expect(analyticsData.action).toEqual("act");
    expect(analyticsData.something).toEqual("thing");
  });

  it("should ignore properties not prefixed with 'analytics'", function() {
    expect(analyticsData.thing).not.toBeDefined();
  });
});

describe("Click interaction tracking", function() {
  var tracker;
  var button;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});
    spyOn(tracker, 'logEvent').andReturn();

    $("body").append($('<button></button>')
      .hide()
      .addClass("analytics-click")
      .attr("data-analytics-action","test")
      .attr("data-analytics-x","1")
    );
    tracker.init();
    $(".analytics-click").click();
  });

   afterEach(function() {
    $(".analytics-click").remove();
  });

  it("should log onClick events", function() {
    expect(tracker.logEvent).toHaveBeenCalledWith("click","test",{x:1})
  });
});

describe("Change interaction tracking", function() {
  var tracker;
  var button;

  beforeEach(function() {
    tracker = new SongkickAnalytics("https://example.com/image.png",{});
    spyOn(tracker, 'logEvent').andReturn();

    $("body").append($('<select></select>')
      .hide()
      .addClass("analytics-change")
      .attr("data-analytics-action","test")
      .attr("data-analytics-x","1")
      .append($('<option></option>').attr("selected", "selected").val("val1"))
      .append($('<option></option>').val("val2"))
    );
    tracker.init();
    $(".analytics-change").change();
  });
  
  afterEach(function() {
    $(".analytics-change").remove();
  });

  it("should log onChange events", function() {
    expect(tracker.logEvent).toHaveBeenCalledWith("change","test",{x:1, selected:"val1"})
  });
});


