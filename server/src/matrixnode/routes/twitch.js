var express = require('express');
var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
    res.render('twitchCam', { title: 'Whore', userId: 'espa_gamerr', videoSrc: '7b94a675-eae0-4d8d-835b-04b0e70fe7fd' });
});

module.exports = router;
