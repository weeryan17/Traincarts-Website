let createError = require('http-errors');
// @ts-ignore
const express = require('express');
// @ts-ignore
const path = require('path');
const logger = require('morgan');
const flash = require('connect-flash');
// @ts-ignore
const passport = require('passport');
let localStrategy = require("passport-local");
// @ts-ignore
let bcrypt = require('bcrypt');
let discordStrategy = require('passport-discord').Strategy;

let redisCache = require('express-redis-cache');

// @ts-ignore
let oauth_model = require('./utils/oauth');
let OAuthServer = require('express-oauth-server');
// @ts-ignore
global["oauth"] = new OAuthServer({
    model: oauth_model,
    useErrorHandler: true
});

passport.serializeUser(function(user : any, done : any) {
    done(null, user);
});

passport.deserializeUser(function(user : any, done : any) {
    done(null, user);
});

passport.use(new localStrategy(function (username: string, password: string, done: (error: any, result?: boolean | any, data?: object) => void) {

    // @ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            done(err);
            return;
        }

        connection.query("SELECT id, password, account_activated FROM traincarts_users WHERE username = ? OR email = ?", [username, username], function (error: any, results: any) {
            connection.release();
            if(err) {
                console.error(err);
                done(err);
                return;
            }

            if (results.length < 1) {
                done(null, false, {message: "Incorrect username"});
                return;
            }

            let user = results[0];

            bcrypt.compare(password, user.password, function (err: any, res: any) {
                if (err) {
                    console.error(err);
                    done(err);
                    return;
                }

                if (res) {
                    if (!user.account_activated) {
                        done(null, false, {message: "Account not activated"});
                        return;
                    }

                    done(null, { id: user.id });
                } else {
                    done(null, false, {message: 'Incorrect password'});
                }
            });
        });
    });
}));

passport.use(new discordStrategy(config.discord, function (accessToken: string, refreshToken: string, profile: object, cb: any) {
    console.log("discord");
    console.log(accessToken + " " + refreshToken + " " + profile);
    cb(null, {
        accessToken: accessToken,
        refreshToken: refreshToken,
        profile: profile
    });
}));

// @ts-ignore
global["passport"] = passport;

// @ts-ignore
const fs = require('fs');
//const formidableMiddleware = require('express-formidable');

// @ts-ignore
let app = express();

app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
// @ts-ignore
app.use('/public', express.static(path.join(global.appRoot, 'public')));

app.use(require('cookie-parser')());

let redis = require('redis');
// @ts-ignore
let redisClient = redis.createClient(global.config.redis);

redisClient.on("error", function (err: any) {
    console.error(err);
});

let cache = redisCache({
    client: redisClient
});

// @ts-ignore
global["cache"] = cache;

let session = require('express-session');
let redisStore = require('connect-redis')(session);

app.use(session({
    store: new redisStore({client: redisClient}),
    secret: config.session.secret
}));

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());
//app.use(formidableMiddleware());

app.use(function (req: any, res: any , next: any) {
    let messages: boolean | string[] = false;
    let flashMessages : string[] = req.flash('messages');
    let flashSuccess : string[] = req.flash('success');
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
    req.messages = messages;
    next()
});

readRoutesDir('.');

function readRoutesDir(parent: string) {
    // @ts-ignore
    let dir = path.join(global.appRoot, 'src/routes', parent);
    let items = fs.readdirSync(dir);


    for (let i: number = 0; i < items.length; i++) {
        let item: string = items[i];
        let split: string[] = item.split('.');
        let name: string = item.split('.')[0];
        let type: string = split[split.length - 1];

        if (type != 'js') {
            if (fs.lstatSync('./src/routes/' + parent + '/' + item).isDirectory()) {
                if (parent == '.') {
                    readRoutesDir(item);
                } else {
                    readRoutesDir(parent + '/' + item);
                }
                continue;
            } else {
                continue;
            }
        }

        if (name == 'index') {
            name = '';
        }

        let router_path = './routes/' + parent + '/' + item;

        console.log(router_path);

        let router = require(router_path);

        if (parent == '.') {
            app.use('/' + name, router);
        } else {
            app.use('/' + parent + '/' + name, router);
        }
    }
}

// error handler
app.use(function (req: any, res: any) {
    if (req.app.locals.message === undefined) {
        req.app.locals.message = "Page not found";
        req.app.locals.status = 404;
    }
    let error: boolean | any = false;
    if (req.app.locals.error !== undefined) {
        error = req.app.locals.error;
        if (req.app.locals.status === undefined) {
            req.app.locals.status = 500;
        }
    }

    // render the error page
    res.sendStatus(req.app.locals.status);
    res.render('error', {title: 'Error', messages: req.messages, error: error});
});

module.exports = app;