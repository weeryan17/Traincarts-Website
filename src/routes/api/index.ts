// @ts-ignore
let express = require('express');
// @ts-ignore
let router = express.Router();

var graphqlHTTP = require('express-graphql');
// @ts-ignore
var graphql = require('../../utils/graphql');

// @ts-ignore
router.get('/user', global.oauth.authenticate(),
    function (err: any, req: any, res: any, next: any) {
        res.sendStatus(err.status);
        res.json({
            error: {
                code: err.status,
                message: err.message
            }
        });
    }, function (req: any, res: any, next: any) {
        console.log("access");
        let token = res.locals.oauth.token;
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                res.sendStatus(500);
                res.json({
                    error: {
                        code: 500,
                        message: err.message
                    }
                });
                return;
            }

            connection.query("SELECT user_id FROM oauth_tokens WHERE access_token = ?",
                [token.accessToken],
                function (err: any, results: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        res.sendStatus(500);
                        res.json({
                            error: {
                                code: 500,
                                message: err.message
                            }
                        });
                        return;
                    }

                    if (results.length == 0) {
                        res.sendStatus(500);
                        res.json({
                            error: {
                                code: 500,
                                message: "This shouldn't happen"
                            }
                        });
                        return;
                    }

                    req.app.locals.user_id = results[0].user_id;
                    next();
                });
        });
    }, graphqlHTTP({
        schema: graphql.schema,
        rootValue: graphql.resolver,
        graphiql: true,
    }));

// @ts-ignore
router.post('/user', global.oauth.authenticate(),
    function (err: any, req: any, res: any, next: any) {
        res.sendStatus(err.status);
        res.json({
            error: {
                code: err.status,
                message: err.message
            }
        });
    }, function (req: any, res: any, next: any) {
        console.log("access");
        let token = res.locals.oauth.token;
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                res.sendStatus(500);
                res.json({
                    error: {
                        code: 500,
                        message: err.message
                    }
                });
                return;
            }

            connection.query("SELECT user_id FROM oauth_tokens WHERE access_token = ?",
                [token.accessToken],
                function (err: any, results: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        res.sendStatus(500);
                        res.json({
                            error: {
                                code: 500,
                                message: err.message
                            }
                        });
                        return;
                    }

                    if (results.length == 0) {
                        res.sendStatus(500);
                        res.json({
                            error: {
                                code: 500,
                                message: "This shouldn't happen"
                            }
                        });
                        return;
                    }

                    req.app.locals.user_id = results[0].user_id;
                    next();
                });
        });
    }, graphqlHTTP({
        schema: graphql.schema,
        rootValue: graphql.resolver,
        graphiql: true,
    }));

module.exports = router;