// @ts-ignore
var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req: any, res: any) {
  var messages: boolean | string[] = false;
  var flashMessages : string[] = req.flash('messages');
  var flashSuccess : string[] = req.flash('success');
  if (flashMessages.length > 0) {
    messages = flashMessages;
  }
  if (flashSuccess.length > 0) {
    if (messages !== false) {
      messages.concat(flashSuccess);
    } else {
      messages = flashSuccess;
    }
  }

  res.render('index', { title: 'Express', messages: messages });
});

module.exports = router;
