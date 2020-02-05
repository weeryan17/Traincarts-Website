// @ts-ignore
let express = require('express');
// @ts-ignore
let router = express.Router();

// @ts-ignore
let oauth_model = require('../../utils/oauth');

// @ts-ignore
router.get('/authorize', function (req: any, res: any, next: any) {
    if (req.user === undefined) {
        req.flash('messages', 'Please login');
        let redirect_uri: string = req.protocol + '://' + req.get('host') + req.originalUrl;
        let decoded = decodeURIComponent(redirect_uri);
        res.redirect('/account/login?redirect=' + encodeURIComponent(decoded));
        return;
    }
    let client_id = req.query.client_id;
    let redirect = req.query.redirect_uri;

    get_client_from_id(client_id, client => {
        let uris = client.redirectUris;
        if (!uris.includes(redirect)) {
            res.redirect("/");
            return;
        }

        if (client.type === "built_in") {
            //generate code
            oauth_model.generateAuthorizationCode({id: client_id}, req.user, null, function (err: any, code: string) {
                let date = new Date();
                date.setDate(date.getDate() + 1);
                oauth_model.saveAuthorizationCode({authorizationCode: code, expiresAt: date.toISOString().slice(0, 19).replace('T', ' '), redirectUri: redirect}, {id: client_id}, {id: req.user.id}, function () {
                    res.redirect(redirect + '?code=' + code);
                    return;
                });
            });
            return;
        }

        res.render("api/application", {
            title: "Approve application",
            messages: req.messages,
            client_id: client_id,
            redirect: redirect
        });
    });
});

// @ts-ignore
router.post('/token', global.oauth.token());

router.get("/", function (req: any, res: any) {
    res.send("wip")
});

function get_client_from_id(clientId: string, callback: (client: any) => void) {
    // @ts-ignore
    let builtInClients: { id: string, callback: string, secret: string }[] = global.config.site_oauth_secrets;
    for (let i = 0; i < builtInClients.length; i++) {
        let builtInClient: { id: string, callback: string, secret: string } = builtInClients[i];
        if (builtInClient.id === clientId) {
            let uris = [builtInClient.callback];
            callback({
                "id": clientId,
                "redirectUris": uris,
                "grants": [
                    "refresh_token",
                    "authorization_code"
                ],
                "type": "built_in"
            });
            return;
        }
    }

    // @ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            callback(null);
            return;
        }

        connection.query("SELECT * FROM oauth_clients WHERE client_id = ?",
            [clientId],
            function (err: any, results: any) {
                if (err) {
                    connection.release();
                    console.error(err);
                    callback(null);
                    return;
                }

                if (results.length == 0) {
                    connection.release();
                    callback(null);
                    return;
                }

                connection.query("SELECT uri FROM oauth_uris WHERE client_id = ?",
                    [clientId],
                    function (err: any, results: any) {
                        connection.release();
                        if (err) {
                            console.error(err);
                            callback(null);
                            return;
                        }

                        let uris: string[] = [];
                        for (let i = 0; i < results.length; i++) {
                            uris.push(results[i].uri);
                        }

                        let client = {
                            "id": clientId,
                            "redirectUris": uris,
                            "grants": [
                                "refresh_token",
                                "authorization_code"
                            ],
                            "type": "third_party"
                        };

                        callback(client);
                    });
            });
    });
}

module.exports = router;