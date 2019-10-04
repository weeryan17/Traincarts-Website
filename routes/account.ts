// @ts-ignore
var passport = global.passport;

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

router.post("/singup", function (req: any, res: any) {
    res.send("WIP");
});

router.get('/discord', passport.authenticate('discord'));
router.get('/discord/callback', function(req : any, res : any) {
    passport.authenticate('discord', function (err : any, user : any, info : any) {
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