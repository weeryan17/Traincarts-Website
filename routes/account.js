var passport = global.passport;
var express = require('express');
var router = express.Router();
router.get("/", function (req, res) {
    res.send("WIP");
});
router.get("/login", function (req, res) {
    res.render('login', { title: 'Login' });
});
router.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));
router.post("/singup", function (req, res) {
    res.send("WIP");
});
router.get('/discord', passport.authenticate('discord'));
router.get('/discord/callback', function (req, res) {
    passport.authenticate('discord', function (err, user, info) {
        if (err) {
            console.error(err);
            res.redirect('/');
        }
        if (!user) {
            res.redirect("/account/discord");
        }
        console.log(req.session);
    });
});
module.exports = router;
//# sourceMappingURL=account.js.map