"use strict";

const RAINDROP_SIZE = 14;
const DRAWING_FREQUENCY = 1000.0 / 30.0;

const COOKIE_NAME_LATEST = "coronaStatsLatest";

var drawRainAnimationFrame = undefined;
var timestampLastDraw = null;
var matrix = undefined;
var context = undefined;
var screen = window.screen;
var currentDrawer = undefined;

class RainDrawer {
    constructor(drawingContext, view) {
        this.dataCache = window.localStorage; // Requires CEF flag: --disable-domain-blocking-for-3d-apis
        this.frequency = DRAWING_FREQUENCY;
        this.raindropSize = RAINDROP_SIZE;

        this.context = drawingContext;
        this.width = view.width;
        this.height = view.height;
        this.timestampLastDraw = 0;
        this.animationFrame = undefined;
    }

    readCoronaStatsFromCache() {
        try {
            return JSON.parse(this.dataCache.getItem(COOKIE_NAME_LATEST));
        } catch(e) {
            console.error(e);
            return {
                confirmed: 440392,
                dead: 19769,
                recovered: 111460,
                active: 309163
            }
        };
    }

    draw(timestamp) {
        if( this.shouldDraw(timestamp) ) {
            this._drawImplementation();
            this.timestampLastDraw = timestamp;
        }

        this.continue();
    }

    shouldDraw(timestamp) {
        if( (timestamp - this.timestampLastDraw) > this.frequency ) {
            return true;
        }
        return false;
    }

    _drawImplementation() {
        this.context.fillStyle = "rgba(111, 0, 0, 1.0)";
        this.context.fillRect(0, 0, this.width, this.height);
    }

    generateRaindrop() {
        const symbolRangeBegin = 0x00C0;
        const symbolRangeEnd = 0xDBFF;

        let code = symbolRangeBegin + Math.random() * (symbolRangeEnd - symbolRangeBegin + 1);
        if((code >= 0x1C90) && (code <= 0x1CCF))
        {
            code = 0x1699;//0x0020;
        } else {
            while( ((code >= 0x0800) && (code <= 0x08FF))
            ||((code >= 0x2100) && (code <= 0x27FF))
            ||((code >= 0x2934) && (code <= 0x2935))
            ||((code >= 0x2B00) && (code <= 0x2B59))
            ||((code >= 0x3297) && (code <= 0x3299))
            ||((code >= 0xFC00) && (code <= 0xFFFF))
            ||( code in [0x20E3, 0x303D, 0x3030, 0x2B55, 0x2B1C, 0x2B1B, 0x2B50] ) ) {
                let tempStart = 0x13000;
                let tempEnd = 0x1342F;
                code = tempStart + Math.random() * (tempEnd - tempStart + 1);
            }
        }
        code = Math.trunc(code);
        // return String.fromCharCode(code);
        return String.fromCodePoint(code);
    }

    toggleDrawing() {
        if( this.isDrawing() ) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        this.animationFrame = window.requestAnimationFrame( (timestamp) => this.draw(timestamp) )
    }

    continue() {
        this.start();
    }

    stop() {
        window.cancelAnimationFrame(this.animationFrame);
        this.animationFrame = undefined;
        this.timestampLastDraw = 0;
    }

    isDrawing() {
        return (typeof this.animationFrame != "undefined");
    }
};

class PixelRainDrawer extends RainDrawer {
    constructor(drawingContext, view) {
        super(drawingContext, view);
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);
    }

    _drawImplementation() {
        context.fillStyle = "rgba(0, 0, 0, 0.05)";
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = "rgba(0, 255, 0, 1.0)";
        this.yPositions.map( (y, index) => {
            let text = String.fromCharCode(0x2588);
            let x = (index - 1) * (this.raindropSize - 1);
            context.fillText(text, x, y);
            if( y > ((this.yPositions.length / 2) + Math.random() * 1e4)) {
                this.yPositions[index] = 0;
            } else {
                this.yPositions[index] = y + this.raindropSize;
            }
        });
    }
};

class RandomRainDrawer extends RainDrawer {
    constructor(drawingContext, view) {
        super(drawingContext, view);
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);
    }

    _drawImplementation() {
        context.fillStyle = "rgba(0, 0, 0, 0.05)";
        context.fillRect(0, 0, this.width, this.height);
        context.fillStyle = "rgba(0, 255, 0, 1.0)";
        this.yPositions.map( (y, index) => {
            let text = this.generateRaindrop();
            let x = (index - 1) * (this.raindropSize - 1);
            context.fillText(text, x, y);
            if( y > ((this.yPositions.length / 2) + Math.random() * 1e4)) {
                this.yPositions[index] = 0;
            } else {
                this.yPositions[index] = y + this.raindropSize;
            }
        });
    }
};

class CoronaRainDrawer extends RandomRainDrawer {
    constructor(drawingContext, view, factor) {
        super(drawingContext, view);
        this.factor = factor;
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);
    }

    generateRaindrop() {
        if( Math.random() < this.factor ) {
            return super.generateRaindrop();
        }

        let choise = parseInt((Math.random() * 100) % 4);
        switch(choise) {
            case 0: return this.getConfirmedCount();
            case 1: return this.getDeadCount();
            case 2: return this.getRecoveredCount();
            case 3: return this.getActiveCount();
            default: return "X_x";
        }
    }

    getStats() { return this.readCoronaStatsFromCache(); }
    getConfirmed() { return this.getStats().confirmed; }
    getDead() { return this.getStats().dead; }
    getRecovered() { return this.getStats().recovered; }
    getActive() { return this.getStats().active; }

    getConfirmedIcon() { return String.fromCharCode(0xD83E, 0xDD34); }
    getDeadIcon() { return String.fromCharCode(0xD83D, 0xDC80); }
    getRecoveredIcon() { return String.fromCharCode(0xD83E, 0xDD73) }
    getActiveIcon() { return String.fromCharCode(0x23F3); }

    getConfirmedCount() { return `${this.getConfirmedIcon()}${this.getConfirmed()}`; }
    getDeadCount() { return `${this.getDeadIcon()}${this.getDead()}`; }
    getRecoveredCount() { return `${this.getRecoveredIcon()}${this.getRecovered()}`; }
    getActiveCount() { return `${this.getActiveIcon()}${this.getActive()}`; }
};

function letTheRainingBegin() {
    matrix = document.getElementById("matrix");
    context = matrix.getContext("2d");
    matrix.width = screen.width;
    matrix.height = screen.height;
    context.font = `${RAINDROP_SIZE}pt Monospace`;

    // currentDrawer = new PixelRainDrawer( context, { width: screen.width, height: screen.height } );
    currentDrawer = new CoronaRainDrawer( context, { width: screen.width, height: screen.height }, 0.996 );
    currentDrawer.start();
}

function toggleRain() {
    currentDrawer.toggleDrawing();
}
