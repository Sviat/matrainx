"use strict";

var INTERVAL = undefined;

function startClock() {
    initializeClock("divCounter", new Date());
}

function initializeClock(id, startTime) {
    function updateClock() {
        let t = getTimeSince(startTime);
        if (t.total <= 0) {
            clearInterval(INTERVAL);
            return;
        }

        setClock(id, t);
    }

    clearInterval(INTERVAL);
    updateClock();
    INTERVAL = setInterval(updateClock, 1000);
}

function initializeTimer(id, endTime) {
    function updateClock() {
        let t = getTimeRemaining(endTime);
        if (t.total <= 0) {
            clearInterval(INTERVAL);
            return;
        }

        setClock(id, t);
    }

    clearInterval(INTERVAL);
    updateClock();
    INTERVAL = setInterval(updateClock, 1000);
}

function getTimeSince(startTime) {
    return getTimeBetween(startTime, new Date());
}

function getTimeRemaining(endTime) {
    return getTimeBetween(new Date(), endTime);
}

function getTimeBetween(startTime, endTime) {
    let t = Date.parse(endTime) - Date.parse(startTime);
    let seconds = Math.floor((t / 1000) % 60);
    let minutes = Math.floor((t / 1000 / 60) % 60);
    let hours = Math.floor((t / (1000 * 60 * 60)) % 24);
    let days = Math.floor(t / (1000 * 60 * 60 * 24));
    return {
        'total': t,
        'days': days,
        'hours': hours,
        'minutes': minutes,
        'seconds': seconds
    };
}

function setClock(id, time) {
    let clock = document.getElementById(id);
    let daysSpan = clock.querySelector('.days');
    let hoursSpan = clock.querySelector('.hours');
    let minutesSpan = clock.querySelector('.minutes');
    let secondsSpan = clock.querySelector('.seconds');

    let t = time;
    daysSpan.innerHTML = ('0' + t.days).slice(-2);
    hoursSpan.innerHTML = ('0' + t.hours).slice(-2);
    minutesSpan.innerHTML = ('0' + t.minutes).slice(-2);
    secondsSpan.innerHTML = ('0' + t.seconds).slice(-2);
}