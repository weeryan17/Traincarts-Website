// @ts-ignore
var passport = global.passport;
var bcrypt = require('bcrypt');

// @ts-ignore
var express = require('express');
var router = express.Router();

router.get("/", function (req : any, res : any) {
    res.send("WIP");
});

router.get("/login", function (req: any, res: any) {
    res.render('login', { title: 'Login' });
});

router.post("/login", passport.authenticate('local', {
    successRedirect: '/',
    failureRedirect: '/login'
}));

router.post("/signup", function (req: any, res: any) {
    console.log(req.body);
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
                return;
            }

            connection.query("INSERT INTO users (username, email, password) VALUES (?, ?, ?)", [username, email, hash], function (err : any, results : any) {
                if (err) {
                    console.error(err);
                    res.redirect('/');
                    return;
                }

                res.redirect('/');
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


/*router.get('/discord/callback', passport.authenticate('discord', function (err : any, user : any, info : any) {
    console.log("auth");
    if (err) {
        console.error(err);
        //res.redirect('/');
    }
    if (!user) {
        //res.redirect("/account/discord");
    }

    //console.log(req.session);
}));*/

module.exports = router;