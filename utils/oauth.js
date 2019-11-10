var model = {
    getAccessToken: function (token, callback) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }
            connection.query("SELECT client_id, user_id, access_expire FROM oauth_tokens WHERE access_token = ?", [token], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(null);
                    return;
                }
                if (results.length !== 1) {
                    callback(null);
                    return;
                }
                var result = results[0];
                var return_token = {
                    "accessToken": token,
                    "accessTokenExpiresAt": result.access_expire,
                    "client": {
                        "id": result.client_id
                    },
                    "user": {
                        "id": result.user_id
                    }
                };
                callback(return_token);
            });
        });
    },
    getRefreshToken: function (refresh, callback) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }
            connection.query("SELECT client_id, user_id, refresh_expire FROM oauth_tokens WHERE refresh_token = ?", [refresh], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(null);
                    return;
                }
                if (results.length !== 1) {
                    callback(null);
                    return;
                }
                var result = results[0];
                var return_token = {
                    "refreshToken": refresh,
                    "refreshTokenExpiresAt": result.refresh_expire,
                    "client": {
                        "id": result.client_id
                    },
                    "user": {
                        "id": result.user_id
                    }
                };
                callback(return_token);
            });
        });
    },
    getClient: function (clientId, clientSecret, callback) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }
            connection.query("SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ?", [clientId, clientSecret], function (err, results) {
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
                    for (var i = 0; i < results.length; i++) {
                        uris.push(results[i].uri);
                    }
                    var client = {
                        "id": clientId,
                        "redirectUris": uris,
                        "grants": [
                            "refresh_token"
                        ]
                    };
                    callback(client);
                });
            });
        });
    },
    saveToken: function (token, client, user, callback) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }
            connection.query("INSERT INTO oauth_tokens (client_id, user_id, access_token, access_expire, refresh_token, refresh_expire) VALUES (?, ?, ?, ?, ?, ?)", [client.id, user.id, token.accessToken, token.accessTokenExpiresAt, token.refreshToken, token.refreshTokenExpiresAt], function (err) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(null);
                    return;
                }
                var returnToken = {
                    "accessToken": token.accessToken,
                    "accessTokenExpiresAt": token.accessTokenExpiresAt,
                    "refreshToken": token.refreshToken,
                    "refreshTokenExpiresAt": token.refreshTokenExpiresAt,
                    "client": {
                        "id": client.id
                    },
                    "user": user
                };
                callback(returnToken);
            });
        });
    },
    revokeToken: function (token, callback) {
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(false);
                return;
            }
            connection.query("DELETE FROM oauth_tokens WHERE client_id = ? AND user_id = ? AND refresh_token = ?", [token.client.id, token.user.id, token.refreshToken], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(false);
                    return;
                }
                callback(results.affectedRows > 0);
            });
        });
    }
};
module.exports = model;
//# sourceMappingURL=oauth.js.map