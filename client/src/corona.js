"use strict";

const COOKIE_NAME_LATEST = "coronaStatsLatest";
const COOKIE_NAME_DIFF = "coronaStatsDiff";

var INTERVAL = undefined;
var SOURCE = undefined;
var VIEW = undefined;

class CoronaStats {
    constructor(confirmed = 0, dead = 0, recovered = 0, timestamp = 0) {
        this.confirmed = confirmed;
        this.dead = dead;
        this.recovered = recovered;
        this.timestamp = timestamp || Date.now();
    }

    getActive() {
        if( Number.isInteger(this.confirmed)
         && Number.isInteger(this.dead)
         && Number.isInteger(this.recovered) ) {
            return this.confirmed - this.dead - this.recovered;
        }
        return NaN;
    }

    getDiff(otherStats) {
        return new CoronaStats(
            (this.confirmed - otherStats.confirmed),
            (this.dead - otherStats.dead),
            (this.recovered - otherStats.recovered),
            (this.timestamp - otherStats.timestamp)
        );
    }

    updateWith(otherStats) {
        this.confirmed = otherStats.confirmed || this.confirmed;
        this.dead = otherStats.dead || this.dead;
        this.recovered = otherStats.recovered || this.recovered;
        this.timestamp = otherStats.timestamp || this.timestamp;
        return this;
    }

    serialize() {
        return JSON.stringify({
            confirmed: this.confirmed,
            dead: this.dead,
            recovered: this.recovered,
            active: this.getActive(),
            timestamp: this.timestamp
        });
    }
}

class CoronaSource {
    constructor() {
        this.cache = window.localStorage; // Requires CEF flag: --disable-domain-blocking-for-3d-apis
        this.current = new CoronaStats();
        this.previous = new CoronaStats();
        this.lastDiff = new CoronaStats();
    }

    getStats() {
        return this.current;
    }

    clearDiff() {
        this.cacheStats();
        this.lastDiff = new CoronaStats();
    }

    updateDiff() {
        this.lastDiff.updateWith(this.current.getDiff(this.previous));
        return this.lastDiff;
    }

    update(renderCb = undefined) {
    }

    cacheStats() {
        try {
            this.cache.setItem( COOKIE_NAME_LATEST, this.current.serialize() );
        } catch (e) {
            console.error(e);
        }
    }
}

class ArcgisCoronaSource extends CoronaSource {
    // https://www.arcgis.com/apps/opsdashboard/index.html#/bda7594740fd40299423467b48e9ecf6
    constructor() {
        super();

        this.endpoint = {
            "confirmed": "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22Confirmed%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&outSR=102100&cacheHint=true",
            "dead": "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22Deaths%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&outSR=102100&cacheHint=true",
            "recovered": "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22Recovered%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&outSR=102100&cacheHint=true",
            "combined": "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=[{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Confirmed%22,%22outStatisticFieldName%22:%22confirmed%22},{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Recovered%22,%22outStatisticFieldName%22:%22recovered%22},{%22statisticType%22:%22sum%22,%22onStatisticField%22:%22Deaths%22,%22outStatisticFieldName%22:%22dead%22}]&outSR=102100&cacheHint=true"
        };
    }

    _requestValue(url, callback) {
        // KILLME: DEPRECATED
        $.getJSON(url).done(function (data) {
            function responseHasValue(response) {
                return response && response.features
                    && response.features[0].attributes
                    && response.features[0].attributes.value;
            }
            function responseGetValue(response) {
                return response.features[0].attributes.value;
            }

            let value = 0;
            try {
                if( responseHasValue(data) ) {
                    value = parseInt( responseGetValue(data) );
                }
            } catch (e) {
                console.error(e);
            }
            callback(value);
        }).fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error(`Request Failed: ${err}`);
        });
    }

    _requestStats(url, callback) {
        $.getJSON(url).done(function (data) {
            function responseHasStats(response) {
                return response && response.features
                    && response.features[0].attributes
                    && ( ("confirmed" in response.features[0].attributes)
                       ||("recovered" in response.features[0].attributes)
                       ||("dead"      in response.features[0].attributes) );
            }
            function responseGetStats(response) {
                function responseGetValue(field) {
                    return parseInt(response.features[0].attributes[field]);
                }
                return new CoronaStats(
                    responseGetValue("confirmed"),
                    responseGetValue("dead"),
                    responseGetValue("recovered")
                );
            }

            let stats = undefined;
            try {
                if( responseHasStats(data) ) {
                    stats = responseGetStats(data);
                }
            } catch (e) {
                console.error(e);
            }
            callback(stats);
        }).fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error(`Request Failed: ${err}`);
        });
    }

    _updateConfirmed(callback) {
        // KILLME: DEPRECATED
        this.previous.confirmed = this.current.confirmed;
        this._requestValue(this.endpoint.confirmed, (value) => {
            if( value ) {
                this.current.confirmed = value;
                if( callback ) {
                    callback();
                }
            }
        });
    }

    _updateDead(callback) {
        // KILLME: DEPRECATED
        this.previous.dead = this.current.dead;
        this._requestValue(this.endpoint.dead, (value) => {
            if( value ) {
                this.current.dead = value;
                if( callback ) {
                    callback();
                }
            }
        });
    }

    _updateRecovered(callback) {
        // KILLME: DEPRECATED
        this.previous.recovered = this.current.recovered;
        this._requestValue(this.endpoint.recovered, (value) => {
            if( value ) {
                this.current.recovered = value;
                if( callback ) {
                    callback();
                }
            }
        });
    }

    updateOneByOne(renderCb = undefined) {
        // KILLME: DEPRECATED
        function updateAndRenderCallback() {
            this.updateDiff();
            this.cacheStats();
            if( renderCb ) {
                renderCb(this.current, this.lastDiff);
            }
        }

        super.update();
        this._updateConfirmed(updateAndRenderCallback.bind(this));
        this._updateDead(updateAndRenderCallback.bind(this));
        this._updateRecovered(updateAndRenderCallback.bind(this));
    }

    updateStats(newData) {
        this.previous = this.current;
        this.current = newData
        this.lastDiff.updateWith(this.current.getDiff(this.previous));
        return this.lastDiff;
    }

    update(renderCb = undefined) {
        this._requestStats(this.endpoint.combined, (stats) => {
            if(!stats ) {
                return;
            }

            this.updateStats(stats);
            this.cacheStats();
            if( renderCb ) {
                renderCb(this.current, this.lastDiff);
            }
        });
    }
}

class GitHubCoronaTrackerApiSource extends CoronaSource {
    // https://github.com/ExpDev07/coronavirus-tracker-api
    constructor() {
        super();
        this.endpoint = "https://coronavirus-tracker-api.herokuapp.com/v2/latest";
        // this.endpoint = "https://coronavirus-tracker-api.herokuapp.com/v2/locations?timelines=1";
    }

    _requestStats(callback) {
        $.getJSON(this.endpoint).done(function (data) {
            let stats = undefined;
            try {
                if (data && data.latest) {
                    stats = new CoronaStats(
                        parseInt(data.latest.confirmed),
                        parseInt(data.latest.deaths),
                        parseInt(data.latest.recovered)
                    );
                }
            } catch (e) {
                console.error(e);
            }
            callback(stats);
        }).fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.error("Request Failed: " + err);
        });
    }

    _updateStats(stats) {
        if (stats) {
            this.current = stats;
            this.updateDiff();
        }
    }

    update(renderCb = undefined) {
        function updateCb(stats) {
            this._updateStats(stats);
            this.cacheStats();
            if (renderCb) {
                renderCb(this.current, this.lastDiff);
            }
        }

        this.previous = this.current;
        this._requestStats(updateCb.bind(this));
    }
};

class CoronaView {
    constructor(displayId) {
        this.displayId = displayId;
        this.displayDiv = document.getElementById(this.displayId);

        this.spanCurrentConfirmed = this.displayDiv.querySelector('.confirmed');
        this.spanCurrentDead = this.displayDiv.querySelector('.dead');
        this.spanCurrentRecovered = this.displayDiv.querySelector('.recovered');
        this.spanCurrentActive = this.displayDiv.querySelector('.active');

        this.spanDiffConfirmed = this.displayDiv.querySelector('#confirmedDiff');
        this.spanDiffDead = this.displayDiv.querySelector('#deadDiff');
        this.spanDiffRecovered = this.displayDiv.querySelector('#recoveredDiff');
        this.spanDiffActive = this.displayDiv.querySelector('#activeDiff');
    }

    draw(currentStats, differenceStats) {
        this.drawStats(currentStats, this.spanCurrentConfirmed, this.spanCurrentDead, this.spanCurrentRecovered, this.spanCurrentActive);
        this.drawStats(differenceStats, this.spanDiffConfirmed, this.spanDiffDead, this.spanDiffRecovered, this.spanDiffActive, true);
    }

    drawStats(stats, spanConfirmed, spanDead, spanRecovered, spanActive, forceDrawSign = false) {
        let numberFormat = new NumberFormat(42);
        numberFormat.setPlaces(0);
        numberFormat.setSeparators(true, ".", ",");

        function drawStat(span, value, formatter) {
            formatter.setNumber(value);
            let formattedValue = formatter.toFormatted();
            if (forceDrawSign && (value > 0) ) {
                formattedValue = "+"+formattedValue;
            }
            if (value === 0) {
                formattedValue = "&nbsp;";
            }
            span.innerHTML = formattedValue;
        }
        drawStat(spanConfirmed, stats.confirmed, numberFormat);
        drawStat(spanDead, stats.dead, numberFormat);
        drawStat(spanRecovered, stats.recovered, numberFormat);
        drawStat(spanActive, stats.getActive(), numberFormat);
    }
}

function startFetcher() {
    SOURCE = new ArcgisCoronaSource();
    // SOURCE = new GitHubCoronaTrackerApiSource();
    VIEW = new CoronaView("divCounter")
    initializeAndStartCounters(SOURCE, VIEW, INTERVAL);
}

function initializeAndStartCounters(source, view, interval) {
    function startCounters(currentStats, differenceStats) {
        clearInterval(interval);
        source.clearDiff();
        view.draw(currentStats, new CoronaStats());
        interval = setInterval(updateAndDraw, 60000);
    }

    function updateAndDraw() {
        source.update( function(currentStats, differenceStats) {
            view.draw(currentStats, differenceStats);
        });
    }

    source.update(startCounters);
}
