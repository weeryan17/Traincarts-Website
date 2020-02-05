const model = {
    generateAuthorizationCode: function(client: {id: string}, user: {id: number}, scope : string, callback: (err: any, code: string) => void ) {
        callback(null, Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
    },
    getAccessToken: function (token: string, callback: (err: any, token: any) => void) {
        console.log("getAccessToken");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("SELECT client_id, user_id, access_expire FROM oauth_tokens WHERE access_token = ?",
                [token],
                function (err: any, results: any) {
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

                    let result = results[0];

                    let return_token = {
                        "accessToken": token,
                        "accessTokenExpiresAt": result.access_expire,
                        "client": {
                            "id": result.client_id,
                            "grants": [
                                "refresh_token",
                                "authorization_code"
                            ]
                        },
                        "user": {
                            "id": result.user_id
                        }
                    };

                    callback(null, return_token);
                });
        });
    },

    getRefreshToken: function (refresh: string, callback: (err: any, refresh: any) => void) {
        console.log("getRefreshToken");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("SELECT client_id, user_id, refresh_expire FROM oauth_tokens WHERE refresh_token = ?",
                [refresh],
                function (err: any, results: any) {
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

                    callback(null, return_token);
                });
        });
    },

    getAuthorizationCode: function (code: string, callback: (err: any, code: any) => void) {
        console.log("getAuthorizationCode");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("SELECT * FROM oauth_codes WHERE code = ?",
                [code],
                function (err: any, results: any) {
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

                    callback(null, return_code);
                }
            );
        });
    },

    getClient: function (clientId: string, clientSecret: string, callback: (err: any, client: any) => void) {
        console.log("getClient");
        // @ts-ignore
        let builtInClients: {id: string, callback: string, secret: string}[] = global.config.site_oauth_secrets;
        for (let i = 0; i < builtInClients.length; i++) {
            let builtInClient: {id: string, callback: string, secret: string} = builtInClients[i];
            if (builtInClient.id === clientId) {
                if (clientSecret !== null && builtInClient.secret !== clientSecret) {
                    callback(null, {});
                    return;
                }
                let uris = [builtInClient.callback];
                let client = {
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
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("SELECT * FROM oauth_clients WHERE client_id = ?",
                [clientId],
                function (err: any, results: any) {
                    if (err) {
                        connection.release();
                        console.error(err);
                        callback(err, null);
                        return;
                    }

                    if (results.length == 0) {
                        connection.release();
                        callback(null, {});
                        return;
                    }

                    if (clientSecret !== null && results[0].client_secret !== clientSecret) {
                        connection.release();
                        callback(null, {});
                    }

                    connection.query("SELECT uri FROM oauth_uris WHERE client_id = ?",
                        [clientId],
                        function (err: any, results: any) {
                            connection.release();
                            if (err) {
                                console.error(err);
                                callback(err, null);
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

                            callback(null, client);
                        });
                });
        });
    },

    saveToken: function (token: { accessToken: string; accessTokenExpiresAt: any; refreshToken: string; refreshTokenExpiresAt: any; }, client: { id: string; }, user: { id: number; }, callback: (err: any, token: any) => void) {
        console.log("saveToken");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("INSERT INTO oauth_tokens (client_id, user_id, access_token, access_expire, refresh_token, refresh_expire) VALUES (?, ?, ?, ?, ?, ?)",
                [client.id, user.id, token.accessToken, token.accessTokenExpiresAt, token.refreshToken, token.refreshTokenExpiresAt],
                function (err: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(err, null);
                        return;
                    }

                    let returnToken = {
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

    saveAuthorizationCode: function (code: { authorizationCode: string; expiresAt: string; redirectUri: string }, client: { id: string; }, user: { id: number; }, callback: (err: any, code: any) => void) {
        console.log("saveAuthorizationCode");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, null);
                return;
            }

            connection.query("INSERT INTO oauth_codes (code, expire, uri, user_id, client_id) VALUES (?, ?, ?, ?, ?)",
                [code.authorizationCode, code.expiresAt, code.redirectUri, user.id, client.id],
                function (err: any) {
                    connection.release();
                    if (err) {
                        console.error(err);
                        callback(err, null);
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

                    callback(null, return_code);
                }
            );
        });
    },

    revokeToken: function (token: { client: { id: string; }; user: { id: number; }; refreshToken: string; }, callback: (err: any, success: boolean) => void) {
        console.log("revokeToken");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, false);
                return;
            }

            connection.query("DELETE FROM oauth_tokens WHERE client_id = ? AND user_id = ? AND refresh_token = ?",
                [token.client.id, token.user.id, token.refreshToken],
                function (err: any, results: any) {
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

    revokeAuthorizationCode: function (code: { authorizationCode: string; }, callback: (err: any, success: boolean) => void) {
        console.log("revokeAuthorizationCode");
        // @ts-ignore
        global.pool.getConnection(function (err: any, connection: any) {
            if (err) {
                console.error(err);
                callback(err, false);
                return;
            }

            connection.query("DELETE FROM oauth_codes WHERE code = ?",
                [code.authorizationCode],
                function (err: any, results: any) {
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