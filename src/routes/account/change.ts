var twoFactor = require('node-2fa');
var bcrypt = require('bcrypt');
var utils = require('../../utils/utils.js');
// @ts-ignore
var express = require('express');
var router = express.Router();

router.post('/twofa', function (req: any, res: any, next: any) {
    var delta: number | null = twoFactor.verifyToken(req.body.secret, req.body.code).delta;
    if (delta !== 0) {
        req.flash('messages', 'Invalid code');
        res.redirect('/account');
        return;
    }
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error enabling 2fa";
            next();
            return;
        }

        connection.query("INSERT INTO user_twofa (user_id, twofa_secret) VALUES (?, ?)",
            [req.user.id, req.body.secret],
            function (err: any) {
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error enabling 2fa";
                    next();
                    return;
                }

                for (var i = 0; i < 12; i++) {
                    var code: string = "";
                    for (var i2 = 0; i2 < 6; i2++) {
                        code += getRandomInt(0, 10);
                    }
                    connection.query("INSERT INTO user_backup_codes (user_id, backup_code) VALUES (?, ?)",
                        [req.user.id, code],
                        function (err: any) {
                            if (err) {
                                console.error(err);
                            }
                        });
                }

                req.flash('messages', '2fa enabled');
                res.redirect('/account');
            });
    });
});

router.post('/password', function (req: any, res: any, next: any) {
    var old_password: string = req.body.password_old;
    var new_password: string = req.body.password;

    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            req.app.locals.error = err;
            req.app.locals.message = "Error changing password";
            next();
            return;
        }

        connection.query("SELECT username, email, password FROM traincarts_users WHERE id = ?",
            [req.user.id],
            function (err: any, results: any) {
                if (err) {
                    console.error(err);
                    req.app.locals.error = err;
                    req.app.locals.message = "Error changing password";
                    next();
                    return;
                }

                var user = results[0];
                // noinspection JSFunctionExpressionToArrowFunction,TypescriptExplicitMemberType
                bcrypt.compare(old_password, user.password, function (err: any, bcrypt_res: any) {
                    if (err) {
                        console.error(err);
                        req.app.locals.error = err;
                        req.app.locals.message = "Error changing password";
                        next();
                        return;
                    }

                    if (bcrypt_res) {
                        bcrypt.hash(new_password, 10, function (err: any, hash: string) {
                            if (err) {
                                console.error(err);
                                req.app.locals.error = err;
                                req.app.locals.message = "Error while creating account";
                                connection.release();
                                next();
                                return;
                            }

                            connection.query("UPDATE traincarts_users SET password = ? WHERE id = ?",
                                [hash, req.user.id],
                                function (err: any) {
                                    if (err) {
                                        console.error(err);
                                        req.app.locals.error = err;
                                        req.app.locals.message = "Error changing password";
                                        next();
                                        return;
                                    }

                                    utils.sendHtmlMailFromTemplate(user.email, "Traincarts Account", "Password changed", "password", {username: user.username}, function (err: any) {
                                        if (err) {
                                            console.error(err);
                                        }

                                        req.flash('messages', 'Password changed');
                                        res.redirect('/account');
                                    });
                                });
                        });
                    } else {
                        req.flash('messages', "Incorrect password!");
                        res.redirect('/account');
                    }
                });
            });
    });
});

function getRandomInt(min: number, max: number) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
}

module.exports = router;