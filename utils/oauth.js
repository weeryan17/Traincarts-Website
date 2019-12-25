var model = {
    generateAuthorizationCode: function (client, user, scope, callback) {
        callback(null, Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    },
    getAccessToken: function (token, callback) {
        console.log("getAccessToken");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("SELECT client_id, user_id, access_expire FROM oauth_tokens WHERE access_token = ?", [token], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, null);
                    return;
                }
                if (results.length !== 1) {
                    callback(null, {});
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
                callback(null, return_token);
            });
        });
    },
    getRefreshToken: function (refresh, callback) {
        console.log("getRefreshToken");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("SELECT client_id, user_id, refresh_expire FROM oauth_tokens WHERE refresh_token = ?", [refresh], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, null);
                    return;
                }
                if (results.length !== 1) {
                    callback(null, {});
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
                callback(null, return_token);
            });
        });
    },
    getAuthorizationCode: function (code, callback) {
        console.log("getAuthorizationCode");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("SELECT * FROM oauth_codes WHERE code = ?", [code], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, null);
                    return;
                }
                if (results.length < 1) {
                    callback(null, {});
                    return;
                }
                var result = results[0];
                var return_code = {
                    "authorizationCode": result.code,
                    "expiresAt": result.expire,
                    "redirectUri": result.uri,
                    "client": {
                        "id": result.client_id
                    },
                    "user": {
                        "id": result.user_id
                    }
                };
                callback(null, return_code);
            });
        });
    },
    getClient: function (clientId, clientSecret, callback) {
        console.log("getClient");
        var builtInClients = global.config.site_oauth_secrets;
        for (var i = 0; i < builtInClients.length; i++) {
            var builtInClient = builtInClients[i];
            if (builtInClient.id === clientId && builtInClient.secret === clientSecret) {
                var uris = [builtInClient.callback];
                var client = {
                    "id": clientId,
                    "redirectUris": uris,
                    "grants": [
                        "refresh_token",
                        "authorization_code"
                    ]
                };
                callback(null, client);
                return;
            }
        }
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ?", [clientId, clientSecret], function (err, results) {
                if (err) {
                    connection.release();
                    console.error(err);
                    callback(err, null);
                    return;
                }
                if (results.length == 0) {
                    callback(null, {});
                    return;
                }
                connection.query("SELECT uri FROM oauth_uris WHERE client_id = ?", [clientId], function (err, results) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(err, null);
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
                        ]
                    };
                    callback(null, client);
                });
            });
        });
    },
    saveToken: function (token, client, user, callback) {
        console.log("saveToken");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("INSERT INTO oauth_tokens (client_id, user_id, access_token, access_expire, refresh_token, refresh_expire) VALUES (?, ?, ?, ?, ?, ?)", [client.id, user.id, token.accessToken, token.accessTokenExpiresAt, token.refreshToken, token.refreshTokenExpiresAt], function (err) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, null);
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
                callback(null, returnToken);
            });
        });
    },
    saveAuthorizationCode: function (code, client, user, callback) {
        console.log("saveAuthorizationCode");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }
            connection.query("INSERT INTO oauth_codes (code, expire, uri, user_id, client_id) VALUES (?, ?, ?, ?, ?)", [code.authorizationCode, code.expiresAt, code.redirectUri, user.id, client.id], function (err) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, null);
                    return;
                }
                var return_code = {
                    "authorizationCode": code.authorizationCode,
                    "expiresAt": code.expiresAt,
                    "redirectUri": code.redirectUri,
                    "client": {
                        "id": client.id
                    },
                    "user": user
                };
                callback(null, return_code);
            });
        });
    },
    revokeToken: function (token, callback) {
        console.log("revokeToken");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, false);
                return;
            }
            connection.query("DELETE FROM oauth_tokens WHERE client_id = ? AND user_id = ? AND refresh_token = ?", [token.client.id, token.user.id, token.refreshToken], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, false);
                    return;
                }
                callback(null, results.affectedRows > 0);
            });
        });
    },
    revokeAuthorizationCode: function (code, callback) {
        console.log("revokeAuthorizationCode");
        global.pool.getConnection(function (err, connection) {
            if (err) {
                console.error(err);
                callback(err, false);
                return;
            }
            connection.query("DELETE FROM oauth_codes WHERE code = ?", [code.authorizationCode], function (err, results) {
                connection.release();
                if (err) {
                    console.error(err);
                    callback(err, false);
                    return;
                }
                callback(null, results.affectedRows > 0);
            });
        });
    }
};
module.exports = model;
//# sourceMappingURL=oauth.js.map