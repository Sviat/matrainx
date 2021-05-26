"use strict";
// NB! All variables storing
//     Date - have postfix At
//     Time - have postfix Time
//     Unix Epoch - have postfix Timestamp

// -- GLOBALS -- //
var currentDisplay = undefined;

function pauseDisplay() {
    if( currentDisplay ) {
        currentDisplay.togglePause();
    }
}

function initializeDisplay(container, urlSearchParams) {
    container.click( pauseDisplay );
    currentDisplay = createDisplay(container, urlSearchParams);
    // Implementation decides on Autostarting
}
// --    --    -- //

// -- HTML API -- //
function initializeDisplayClock(container) {
    let urlSearchParams = new URLSearchParams(window.location.search);

    if(!urlSearchParams.has("type") ) {
        urlSearchParams.set("type", "clock");
    }
    urlSearchParams.set("hideDays", "true");

    initializeDisplay(container, urlSearchParams);
}

function initializeDisplayCounter(container) {
    let urlSearchParams = new URLSearchParams(window.location.search);

    if(!urlSearchParams.has("type") ) {
        urlSearchParams.set("type", "stopwatch");
    }

    initializeDisplay(container, urlSearchParams);
}
// --    --    -- //

// Better would be TimeSpan structure with from (i.e. Date.now) and to (i.e. Unix Epoch)
class Time {
    constructor(passedTimestamp, sinceTimestamp = 0, milliseconds = 0, seconds = 0, minutes = 0, hours = 0, days = 0) {
        this._since = sinceTimestamp;
        this._passed = passedTimestamp;
        this.milliseconds   = milliseconds;
        this.seconds        = seconds;
        this.minutes        = minutes;
        this.hours          = hours;
        this.days           = days;
    }

    stamp() { return this._passed; }
    isNegative() { return this.passedTimestamp < this.sinceTimestamp; }

    static fromDate(date) {
        // Absolute time at given moment
        let sinceTimestamp = 0;  // Unix Epoch
        let passedTimestamp = date.getTime();
        let milliseconds   = date.getUTCMilliseconds();
        let seconds        = date.getUTCSeconds();
        let minutes        = date.getUTCMinutes();
        let hours          = date.getUTCHours();
        let days           = Math.floor(passedTimestamp / (1000*60*60*24));
        return new Time(passedTimestamp, sinceTimestamp, milliseconds, seconds, minutes, hours, days);
    }

    static fromTimestamp(passedTimestamp, sinceTimestamp = 0) {
        // Relative time since some moment. By default - since Unix Epoch
        let t = passedTimestamp;
        let milliseconds   =            t %  1000;
        let seconds        = Math.floor(t / (1000)) % 60;
        let minutes        = Math.floor(t / (1000*60)) % 60;
        let hours          = Math.floor(t / (1000*60*60)) % 24;
        let days           = Math.floor(t / (1000*60*60*24));
        return new Time(passedTimestamp, sinceTimestamp, milliseconds, seconds, minutes, hours, days);
    }
}

function createDisplay(container, urlSearchParams) {
    const randomDelay = Math.floor(Math.random() * Math.floor(60*1000));
    const currentDate = new Date();
    const currentTimestamp = currentDate.getTime();
    const futureTimestamp = currentTimestamp + randomDelay;
    const pastTimestamp = currentTimestamp - randomDelay;

    let displayType = urlSearchParams.get("type");
    switch(displayType) {
        case "frozen":
            if(!urlSearchParams.has("to") ) {
                urlSearchParams.set("to", pastTimestamp);
            }

            let atTimestamp = parseInt(urlSearchParams.get("to"));
            return new Display( container, Time.fromTimestamp(atTimestamp), urlSearchParams );
        case "static": return new Display( container, Time.fromDate(currentDate), urlSearchParams );
        case "clock": return new ClockDisplay( container, urlSearchParams );
        case "countdown":
            if(!urlSearchParams.has("to") ) {
                urlSearchParams.set("to", futureTimestamp);
            }

            let stopTimestamp = parseInt(urlSearchParams.get("to"));
            return new CountdownDisplay( container, stopTimestamp, urlSearchParams );
        case "timer":
            if(!urlSearchParams.has("duration") ) {
                urlSearchParams.set("duration", futureTimestamp);
            }

            let passMilliseconds = parseInt(urlSearchParams.get("duration"));
            return new TimerDisplay( container, passMilliseconds, urlSearchParams );
        case "stopwatch": return new StopwatchDisplay( container, urlSearchParams );
        default: return new StopwatchDisplay( container, urlSearchParams );
    }
}

// Current absolute time display [Static]
class Display {
    constructor(container, time, urlSearchParams) {
        let fps = urlSearchParams.get("fps") || "10.0";
        this.frequency = parseFloat(fps);

        this.period = 1000.0 / this.frequency;
        this.timestampLastDraw = 0;
        this.animationFrame = undefined;

        let hideDaysArg = urlSearchParams.get("hideDays") || "false";
        this.hideDays = hideDaysArg == "true";

        this.container = container;
        this.containerDays      = this.container.find('.days');
        this.containerHours     = this.container.find('.hours');
        this.containerMinutes   = this.container.find('.minutes');
        this.containerSeconds   = this.container.find('.seconds');

        this._displayTime = time;
        this._drawImplementation();
    }

    getTime() /* virtual */ { return this._displayTime; }
    setTime(time) /* virtual */ { this.stop(); /* Static display doesnt need update */ }
    init() /* virtual */ {
        console.log("Init");
        if( this.hideDays ) {
            this.containerDays.parent().hide();
        } else {
            this.containerDays.parent().show();
        }
    }

    togglePause() {
        if( this.isDrawing() ) {
            this.stop();
        } else {
            this.continue();
        }
    }

    start() {
        console.log("Start");
        this.init();
        this.continue();
    }

    continue() {
        this.animationFrame = window.requestAnimationFrame( (timestamp) => this.draw(timestamp) )
    }

    stop() {
        console.log("Stop");
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = undefined;
        this.timestampLastDraw = 0;
    }

    isDrawing() {
        return (typeof this.animationFrame != "undefined");
    }

    shouldDraw(timestamp) {
        if( (timestamp - this.timestampLastDraw) > this.period ) {
            return true;
        }
        return false;
    }

    draw(timestamp) {
        if( this.shouldDraw(timestamp) ) {
            this._stepImplementation();
            this._drawImplementation();
            this.timestampLastDraw = timestamp;
        }

        if( this.isDrawing() ) {
            this.continue();
        }
    }

    _stepImplementation() {
        this.setTime(Display.getTimeNow());
    }

    _drawImplementation() {
        let t = this.getTime();
        this.containerDays.text(('0' + t.days).slice(-2));
        this.containerHours.text(('0' + t.hours).slice(-2));
        this.containerMinutes.text(('0' + t.minutes).slice(-2));
        this.containerSeconds.text(('0' + t.seconds).slice(-2));

        this._segmentUpdateProgress(this.containerSeconds, t.milliseconds / 1000);
        this._segmentUpdateProgress(this.containerMinutes, t.seconds / 60);
        this._segmentUpdateProgress(this.containerHours, t.minutes / 60);
        this._segmentUpdateProgress(this.containerDays, t.days / 100);
    }

    _segmentUpdateProgress(segment, progress) {
        const procent = ( (0.0 <= progress) && (progress <= 1.0) ) ? progress : 1.0;
        const minimum = 0.5;
        const maximum = 1.0;
        const targetOpacity = (maximum - minimum) * procent + minimum;
        segment.fadeTo(this.period, targetOpacity);
    }

    static getTimeNow()                 { return Time.fromDate(new Date()); }
    static getTimeSince(startedTime)    { return Display.getTimeBetween(startedTime, Display.getTimeNow()); }
    static getTimeRemaining(finishTime) { return Display.getTimeBetween(Display.getTimeNow(), finishTime ); }
    static getTimeBetween(startedTime, finishTime) {
        return Time.fromTimestamp( finishTime.stamp() - startedTime.stamp()
                                 , finishTime._since  - startedTime._since );
    }

}

// Current absolute time display [Dynamic]
class ClockDisplay extends Display {
    constructor(container, urlSearchParams) {
        super(container, Display.getTimeNow(), urlSearchParams);

        this.hideDays = true;   // Only makes sense for time spans, not for absolute time
        this.start();
    }

    setTime(time) /* override */ {
        this._displayTime = time;
    }
}

// Countdown certain amount of milliseconds
class CountdownDisplay extends Display {
    constructor(container, stopTimestamp, urlSearchParams) {
        let stopTime = Time.fromTimestamp(stopTimestamp);
        super(container, Display.getTimeRemaining(stopTime), urlSearchParams);

        this.stopTimestamp = stopTimestamp;
        this.stopTime = stopTime;
        this.start();
    }

    setTime(time) /* override */ {
        if( time.stamp() > this.stopTimestamp ) {
            this.stop();    // Zero still must be drawn
            this._displayTime = new Time(0);
        } else {
            this._displayTime = Display.getTimeRemaining(this.stopTime);
        }
    }
}

// Countdown certain amount of milliseconds
class TimerDisplay extends CountdownDisplay {
    constructor(container, duration, urlSearchParams) {
        super(container, Date.now() + duration, urlSearchParams);
    }
}

// Count from here to eternity
class StopwatchDisplay extends Display {
    constructor(container, urlSearchParams) {
        super(container, new Time(0), urlSearchParams);

        // let offset = urlSearchParams.get("offset") || "123";
        // this.offset = parseFloat(offset);

        this.startTime = Display.getTimeNow();
        this.start();
    }

    setTime(time) /* override */ {
        this._displayTime = Display.getTimeSince(this.startTime);
    }
}
