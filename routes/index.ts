// @ts-ignore
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req: any, res: any) {
  res.render('index', { title: 'Traincarts', messages: req.messages });
});

module.exports = router;
