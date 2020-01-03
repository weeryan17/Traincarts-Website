// @ts-ignore
let express = require('express');
let router = express.Router();

/* GET home page. */
router.get('/', function(req: any, res: any) {
  res.render('index', { title: 'Traincarts', messages: req.messages });
});

module.exports = router;
