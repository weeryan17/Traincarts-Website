#!/usr/bin/env node
var path = require('path');
var mysql = require('mysql');
var fs = require('fs');
var config = JSON.parse(fs.readFileSync("config.json"));
global["appRoot"] = path.resolve(__dirname) + '/';
var mysql_config = config.database;
mysql_config.typeCast = function castField(field, useDefaultTypeCasting) {
    if ((field.type === "BIT") && (field.length === 1)) {
        var bytes = field.buffer();
        return (bytes[0] === 1);
    }
    return (useDefaultTypeCasting());
};
global["pool"] = mysql.createPool(mysql_config);
global["config"] = config;
var oauth_default_clients = config.site_oauth_secrets;
global.pool.getConnection(function (err, connection) {
    if (err) {
        console.error(err);
        return;
    }
    var _loop_1 = function () {
        defaultClient = oauth_default_clients[i];
        var number = i;
        connection.query("SELECT COUNT(client_id) as 'clients' FROM oauth_clients WHERE client_id = ?", [defaultClient.id], function (err, results) {
            if (err) {
                console.log(err);
                return;
            }
            var defaultClient = oauth_default_clients[number];
            if (results[0].clients == 0) {
                connection.query("INSERT INTO oauth_clients (client_id, client_name, client_secret) VALUES (?, ?, ?)", [defaultClient.id, 'Traincarts', defaultClient.secret], function (err) {
                    if (err) {
                        console.log(err);
                        return;
                    }
                });
            }
        });
    };
    var defaultClient;
    for (var i = 0; i < oauth_default_clients.length; i++) {
        _loop_1();
    }
});
var app = require('./app.js');
var debug = require('debug')('site:server');
var http = require('http');
var port = normalizePort(process.env.PORT || '3000');
app.set('port', port);
var server = http.createServer(app);
server.listen(port);
server.on('error', onError);
server.on('listening', onListening);
function normalizePort(val) {
    var port = parseInt(val, 10);
    if (isNaN(port)) {
        return val;
    }
    if (port >= 0) {
        return port;
    }
    return false;
}
function onError(error) {
    if (error.syscall !== 'listen') {
        throw error;
    }
    var bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;
    switch (error.code) {
        case 'EACCES':
            console.error(bind + ' requires elevated privileges');
            process.exit(1);
            break;
        case 'EADDRINUSE':
            console.error(bind + ' is already in use');
            process.exit(1);
            break;
        default:
            throw error;
    }
}
function onListening() {
    var addr = server.address();
    var bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
//# sourceMappingURL=start.js.map