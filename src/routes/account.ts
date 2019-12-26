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
    var redirect: string = "/";
    if (req.query.redirect !== undefined) {
        redirect = req.query.redirect;
    }
    var error: boolean | string = false;
    var flash : string[] = req.flash('error');
    if (flash.length > 0) {
        error = flash[0];
    }
    res.render('login', { title: 'Login', error: error, messages: req.messages, redirect: redirect });
});

router.post("/login", function (req: any, res: any, next: any) {
    passport.authenticate('local', function (err: any, user: any, info: any) {
        if (err) {
            console.error(err);
            res.locals.error = err;
            res.locals.message = "Error while logging in";
            return next();
        }
        if (!user) {
            req.flash('error', info);
            return res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
        }
        req.login(user, function (err: any) {
            if (err) {
                console.error(err);
                res.locals.error = err;
                res.locals.message = "Error while logging in";
                return next();
            }
            req.flash('messages', "Logged in");
            return res.redirect(req.query.redirect);
        });
    })(req, res, next);
});

router.get('/activate', function (req : any, res : any, next: any) {
    var key : string | undefined = req.query.code;

    if (key === undefined) {
        res.redirect('/');
        return;
    }

    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.locals.error = err;
            res.locals.message = "Error while activating account";
            next();
            return;
        }

        connection.query("UPDATE traincarts_users SET account_activated = 1, activation_key = null WHERE activation_key = ?", [key], function (err : any, results : any) {
            connection.release();
            if(err) {
                console.error(err);
                res.locals.error = err;
                res.locals.message = "Error while activating account";
                next();
                return;
            }

            req.flash('messages', 'Account activated');
            res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
        });
    });
});

router.post("/signup", function (req: any, res: any, next: any) {
    var email : string = req.body.email;
    var username : string = req.body.username;
    var password : string = req.body.password;
    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.locals.error = err;
            res.locals.message = "Error while creating account";
            connection.release();
            next();
            return;
        }

        bcrypt.hash(password, 10, function (err : any, hash : string) {
            if (err) {
                console.error(err);
                res.locals.error = err;
                res.locals.message = "Error while creating account";
                connection.release();
                next();
                return;
            }

            var activationKey = randomString.generate(20);
            connection.query("SELECT sum(if(username = ?, 1, 0)) as 'usernames', sum(if(email = ?, 1, 0)) as 'emails' FROM traincarts_users", [username, email], function (err : any, results : any) {
                if (err) {
                    console.error(err);
                    res.locals.error = err;
                    res.locals.message = "Error while creating account";
                    connection.release();
                    next();
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
                    if (err) {
                        console.error(err);
                        res.locals.error = err;
                        res.locals.message = "Error while creating account";
                        connection.release();
                        next();
                        return;
                    }

                    var id: number = result.insertId;

                    utils.sendHtmlMailFromTemplate(email, "Traincarts Accounts", "Activate Account", "activate", {
                        user: username,
                        website: req.protocol + "://" + req.get('host'),
                        code: activationKey,
                        redirect: req.query.redirect
                    }, function (err : any) {
                        if (err) {
                            console.error(err);
                            connection.query("DELETE FROM traincarts_users WHERE id = ?", [id], function (mysql_err: any) {
                                connection.release();
                                if (mysql_err) {
                                    console.error(mysql_err);
                                    res.locals.error = mysql_err;
                                    res.locals.message = "Your account is in limbo";
                                    next();
                                    return;
                                }
                                res.locals.error = err;
                                res.locals.message = "Error while creating account";
                                next();
                                return;
                            });
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

module.exports = router;