"use strict";

const COOKIE_NAME_LATEST = "coronaStatsLatest";

var INTERVAL = undefined;
var SOURCE = undefined;
var VIEW = undefined;

class CoronaStats {
    constructor(confirmed = 0, dead = 0, recovered = 0) {
        this.confirmed = confirmed;
        this.dead = dead;
        this.recovered = recovered;
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
            (this.recovered - otherStats.recovered)
        );
    }

    updateWith(otherStats) {
        this.confirmed = otherStats.confirmed || this.confirmed;
        this.dead = otherStats.dead || this.dead;
        this.recovered = otherStats.recovered || this.recovered;
        return this;
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
        let statsExport = {
            ...this.current,
            active: this.current.getActive()
        };
        try {
            this.cache.setItem(COOKIE_NAME_LATEST, JSON.stringify(statsExport));
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
            "recovered": "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/ncov_cases/FeatureServer/1/query?f=json&where=Confirmed%20%3E%200&returnGeometry=false&spatialRel=esriSpatialRelIntersects&outFields=*&outStatistics=%5B%7B%22statisticType%22%3A%22sum%22%2C%22onStatisticField%22%3A%22Recovered%22%2C%22outStatisticFieldName%22%3A%22value%22%7D%5D&outSR=102100&cacheHint=true"
        };
    }

    _requestValue(url, callback) {
        $.getJSON(url).done(function (data) {
            let value = 0;
            try {
                if (data && data.features && data.features[0].attributes && data.features[0].attributes.value) {
                    value = parseInt(data.features[0].attributes.value);
                }
            } catch (e) {
                console.error(e);
            }
            callback(value);
        }).fail(function (jqxhr, textStatus, error) {
            var err = textStatus + ", " + error;
            console.log("Request Failed: " + err);
        });
    }

    _updateConfirmed(callback) {
        this.previous.confirmed = this.current.confirmed;
        function setter(value) {
            if( value ) {
                this.current.confirmed = value;
                if( callback ) {
                    callback();
                }
            }
        }
        this._requestValue(this.endpoint.confirmed, setter.bind(this));
    }

    _updateDead(callback) {
        this.previous.dead = this.current.dead;
        function setter(value) {
            if( value ) {
                this.current.dead = value;
                if( callback ) {
                    callback();
                }
            }
        }
        this._requestValue(this.endpoint.dead, setter.bind(this));
    }

    _updateRecovered(callback) {
        this.previous.recovered = this.current.recovered;
        function setter(value) {
            if( value ) {
                this.current.recovered = value;
                if( callback ) {
                    callback();
                }
            }
        }
        this._requestValue(this.endpoint.recovered, setter.bind(this));
    }

    update(renderCb = undefined) {
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
            console.log("Request Failed: " + err);
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
        this.drawStats(differenceStats, this.spanDiffConfirmed, this.spanDiffDead, this.spanDiffRecovered, this.spanDiffActive);
    }

    drawStats(stats, spanConfirmed, spanDead, spanRecovered, spanActive) {
        let numberFormat = new NumberFormat(stats.confirmed);
        numberFormat.setPlaces(0);
        numberFormat.setSeparators(true, ".", ",");

        spanConfirmed.innerHTML = numberFormat.toFormatted();
        numberFormat.setNumber(stats.dead);
        spanDead.innerHTML = numberFormat.toFormatted();
        numberFormat.setNumber(stats.recovered);
        spanRecovered.innerHTML = numberFormat.toFormatted();
        numberFormat.setNumber(stats.getActive());
        spanActive.innerHTML = numberFormat.toFormatted();
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
