"use strict";

var currentDrawer = undefined;

// Triggered from HTML
function letTheRainingBegin() {
    let screen = window.screen;
    let urlSearchParams = new URLSearchParams(window.location.search);

    let matrix = document.getElementById("matrix");
    matrix.width = screen.width;
    matrix.height = screen.height;

    let context = matrix.getContext("2d");
    currentDrawer = createDrawer( { drawingContext: context, width: screen.width, height: screen.height }, urlSearchParams );
    currentDrawer.start();
}

// Triggered from HTML
function toggleRain() {
    currentDrawer.toggleDrawing();
}

class CoronaStatsExported {
    constructor(confirmed = 0, dead = 0, recovered = 0, active = 0, timestamp = 0) {
        this.confirmed = confirmed;
        this.dead = dead;
        this.recovered = recovered;
        this.active = active;
        this.timestamp = timestamp || Date.now();
    }

    deserialize(exportString) {
        let temp = JSON.parse(exportString);
        try {
            this.confirmed = temp.confirmed;
            this.dead = temp.dead;
            this.recovered = temp.recovered;
            this.active = temp.active;
            this.timestamp = temp.timestamp;
        } catch(e) {
            console.error(e);
            this.confirmed = 440392;
            this.dead = 19769;
            this.recovered = 111460;
            this.active = 309163;
        };
    }
}

class RainDrawer {
    constructor(view, urlSearchParams) {
        this.frequency = urlSearchParams.get("fps") || ( 25.0);
        this.period = 1000.0 / this.frequency;
        this.raindropSize = urlSearchParams.get("size") || 14;

        this.context = view.drawingContext;
        this.context.font = `normal normal ${this.raindropSize}pt Monospace`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";

        this.width = view.width;
        this.height = view.height;
        this.timestampLastDraw = 0;
        this.animationFrame = undefined;
    }

    draw(timestamp) {
        if( this.shouldDraw(timestamp) ) {
            this._drawImplementation();
            this.timestampLastDraw = timestamp;
        }

        this.continue();
    }

    shouldDraw(timestamp) {
        if( (timestamp - this.timestampLastDraw) > this.period ) {
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
    constructor(view, urlSearchParams) {
        super(view, urlSearchParams);
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);
    }

    _drawImplementation() {
        this.context.fillStyle = "rgba(0, 0, 0, 0.05)";
        this.context.fillRect(0, 0, this.width, this.height);
        this.context.fillStyle = "rgba(0, 255, 0, 1.0)";
        this.yPositions.map( (y, index) => {
            let text = String.fromCharCode(0x2588);
            let x = (index - 1) * (this.raindropSize - 1);
            this.context.fillText(text, x, y);
            if( y > ((this.yPositions.length / 2) + Math.random() * 1e4)) {
                this.yPositions[index] = 0;
            } else {
                this.yPositions[index] = y + this.raindropSize;
            }
        });
    }
};

class RandomRainDrawer extends RainDrawer {
    constructor(view, urlSearchParams) {
        super(view, urlSearchParams);
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);
    }

    _drawImplementation() {
        this.context.fillStyle = "rgba(0, 0, 0, 0.05)";
        this.context.fillRect(0, 0, this.width, this.height);
        this.context.fillStyle = "rgba(0, 255, 0, 1.0)";
        this.yPositions.map( (y, index) => {
            let text = this.generateRaindrop();
            let x = (index - 1) * (this.raindropSize - 1);
            this.context.fillText(text, x, y);
            if( y > ((this.yPositions.length / 2) + Math.random() * 1e4)) {
                this.yPositions[index] = 0;
            } else {
                this.yPositions[index] = y + this.raindropSize;
            }
        });
    }
};

class CoronaRainDrawer extends RandomRainDrawer {
    constructor(view, urlSearchParams) {
        super(view, urlSearchParams);
        this.dataCache = window.localStorage; // Requires CEF flag: --disable-domain-blocking-for-3d-apis

        this.factor = urlSearchParams.get("factor") || 0.996;
        this.totalPopulation = urlSearchParams.get("pop") || 7775613153;
        this.yPositions = Array( Math.round( this.width / (this.raindropSize - 2) ) ).fill(0);

        const UNKNOWN = 0;  //TODO
        this.raindropStatus = Array(this.yPositions.length).fill(UNKNOWN);
        this.raindropQueue = Array(this.yPositions.length).fill([]);

        this.statsLatest = new CoronaStatsExported();
        this.statsDiff = new CoronaStatsExported();
        this.statsRendered = new CoronaStatsExported();
    }

    _drawImplementation() {
        this._updateState();    // sadly have to link update and draw, due to rendering whole character
        this._drawState();      // more (draw) FPS -> more (update) PS -> faster rain drops
    }

    _updateState() {
        this.raindropStatus.map( (status, column) => {
            if( this.raindropQueue[column].length ) {
                return;
            }

            const PAUSED = -1;  //TODO
            const DEAD = 4;     //TODO
            const DELAYED = 5;  //TODO


            let row = this.yPositions[column];

            let isBelowThreshold = ( (row*this.raindropSize) > ((this.yPositions.length / 2) + Math.random() * 1e4));
            let isDead = (status === DEAD);
            let isWaiting = ( (status <= PAUSED) || (status >= DELAYED) );
            let shouldDisappear = (isBelowThreshold || isDead) && (!isWaiting);

            if( shouldDisappear ) {
                this.resetCoronaRaindrop(column);
            } else {
                this.advanceCoronaRaindrop(column);
            }
        });
    }

    isNormalRaindrop(column) {
        const UNKNOWN = 0;  //TODO
        return this.raindropStatus[column] === UNKNOWN;
    }
    resetCoronaRaindrop(column) {
        const UNKNOWN = 0;  //TODO
        this.yPositions[column] = 0;
        this.raindropStatus[column] = UNKNOWN;
    }
    advanceCoronaRaindrop(column) {
        const UNKNOWN = 0;  //TODO
        const RECOVERED = 3;//TODO
        const DEAD = 4;     //TODO

        function pauseNeighbors(that, column) {
            const DELAY = -5; // TODO
            function pauseLane(that, c) {
                if( (that.raindropStatus >= UNKNOWN)
                 && (that.raindropStatus <= RECOVERED) ) {
                    that.raindropStatus[c] = DELAY;
                }
            }
            if( (column > 0) ) {
                pauseLane(that, column-1);
            }
            if( (column < (that.raindropStatus.length-1) ) ) {
                pauseLane(that, column+1);
            }
        }
        let status = this.raindropStatus[column];

        this.raindropStatus[column] = this.getNextCoronaRaindropStatus(status);
        if( this.raindropStatus[column] === RECOVERED ) {
            this.addSymbolsToRenderingQueue(column, this.getRecoveredIcon());
            this.addNumberToRenderingQueue(column, this.getStatsLatest().recovered);
            pauseNeighbors(this, column);
        } else
        if( this.raindropStatus[column] === DEAD ) {
            this.addSymbolsToRenderingQueue(column, this.getDeadIcon());
            this.addNumberToRenderingQueue(column, this.getStatsLatest().dead);
            pauseNeighbors(this, column);
        }
    }
    getNextCoronaRaindropStatus(status) {
        const PAUSED = -1;  //TODO
        const UNKNOWN = 0;  //TODO
        const CONFIRMED = 1;//TODO
        const ACTIVE = 2;   //TODO
        const RECOVERED = 3;//TODO
        const DEAD = 4;     //TODO
        const DELAYED = 5;  //TODO

        switch(status) {
            case UNKNOWN:
                if( this.shouldConfirmCorona() ) {
                    return CONFIRMED;
                } else {
                    return UNKNOWN;
                }
            case CONFIRMED:
                return ACTIVE;
            case ACTIVE:
                let latest = this.getStatsLatest();
                let luckScore = Math.random() * latest.confirmed;
                if( luckScore < latest.dead ) {
                    return DEAD;
                } else
                if( luckScore < (latest.dead + latest.active) ) {
                    return ACTIVE;
                } else {
                    return RECOVERED;
                }
            case RECOVERED:
                if( this.shouldConfirmCoronaAgain() ) {
                    return CONFIRMED; // reinfected, oops
                } else {
                    return UNKNOWN;
                }
            case DEAD:
                return UNKNOWN;
            default:
                // shrink back towards [0:5] range
                if( status <= PAUSED ) {
                    return status+1;
                } else
                if( status >= DELAYED ) {
                    return status-1;
                } else {
                    return UNKNOWN;
                }
        };
    }

    shouldConfirmCorona() {
        let population = this.getTotalPopulation();
        let confirmed = this.getStatsLatest().confirmed;
        return ( Math.random() * population < confirmed );
    }
    shouldConfirmCoronaAgain() { return (Math.random() > this.factor); }

    _drawState() {
        this.context.fillStyle = "rgba(0, 0, 0, 0.05)";
        this.context.fillRect(0, 0, this.width, this.height);
        this.raindropStatus.forEach( (status, column) => {
            this._drawCoronaRaindrop(column, status);
        });
    }

    _drawCoronaRaindrop(column, statusCode) {
        const colorMap = [
            "rgba(0, 255, 0, 1.0)",
            "rgba(255, 0, 0, 1.0)",
            "rgba(0, 255, 0, 1.0)",
            "hsla(070, 070%, 055%, 1.0)",
            "hsla(016, 100%, 042%, 1.0)"
        ];
        const iconGeneratorMap = [
            super.generateRaindrop,
            this.getConfirmedIcon,
            this.getActiveIcon,
            this.getRecoveredIcon,
            this.getDeadIcon
        ];
        let color = colorMap[statusCode];
        let icon = "";
        if( this.raindropQueue[column].length ) {
            icon = this.raindropQueue[column].shift();
        } else {
            icon = iconGeneratorMap[statusCode]()
        }
        let row = this.yPositions[column];
        this._drawRaindrop(column, row, color, icon);
    }

    addNumberToRenderingQueue(column, value) {
        let digitString = value.toString().split('');
        let pseudoDigitString = [];
        digitString.map( (value, index) => {
            pseudoDigitString.push(" ");
            pseudoDigitString.push(value);
            // switch(value) {
            //     case "0": pseudoDigitString.push(String.fromCharCode(0x24FF)); break;
            //     case "1": pseudoDigitString.push(String.fromCharCode(0x2460)); break;
            //     case "2": pseudoDigitString.push(String.fromCharCode(0x2461)); break;
            //     case "3": pseudoDigitString.push(String.fromCharCode(0x2462)); break;
            //     case "4": pseudoDigitString.push(String.fromCharCode(0x2463)); break;
            //     case "5": pseudoDigitString.push(String.fromCharCode(0x2464)); break;
            //     case "6": pseudoDigitString.push(String.fromCharCode(0x2465)); break;
            //     case "7": pseudoDigitString.push(String.fromCharCode(0x2466)); break;
            //     case "8": pseudoDigitString.push(String.fromCharCode(0x2467)); break;
            //     case "9": pseudoDigitString.push(String.fromCharCode(0x2468)); break;
            // }
        });
        pseudoDigitString.push(" ");
        this.addSymbolsToRenderingQueue(column, pseudoDigitString);
    }

    addSymbolsToRenderingQueue(column, symbols) {
        this.raindropQueue[column] = this.raindropQueue[column].concat(symbols);
    }

    _drawRaindrop(column, row, style, text) {
        let x = (column - 1) * (this.raindropSize - 1);
        let y = row * this.raindropSize;
        this.context.fillStyle = style;
        this.context.fillText(text, x, y);

        this.yPositions[column] = row + 1;
    }

    readFromCacheCoronaStatsLatest() {
        const COOKIE_NAME_LATEST = "coronaStatsLatest";
        this.statsLatest.deserialize(this.dataCache.getItem(COOKIE_NAME_LATEST))
        return this.statsLatest;
    }

    readFromCacheCoronaStatsDiff() {
        const COOKIE_NAME_DIFF = "coronaStatsDiff";
        this.statsDiff.deserialize(this.dataCache.getItem(COOKIE_NAME_DIFF))
        return this.statsDiff;
    }

    getTotalPopulation() { return this.totalPopulation; }
    getStats() { return this.statsRendered; }
    getStatsLatest() { return this.readFromCacheCoronaStatsLatest(); }
    getStatsDiff() { return this.readFromCacheCoronaStatsDiff(); }

    getConfirmedIcon() { return String.fromCharCode(0xD83D, 0xDC51); } //0xD83E, 0xDD34
    getDeadIcon() { return String.fromCharCode(0xD83D, 0xDC80); }
    getRecoveredIcon() { return String.fromCharCode(0xD83E, 0xDD73) }
    getActiveIcon() { return String.fromCharCode(0x2022); } // 0x23F3


    generateCoronaRaindrop() {
        let choise = parseInt((Math.random() * 100) % 4);
        switch(choise) {
            case 0: this.statsRendered.confirmed++; return this.getConfirmedCount();
            case 1: this.statsRendered.dead++; return this.getDeadCount();
            case 2: this.statsRendered.recovered++; return this.getRecoveredCount();
            case 3: this.statsRendered.active++; return this.getActiveCount();
            default: return "X_x";
        }
    }
    getConfirmedCount() { return `${this.getConfirmedIcon()}${this.getStats().confirmed}`; }
    getDeadCount() { return `${this.getDeadIcon()}${this.getStats().dead}`; }
    getRecoveredCount() { return `${this.getRecoveredIcon()}${this.getStats().recovered}`; }
    getActiveCount() { return `${this.getActiveIcon()}${this.getStats().active}`; }
};

function createDrawer(view, urlSearchParams) {
    if(!urlSearchParams.has("draw") ) {
        urlSearchParams.set("draw", "corona");
    }

    let drawerName = urlSearchParams.get("draw");
    switch(drawerName) {
        case "corona": return new CoronaRainDrawer( view, urlSearchParams );
        case "pixel": return new PixelRainDrawer( view, urlSearchParams );
        case "random": return new RandomRainDrawer( view, urlSearchParams );
        default: return new RandomRainDrawer( view, urlSearchParams );
    }
}