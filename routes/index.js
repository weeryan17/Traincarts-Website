var express = require('express');
var router = express.Router();
router.get('/', function (req, res) {
    res.render('index', { title: 'Traincarts', messages: req.messages });
});
module.exports = router;
//# sourceMappingURL=index.js.map