var express = require('express');
var router = express.Router();

/* Exact implementation controlled by urlSearchParams (?type=frozen|static|clock)
    frozen      (&to=atTimestamp)
    static      (static now)
    clock       (dynamic now) [default]
 */
function renderClock(req, res, next) {
    res.render('display/clock', { layout: 'display/layout', displayType: 'clock', containerId: 'divClock' });
}

/* Exact implementation controlled by urlSearchParams (?type=countdown|timer|stopwatch)
    countdown   (&to=stopTimestamp)
    timer       (&duration=passMilliseconds)
    stopwatch   (from now on) [default]
 */
function renderCounter(req, res, next) {
    res.render('display/counter', { layout: 'display/layout', displayType: 'counter', containerId: 'divCounter' });
}

/* GET Display type Clock aliases*/
router.get('/', renderClock);
router.get('/frozen', renderClock);
router.get('/static', renderClock);
router.get('/clock', renderClock);

/* GET Display type Counter aliases */
router.get('/counter', renderCounter);
router.get('/countdown', renderCounter);
router.get('/timer', renderCounter);
router.get('/stopwatch', renderCounter);

module.exports = router;
