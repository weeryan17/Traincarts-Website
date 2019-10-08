var passport = global.passport;
var bcrypt = require('bcrypt');
var randomString = require('randomstring');
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
    res.render('login', { title: 'Login', error: error, messages: messages });
});
router.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: true,
    successFlash: 'Logged in'
}));
router.get('/activate', function (req, res) {
    var key = req.query.code;
    if (key === undefined) {
        res.redirect('/');
        return;
    }
    global.pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            res.redirect('/');
            return;
        }
        connection.query("UPDATE users SET account_activated = 1, activation_key = null WHERE activation_key = ?", [key], function (err, results) {
            connection.release();
            if (err) {
                console.error(err);
                res.redirect('/');
                return;
            }
            req.flash('messages', 'Account activated');
            res.redirect('/account/login');
        });
    });
});
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
            var activationKey = randomString.generate(20);
            connection.query("INSERT INTO users (username, email, activation_key, password) VALUES (?, ?, ?, ?)", [username, email, activationKey, hash], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    res.redirect('/');
                    return;
                }
                utils.sendHtmlMailFromTemplate(email, "Traincarts Accounts", "Activate Account", "activate", {
                    user: username,
                    website: req.protocol + "://" + req.get('host'),
                    code: activationKey
                }, function (err) {
                    if (err) {
                        console.log(err);
                    }
                    req.flash('messages', 'Check your email in order to activate your account');
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
    req.flash('messages', 'Logged out');
    res.redirect('/');
});
module.exports = router;
//# sourceMappingURL=account.js.map