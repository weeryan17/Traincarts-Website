// @ts-ignore
var passport = global.passport;
var bcrypt = require('bcrypt');

var randomString = require('randomstring');

var utils = require('../utils.js');

// @ts-ignore
var express = require('express');
var router = express.Router();

router.get("/", function (req : any, res : any) {
    res.send("WIP");
});

router.get("/login", function (req: any, res: any) {
    var error: boolean | string = false;
    var flash : string[] = req.flash('error');
    if (flash.length > 0) {
        error = flash[0];
    }
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
    res.render('login', { title: 'Login', error: error, messages: messages });
});

router.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/account/login',
    failureFlash: true,
    successFlash: 'Logged in'
}));

router.get('/activate', function (req : any, res : any) {
    var key : string | undefined = req.query.code;

    if (key === undefined) {
        res.redirect('/');
        return;
    }

    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.redirect('/');
            return;
        }

        connection.query("UPDATE users SET account_activated = 1, activation_key = null WHERE activation_key = ?", [key], function (err : any, results : any) {
            connection.release();
            if(err) {
                console.error(err);
                res.redirect('/');
                return;
            }

            req.flash('messages', 'Account activated');
            res.redirect('/account/login');
        });
    });
});

router.post("/signup", function (req: any, res: any) {
    var email : string = req.body.email;
    var username : string = req.body.username;
    var password : string = req.body.password;
    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.redirect('/');
            return;
        }

        bcrypt.hash(password, 10, function (err : any, hash : string) {
            if (err) {
                console.error(err);
                res.redirect('/');
                connection.release();
                return;
            }

            var activationKey = randomString.generate(20);
            //TODO check if username/email already exists
            connection.query("INSERT INTO users (username, email, activation_key, password) VALUES (?, ?, ?, ?)", [username, email, activationKey, hash], function (err : any, results : any) {
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
                }, function (err : any) {
                    if (err) {
                        console.log(err);
                    }

                    req.flash('messages', 'Check your email in order to activate your account');
                    res.redirect('/');
                });
            });
        })
    });
});

router.get('/discord', passport.authenticate('discord', {scope: "identify"}));

router.get('/discord/callback', function(req : any, res : any, next : any) {
    console.log("Discord - router");
    passport.authenticate('discord', function (err : any, user : any, info : any) {
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
        //TODO insert user discord details
        console.log(req.user.id);
    })(req, res, next);
});

router.get("/info", function (req : any, res : any) {
    if (req.user !== undefined) {
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                res.json({
                    error: true
                });
                return;
            }

            connection.query("SELECT username FROM users WHERE id = ?", [req.user.id], function (err : any, results : any[]) {
                connection.release();
                if (err) {
                    console.error(err);
                    res.json({
                        error: true
                    });
                    return
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
    } else {
        res.json({
            login: false
        })
    }
});

router.get('/logout', function (req : any, res : any) {
    req.logout();
    req.flash('messages', 'Logged out');
    res.redirect('/');
});


module.exports = router;