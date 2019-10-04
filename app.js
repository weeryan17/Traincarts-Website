var createError = require('http-errors');
var express = require('express');
var path = require('path');
var logger = require('morgan');
var passport = require('passport');
var localStrategy = require("passport-local");
var bcrypt = require('bcrypt');
var discordStrategy = require('passport-discord').Strategy;
passport.serializeUser(function (user, done) {
    done(null, user);
});
passport.deserializeUser(function (user, done) {
    done(null, user);
});
passport.use(new localStrategy(function (username, password, done) {
    global.pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            done(err);
            return;
        }
        connection.query("SELECT id, password FROM users WHERE username = ? OR email = ?", [username, username], function (error, results) {
            if (results.length < 1) {
                done(null, false, { message: "Incorrect username." });
                return;
            }
            var user = results[0];
            bcrypt.compare(password, user.password, function (err, res) {
                if (err) {
                    console.error(err);
                    done(err);
                    return;
                }
                if (res) {
                    done(null, { id: user.id });
                }
                else {
                    done(null, false, { message: 'Incorrect password.' });
                }
            });
            connection.release();
        });
    });
}));
passport.use(new discordStrategy(config.discord, function (accessToken, refreshToken, profile, cb) {
    console.log("discord");
    console.log(accessToken + " " + refreshToken + " " + profile);
    cb(null, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
    });
}));
global["passport"] = passport;
var fs = require('fs');
var app = express();
app.set('view engine', 'ejs');
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use('/public', express.static(path.join(global.appRoot, 'public')));
app.use(require('cookie-parser')());
app.use(require('body-parser').urlencoded({ extended: true }));
app.use(require('express-session')({ secret: 'thing' }));
app.use(passport.initialize());
app.use(passport.session());
readRoutesDir('.');
function readRoutesDir(parent) {
    var dir = path.join(global.appRoot, 'routes', parent);
    var items = fs.readdirSync(dir);
    for (var i = 0; i < items.length; i++) {
        var item = items[i];
        var split = item.split('.');
        var name_1 = item.split('.')[0];
        var type = split[split.length - 1];
        if (type != 'js') {
            if (fs.lstatSync('./routes/' + parent + '/' + item).isDirectory()) {
                if (parent == '.') {
                    readRoutesDir(item);
                }
                else {
                    readRoutesDir(parent + '/' + item);
                }
                continue;
            }
            else {
                continue;
            }
        }
        if (name_1 == 'index') {
            name_1 = '';
        }
        var router_path = './routes/' + parent + '/' + item;
        console.log(router_path);
        var router = require(router_path);
        if (parent == '.') {
            app.use('/' + name_1, router);
        }
        else {
            app.use('/' + parent + '/' + name_1, router);
        }
    }
}
app.use(function (req, res) {
    res.locals.message = "Page not found";
    res.locals.status = 404;
    res.status(404);
    res.render('error', { title: 'Error' });
});
module.exports = app;
//# sourceMappingURL=app.js.map