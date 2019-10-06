var passport = global.passport;
var bcrypt = require('bcrypt');
var utils = require('../utils.js');
var express = require('express');
var router = express.Router();
router.get("/", function (req, res) {
    res.send("WIP");
});
router.get("/login", function (req, res) {
    var error = false;
    var flash = req.flash('error');
    if (flash.length > 0) {
        error = flash[0];
    }
    res.render('login', { title: 'Login', error: error });
});
router.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: true
}));
router.post("/signup", function (req, res) {
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
                connection.release();
                return;
            }
            connection.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hash], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    res.redirect('/');
                    return;
                }
                utils.sendHtmlMailFromTemplate(email, "Traincarts Accounts", "Activate Account", "activate", {
                    user: username,
                    website: req.protocol + "://" + req.get('host'),
                    code: "WIP"
                }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    res.redirect('/');
                });
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
router.get("/info", function (req, res) {
    if (req.user !== undefined) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                res.json({
                    error: true
                });
                return;
            }
            connection.query("SELECT username FROM users WHERE id = ?", [req.user.id], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    res.json({
                        error: true
                    });
                    return;
                }
                if (results.length !== 1) {
                    res.json({
                        error: true
                    });
                    return;
                }
                var user = results[0];
                res.json({
                    login: true,
                    id: req.user.id,
                    name: user.username
                });
            });
        });
    }
    else {
        res.json({
            login: false
        });
    }
});
router.get('/logout', function (req, res) {
    req.logout();
    res.redirect('/');
});
module.exports = router;
//# sourceMappingURL=account.js.map