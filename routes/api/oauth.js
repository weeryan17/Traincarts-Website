var express = require('express');
var oauth_model = require('../../utils/oauth');
var OAuthServer = require('express-oauth-server');
var router = express.Router();
router.oauth = new OAuthServer({
    model: oauth_model
});
router.get('/authorize', function (req, res, next) {
    if (!req.user) {
        req.flash('messages', 'Please login');
        res.redirect('/account/login');
        return;
    }
    var client_id = req.query.client_id;
    var redirect = req.query.redirect_uri;
    get_client_from_id(client_id, function (client) {
        var uris = client.redirectUris;
        if (!uris.includes(redirect)) {
            res.redirect("/");
            return;
        }
        if (client.type === "built_in") {
            oauth_model.generateAuthorizationCode({ id: client_id }, req.user, null, function (code) {
                var date = new Date();
                date.setDate(date.getDate() + 1);
                oauth_model.saveAuthorizationCode({ authorizationCode: code, expiresAt: date.toISOString().slice(0, 19).replace('T', ' '), redirectUri: redirect }, { id: client_id }, { id: req.user.id }, function () {
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
router.get("/", function (req, res) {
    res.send("wip");
});
function get_client_from_id(clientId, callback) {
    var builtInClients = global.config.site_oauth_secrets;
    for (var i = 0; i < builtInClients.length; i++) {
        var builtInClient = builtInClients[i];
        if (builtInClient.id === clientId) {
            var uris = [builtInClient.callback];
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
    global.pool.getConnection(function (err, connection) {
        if (err) {
            console.error(err);
            callback(null);
            return;
        }
        connection.query("SELECT * FROM oauth_clients WHERE client_id = ?", [clientId], function (err, results) {
            if (err) {
                connection.release();
                console.error(err);
                callback(null);
                return;
            }
            if (results.length == 0) {
                callback(null);
                return;
            }
            connection.query("SELECT uri FROM oauth_uris WHERE client_id = ?", [clientId], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(null);
                    return;
                }
                var uris = [];
                for (var i_1 = 0; i_1 < results.length; i_1++) {
                    uris.push(results[i_1].uri);
                }
                var client = {
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
//# sourceMappingURL=oauth.js.map