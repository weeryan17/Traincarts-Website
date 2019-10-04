var passport = global.passport;
var bcrypt = require('bcrypt');
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
router.post("/signup", function (req, res) {
    console.log(req.body);
    var email = req.body.email;
    var username = req.body.username;
    var password = req.body.password;
    global.pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            res.redirect('/');
            return;
        }
        bcrypt.hash(password, 10, function (err, hash) {
            if (err) {
                console.error(err);
                res.redirect('/');
                return;
            }
            connection.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hash], function (err, results) {
                if (err) {
                    console.error(err);
                    res.redirect('/');
                    return;
                }
                res.redirect('/');
            });
        });
    });
});
router.get('/discord', passport.authenticate('discord', { scope: "identify" }));
router.get('/discord/callback', function (req, res, next) {
    console.log("Discord - router");
    passport.authenticate('discord', function (err, user, info) {
        if (err) {
            console.error(err);
            res.redirect('/');
            return;
        }
        if (!user) {
            res.redirect("/account/discord");
            return;
        }
        if (!req.user) {
            res.redirect('/account/login');
            return;
        }
        console.log(req.user.id);
    })(req, res, next);
});
module.exports = router;
//# sourceMappingURL=account.js.map