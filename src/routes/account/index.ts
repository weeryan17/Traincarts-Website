// @ts-ignore
var passport = global.passport;
var bcrypt = require('bcrypt');

var randomString = require('randomstring');
var twoFactor = require('node-2fa');

var utils = require('../../utils/utils.js');

// @ts-ignore
var express = require('express');
var router = express.Router();

router.get("/", function (req: any, res: any, next: any) {
    if (req.user === undefined) {
        res.redirect('/account/login');
        return;
    }
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error getting account info";
            next();
            return;
        }
        connection.query("SELECT tc.id, tc.username, tc.email, twofa.user_id as 'twofa' FROM traincarts_users as tc LEFT OUTER JOIN user_twofa as twofa ON tc.id = twofa.user_id WHERE tc.id = ?",
            [req.user.id],
            function (err: any, results: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error getting account info";
                    next();
                    return;
                }
                var user_info: { id: number, username: string, email: string, twofa: number } = results[0];
                getCodes(req, res, next, req.user.id, function (backup_codes) {
                    res.render('account', {
                        title: 'Account',
                        messages: req.messages,
                        user_info: user_info,
                        backup_codes: backup_codes
                    });
                });
            });
    });
});

router.get("/login", function (req: any, res: any) {
    var redirect: string = "/";
    if (req.query.redirect !== undefined) {
        redirect = req.query.redirect;
    }
    var error: boolean | string = false;
    var flash: string[] = req.flash('error');
    if (flash.length > 0) {
        error = flash[0];
    }
    res.render('login', {title: 'Login', error: error, messages: req.messages, redirect: redirect});
});

router.post("/login", function (req: any, res: any, next: any) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while logging in account";
            next();
            return;
        }
        connection.query("SELECT id FROM traincarts_users WHERE username = ? OR email = ?", [req.body.username, req.body.username], function (err: any, results: any) {
            if (err) {
                connection.release();
                console.error(err);
                req.app.locals.error = err;
                req.app.locals.message = "Error while logging in account";
                next();
                return;
            }

            if (results.length == 0) {
                req.flash('error', "Incorrect username/email");
                res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                return;
            }

            var id = results[0].id;

            connection.query("SELECT twofa_secret FROM user_twofa WHERE user_id = ?", [id], function (err: any, results: any) {
                if (err) {
                    connection.release();
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while logging in account";
                    next();
                    return;
                }

                if (results.length == 0) {
                    authenticate(req, res, next);
                    return;
                }

                if (req.body.twofa_code === undefined) {
                    var error: boolean | string = false;
                    var flash: string[] = req.flash('error');
                    if (flash.length > 0) {
                        error = flash[0];
                    }
                    res.render('twofa', {
                        title: '2fa',
                        messages: req.messages,
                        redirect: req.query.redirect,
                        username: req.body.username,
                        password: req.body.password,
                        error: error
                    });
                    return;
                }
                if (twoFactor.verifyToken(results[0].twofa_secret, req.body.twofa_code, 1) === 0) {
                    connection.release();
                    authenticate(req, res, next);
                } else {
                    getCodes(req, res, next, id, function (backup_codes) {
                        var is_backup: boolean = false;
                        var backup: string = "";
                        for (var i = 0; i < backup_codes.length; i++) {
                            var backup_code: { code: string, used: boolean } = backup_codes[i];
                            if (!backup_code.used) {
                                if (backup_code.code == req.body.twofa_code) {
                                    is_backup = true;
                                    backup = req.body.twofa_code;
                                }
                            }
                        }
                        if (!is_backup) {
                            req.flash('error', "Invalid 2fa code");
                            res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                            return;
                        }

                        connection.query("UPDATE user_backup_codes SET used = 1 WHERE user_id = ? AND backup_code = ?",
                            [id, backup],
                            function (err: any) {
                                connection.release();
                                if (err) {
                                    console.error(err);
                                    req.app.locals.error = err;
                                    req.app.locals.message = "Error while logging in account";
                                    next();
                                    return;
                                }
                                authenticate(req, res, next);
                            });
                    });
                }
            });
        });
    });
});

function authenticate(req: any, res: any, next: any) {
    passport.authenticate('local', function (err: any, user: any, info: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while logging in";
            return next();
        }
        if (!user) {
            req.flash('error', info.message);
            return res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
        }
        req.login(user, function (err: any) {
            if (err) {
                console.error(err);
                req.app.locals.error = err;
                req.app.locals.message = "Error while logging in";
                return next();
            }
            req.flash('messages', "Logged in");
            return res.redirect(req.query.redirect);
        });
    })(req, res, next);
}

router.get('/activate', function (req: any, res: any, next: any) {
    var key: string | undefined = req.query.code;

    if (key === undefined) {
        res.redirect('/');
        return;
    }

    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while activating account";
            next();
            return;
        }

        connection.query("UPDATE traincarts_users SET account_activated = 1, activation_key = null WHERE activation_key = ?", [key], function (err: any, results: any) {
            connection.release();
            if (err) {
                console.error(err);
                req.app.locals.error = err;
                req.app.locals.message = "Error while activating account";
                next();
                return;
            }

            req.flash('messages', 'Account activated');
            res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
        });
    });
});

router.get('/forgot', function (req: any, res: any, next: any) {
    var error: boolean | string = false;
    var flash: string[] = req.flash('error');
    if (flash.length > 0) {
        error = flash[0];
    }
    var email = "";
    if (req.query.email !== undefined) {
        email = req.query.email;
    }
    var code = false;
    if (req.query.code !== undefined) {
        code = req.query.code;
    }
    res.render('forgot', {
        title: 'Forgot password',
        error: error,
        messages: req.messages,
        redirect: req.query.redirect,
        email: email,
        code: code
    });
});

router.post('/forgot', function (req: any, res: any, next: any) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while resetting password";
            next();
            return;
        }

        connection.query("SELECT id, recovery_key FROM traincarts_users WHERE email=?",
            [req.body.email],
            function (err: any, results: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while resetting password";
                    next();
                    return;
                }

                if (results.length == 0) {
                    req.flash('error', 'Why?');
                    res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                    return;
                }

                var id = results[0].id;
                if (results[0].recovery_key != req.body.code) {
                    req.flash('error', 'Invalid recovery key');
                    res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                    return;
                }

                res.render('password', {
                    title: "Reset password",
                    redirect: req.query.redirect,
                    id: id,
                    messages: req.messages,
                    code: req.body.code
                });
            });
    });
});

router.put('/forgot', function (req: any, res: any, next: any) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.json({error: err});
            return;
        }

        connection.query("SELECT id, username FROM traincarts_users WHERE email=?",
            [req.body.email],
            function (err: any, results: any) {
                if (err) {
                    connection.release();
                    console.error(err);
                    res.json({error: err});
                    return;
                }

                if (results.length == 0) {
                    res.json({error: "Email not found"});
                    return;
                }

                var id: number = results[0].id;
                var username: string = results[0].username;
                var code = randomString.generate(20);
                connection.query("UPDATE traincarts_users SET recovery_key = ? WHERE id = ?",
                    [code, id],
                    function (err: any) {
                        connection.release();
                        if (err) {
                            console.error(err);
                            res.json({error: err});
                            return;
                        }
                        utils.sendHtmlMailFromTemplate(req.body.email, "Traincarts Account", "Password reset", 'forgot', {
                            code: code,
                            email: req.body.email,
                            redirect: req.body.redirect,
                            host: req.protocol + "://" + req.get('host'),
                            username: username
                        }, function (err: any) {
                            if (err) {
                                console.error(err);
                                res.json({error: err});
                                return;
                            }
                            res.json({error: null});
                        });
                    });
            })
    });
});

router.post('/password', function (req: any, res: any, next: any) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while resetting password";
            next();
            return;
        }

        connection.query("SELECT recovery_key FROM traincarts_users WHERE id=?",
            [req.body.id],
            function (err: any, results: any) {
                if (err) {
                    connection.release();
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while activating account";
                    next();
                    return;
                }

                if (results.length == 0) {
                    req.flash('error', 'Why?');
                    res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                    return;
                }

                if (results[0].recovery_key != req.body.key) {
                    req.flash('error', 'Invalid recovery key');
                    res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                    return;
                }

                bcrypt.hash(req.body.password, 10, function (err: any, hash: string) {
                    if (err) {
                        console.error(err);
                        req.app.locals.error = err;
                        req.app.locals.message = "Error while resetting password";
                        next();
                        return;
                    }

                    connection.query("UPDATE traincarts_users SET password = ?, recovery_key = null WHERE id = ?",
                        [hash, req.body.id],
                        function (err: any) {
                            connection.release();
                            if (err) {
                                console.error(err);
                                req.app.locals.error = err;
                                req.app.locals.message = "Error while resetting password";
                                next();
                                return;
                            }

                            req.flash('messages', "Password changed");
                            res.redirect('/account/login?redirect=' + encodeURI(req.query.redirect));
                        });
                });
            });
    });
});

router.post("/signup", function (req: any, res: any, next: any) {
    var email: string = req.body.email;
    var username: string = req.body.username;
    var password: string = req.body.password;
    //@ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while creating account";
            connection.release();
            next();
            return;
        }

        bcrypt.hash(password, 10, function (err: any, hash: string) {
            if (err) {
                console.error(err);
                req.app.locals.error = err;
                req.app.locals.message = "Error while creating account";
                connection.release();
                next();
                return;
            }

            var activationKey = randomString.generate(20);
            connection.query("SELECT sum(if(username = ?, 1, 0)) as 'usernames', sum(if(email = ?, 1, 0)) as 'emails' FROM traincarts_users", [username, email], function (err: any, results: any) {
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while creating account";
                    connection.release();
                    next();
                    return;
                }

                var result: any = results[0];
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

                connection.query("INSERT INTO traincarts_users (username, email, activation_key, password) VALUES (?, ?, ?, ?)", [username, email, activationKey, hash], function (err: any, results: any) {
                    if (err) {
                        console.error(err);
                        req.app.locals.error = err;
                        req.app.locals.message = "Error while creating account";
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
                    }, function (err: any) {
                        if (err) {
                            console.error(err);
                            connection.query("DELETE FROM traincarts_users WHERE id = ?", [id], function (mysql_err: any) {
                                connection.release();
                                if (mysql_err) {
                                    console.error(mysql_err);
                                    req.app.locals.error = mysql_err;
                                    req.app.locals.message = "Your account is in limbo";
                                    next();
                                    return;
                                }
                                req.app.locals.error = err;
                                req.app.locals.message = "Error while creating account";
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

router.get('/twofa', function (req: any, res: any, next: any) {
    if (req.user === undefined) {
        res.redirect('/account/login');
        return;
    }
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while creating 2fa";
            next();
            return;
        }
        connection.query("SELECT tc.id, tc.username, tc.email, twofa.user_id as 'twofa' FROM traincarts_users as tc LEFT OUTER JOIN user_twofa as twofa ON tc.id = twofa.user_id WHERE tc.id = ?",
            [req.user.id],
            function (err: any, results: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while creating 2fa";
                    next();
                    return;
                }

                var user_info: { id: number, username: string, email: string, twofa: number } = results[0];
                if (user_info.twofa !== null) {
                    res.json({error: "2fa already enabled"});
                    return;
                }
                var account_name: string = user_info.username + " (" + user_info.email + ")";
                res.json(twoFactor.generateSecret({name: "Traincarts website", account: account_name}));
            });
    });
});

router.delete('/twofa', function (req: any, res: any, next: any) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            res.json({error: err});
            return;
        }

        connection.query("SELECT twofa_secret FROM user_twofa WHERE user_id = ?",
            [req.user.id],
            function (err: any, results: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    res.json({error: err});
                    return;
                }

                if (results.length == 0) {
                    res.json({error: "Cannot remove 2fa if your not using it"});
                    return;
                }
                var twofa = twoFactor.verifyToken(results[0].twofa_secret, req.body.code, 1);
                if (twofa != null && twofa.delta !== 0) {
                    getCodes(req, res, next, req.user.id, function (backup_codes) {
                        var is_backup: boolean = false;
                        var backup: string = "";
                        for (var i = 0; i < backup_codes.length; i++) {
                            var backup_code: { code: string, used: boolean } = backup_codes[i];
                            if (!backup_code.used) {
                                if (backup_code.code == req.body.twofa_code) {
                                    is_backup = true;
                                    backup = req.body.twofa_code;
                                }
                            }
                        }
                        if (!is_backup) {
                            res.json({error: "Invalid code"});
                            return;
                        }

                        delete_twofa(req.user.id, function (success, message) {
                            if(!success) {
                                res.json({error: message});
                            } else {
                                res.json({error: null});
                            }
                        });
                    });
                    return;
                }
                delete_twofa(req.user.id, function (success, message) {
                    if(!success) {
                        res.json({error: message});
                    } else {
                        res.json({error: null});
                    }
                });
            });
    });
});

function delete_twofa(user_id: number, callback: (success: boolean, message: string) => void) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            callback(false, err);
            return;
        }
        connection.query("DELETE FROM user_twofa WHERE user_id = ?", [user_id], function (err: any) {
            if (err) {
                connection.release();
                console.error(err);
                callback(false, err);
                return;
            }

            connection.query("DELETE FROM user_backup_codes WHERE user_id = ?", [user_id], function (err: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(false, err);
                    return;
                }

                callback(true, null);
            })
        });
    });
}

router.get('/codes', function (req: any, res: any, next: any) {
    getCodes(req, res, next, req.user.id, function (backup_codes) {
        var codes_str: string = "";
        for (var i = 0; i < backup_codes.length; i++) {
            var backup_code: { code: string, used: boolean } = backup_codes[i];
            if (!backup_code.used) {
                codes_str += backup_codes[i].code + "\n";
            }
        }
        res.set({"Content-Disposition": "attachment; filename=\"Traincarts-codes.txt\""});
        res.send(codes_str);
    });
});

function getCodes(req: any, res: any, next: any, user_id: number, callback: (backup_codes: { code: string, used: boolean }[]) => void) {
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error while getting codes";
            next();
            return;
        }

        connection.query("SELECT backup_code, used FROM user_backup_codes WHERE user_id = ?",
            [user_id],
            function (err: any, results: any) {
                connection.release();
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error while getting codes";
                    next();
                    return;
                }
                var backup_codes: { code: string, used: boolean }[] = [];
                for (var i = 0; i < results.length; i++) {
                    var result: { backup_code: string, used: boolean } = results[i];

                    backup_codes.push({code: result.backup_code, used: result.used});
                }
                callback(backup_codes);
            });
    });
}

router.get('/discord', passport.authenticate('discord', {scope: "identify"}));

router.get('/discord/callback', function (req: any, res: any, next: any) {
    console.log("Discord - router");
    passport.authenticate('discord', function (err: any, user: any, info: any) {
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

router.get("/info", function (req: any, res: any) {
    if (req.user !== undefined) {
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                res.json({
                    error: true
                });
                return;
            }

            connection.query("SELECT username FROM traincarts_users WHERE id = ?", [req.user.id], function (err: any, results: any[]) {
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

router.get('/logout', function (req: any, res: any) {
    req.logout();
    req.flash('messages', 'Logged out');
    res.redirect('/');
});

module.exports = router;