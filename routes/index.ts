// @ts-ignore
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req: any, res: any) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
