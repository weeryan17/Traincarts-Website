// @ts-ignore
var passport = global.passport;
var bcrypt = require('bcrypt');

var randomString = require('randomstring');

var utils = require('../utils/utils.js');

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
    res.render('login', { title: 'Login', error: error, messages: req.messages });
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

        connection.query("UPDATE traincarts_users SET account_activated = 1, activation_key = null WHERE activation_key = ?", [key], function (err : any, results : any) {
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
            req.flash('error', 'Failed to connect to database');
            res.redirect('/account/login#signup');
            return;
        }

        bcrypt.hash(password, 10, function (err : any, hash : string) {
            if (err) {
                req.flash('error', 'Error encrypting password');
                res.redirect('/account/login#signup');
                console.error(err);
                res.redirect('/');
                connection.release();
                return;
            }

            var activationKey = randomString.generate(20);
            connection.query("SELECT sum(if(username = ?, 1, 0)) as 'usernames', sum(if(email = ?, 1, 0)) as 'emails' FROM traincarts_users", [username, email], function (err : any, results : any) {
                if (err) {
                    console.error(err);
                    connection.release();
                    req.flash('error', 'Error running query - select');
                    res.redirect('/account/login#signup');
                    return;
                }

                var result : any = results[0];
                if (result.usernames > 0) {
                    req.flash('error', 'Username taken!');
                    res.redirect('/account/login#signup');
                    connection.release();
                    return;
                }

                if (result.emails > 0) {
                    req.flash('error', "Email in use!");
                    res.redirect('/account/login#signup');
                    connection.release();
                    return;
                }

                connection.query("INSERT INTO traincarts_users (username, email, activation_key, password) VALUES (?, ?, ?, ?)", [username, email, activationKey, hash], function (err : any, results : any) {
                    connection.release();
                    if (err) {
                        req.flash('error', "Error running query - insert");
                        res.redirect('/account/login#signup');
                        return;
                    }

                    utils.sendHtmlMailFromTemplate(email, "Traincarts Accounts", "Activate Account", "activate", {
                        user: username,
                        website: req.protocol + "://" + req.get('host'),
                        code: activationKey
                    }, function (err : any) {
                        if (err) {
                            console.log(err);
                            return;
                        }

                        req.flash('messages', 'Check your email in order to activate your account');
                        res.redirect('/');
                    });
                });
            });
        });
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

            connection.query("SELECT username FROM traincarts_users WHERE id = ?", [req.user.id], function (err : any, results : any[]) {
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

//region oauth
router.get('/app/:id', function (req : any, res : any) {
    
});
//endregion


module.exports = router;