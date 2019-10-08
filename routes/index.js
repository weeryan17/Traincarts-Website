var express = require('express');
var router = express.Router();
router.get('/', function (req, res) {
    var messages = false;
    var flashMessages = req.flash('messages');
    var flashSuccess = req.flash('success');
    if (flashMessages.length > 0) {
        messages = flashMessages;
    }
    if (flashSuccess.length > 0) {
        if (messages !== false) {
            messages.concat(flashSuccess);
        }
        else {
            messages = flashSuccess;
        }
    }
    res.render('index', { title: 'Express', messages: messages });
});
module.exports = router;
//# sourceMappingURL=index.js.map