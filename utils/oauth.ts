const model = {
    generateAuthorizationCode: function(client: {id: string}, user: {id: number}, scope : string, callback: (code: string) => void ) {
        callback(Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    },
    getAccessToken: function (token: string, callback: (token: any) => void) {
        console.log("getAccessToken");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("SELECT client_id, user_id, access_expire FROM oauth_tokens WHERE access_token = ?",
                [token],
                function (err: any, results: any) {
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

                    let result = results[0];

                    let return_token = {
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

    getRefreshToken: function (refresh: string, callback: (refresh: any) => void) {
        console.log("getRefreshToken");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("SELECT client_id, user_id, refresh_expire FROM oauth_tokens WHERE refresh_token = ?",
                [refresh],
                function (err: any, results: any) {
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

                    let result = results[0];

                    let return_token = {
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

    getAuthorizationCode: function (code: string, callback: any) {
        console.log("getAuthorizationCode");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("SELECT * FROM oauth_codes WHERE code = ?",
                [code],
                function (err: any, results: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(null);
                        return;
                    }

                    if (results.length < 1) {
                        callback(null);
                        return;
                    }

                    let result = results[0];

                    let return_code = {
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

                    callback(return_code);
                }
            );
        });
    },

    getClient: function (clientId: string, clientSecret: string, callback: (client: any) => void) {
        console.log("getClient");
        // @ts-ignore
        var builtInClients: {id: string, uri: string, secret: string}[] = global.config.site_oauth_secrets;
        for (var i = 0; i < builtInClients.length; i++) {
            var builtInClient: {id: string, uri: string, secret: string} = builtInClients[i];
            if (builtInClient.id === clientId && builtInClient.secret === clientSecret) {
                var uris = [builtInClient.uri];
                callback({
                    "id": clientId,
                    "redirectUris": uris,
                    "grants": [
                        "refresh_token",
                        "authorization_code"
                    ]
                });
                return;
            }
        }
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("SELECT * FROM oauth_clients WHERE client_id = ? AND client_secret = ?",
                [clientId, clientSecret],
                function (err: any, results: any) {
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
                                ]
                            };

                            callback(client);
                        });
                });
        });
    },

    saveToken: function (token: { accessToken: string; accessTokenExpiresAt: any; refreshToken: string; refreshTokenExpiresAt: any; }, client: { id: string; }, user: { id: number; }, callback: (token: any) => void) {
        console.log("saveToken");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("INSERT INTO oauth_tokens (client_id, user_id, access_token, access_expire, refresh_token, refresh_expire) VALUES (?, ?, ?, ?, ?, ?)",
                [client.id, user.id, token.accessToken, token.accessTokenExpiresAt, token.refreshToken, token.refreshTokenExpiresAt],
                function (err: any) {
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

    saveAuthorizationCode: function (code: { authorizationCode: string; expiresAt: string; redirectUri: string }, client: { id: string; }, user: { id: number; }, callback: any) {
        console.log("saveAuthorizationCode");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(null);
                return;
            }

            connection.query("INSERT INTO oauth_codes (code, expire, uri, user_id, client_id) VALUES (?, ?, ?, ?, ?)",
                [code.authorizationCode, code.expiresAt, code.redirectUri, user.id, client.id],
                function (err: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(null);
                        return;
                    }

                    let return_code = {
                        "authorizationCode": code.authorizationCode,
                        "expiresAt": code.expiresAt,
                        "redirectUri": code.redirectUri,
                        "client": {
                            "id": client.id
                        },
                        "user": user
                    };

                    callback(return_code);
                }
            );
        });
    },

    revokeToken: function (token: { client: { id: string; }; user: { id: number; }; refreshToken: string; }, callback: (success: boolean) => void) {
        console.log("revokeToken");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(false);
                return;
            }

            connection.query("DELETE FROM oauth_tokens WHERE client_id = ? AND user_id = ? AND refresh_token = ?",
                [token.client.id, token.user.id, token.refreshToken],
                function (err: any, results: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(false);
                        return;
                    }

                    callback(results.affectedRows > 0);
                });
        });
    },

    revokeAuthorizationCode: function (code: { authorizationCode: string; }, callback: any) {
        console.log("revokeAuthorizationCode");
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(false);
                return;
            }

            connection.query("DELETE FROM oauth_codes WHERE code = ?",
                [code.authorizationCode],
                function (err: any, results: any) {
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