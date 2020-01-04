// @ts-ignore
let express = require('express');
// @ts-ignore
let router = express.Router();

// @ts-ignore
router.get('/', global.cache.route(), function(req: any, res: any) {
  res.render('index', { title: 'Traincarts', messages: req.messages });
});

module.exports = router;
