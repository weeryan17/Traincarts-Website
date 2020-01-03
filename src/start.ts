#!/usr/bin/env node

// @ts-ignore
let path = require('path');
let mysql = require('mysql');
// @ts-ignore
let fs = require('fs');

let config = JSON.parse(fs.readFileSync("config.json"));

// @ts-ignore
global["appRoot"] = path.resolve(__dirname) + '/../';

let mysql_config = config.database;
mysql_config.typeCast = function castField(field: any, useDefaultTypeCasting: any) {
    if ((field.type === "BIT") && (field.length === 1)) {
        let bytes = field.buffer();
        return (bytes[0] === 1);
    }

    return (useDefaultTypeCasting());
};

// @ts-ignore
global["pool"] = mysql.createPool(mysql_config);
// @ts-ignore
global["config"] = config;

let oauth_default_clients: { id: string, callback: string, secret: string }[] = config.site_oauth_secrets;


for (let i = 0; i < oauth_default_clients.length; i++) {
    const num: number = i;
    // @ts-ignore
    global.pool.getConnection(function (err: any, connection: any) {
        if (err) {
            console.error(err);
            return;
        }
        let defaultClient: { id: string, callback: string, secret: string } = oauth_default_clients[num];
        const number = num;
        connection.query("SELECT COUNT(client_id) as 'clients' FROM oauth_clients WHERE client_id = ?",
            [defaultClient.id],
            function (err: any, results: any) {
                if (err) {
                    connection.release();
                    console.error(err);
                    return;
                }
                let defaultClient: { id: string, callback: string, secret: string } = oauth_default_clients[number];
                if (results[0].clients == 0) {
                    connection.query("INSERT INTO oauth_clients (client_id, client_name, client_secret) VALUES (?, ?, ?)",
                        [defaultClient.id, 'Traincarts', defaultClient.secret],
                        function (err: any) {
                            connection.release();
                            if (err) {
                                console.error(err);
                                return;
                            }
                        });
                }
            });
    });
}

/**
 * Module dependencies.
 */
// @ts-ignore
let app = require('./app.js');
let debug = require('debug')('site:server');
let http = require('http');

/**
 * Get port from environment and store in Express.
 */

let port = normalizePort(process.env.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

let server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val: string) {
    let port = parseInt(val, 10);

    if (isNaN(port)) {
        // named pipe
        return val;
    }

    if (port >= 0) {
        // port number
        return port;
    }

    return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error: { syscall: string; code: any; }) {
    if (error.syscall !== 'listen') {
        throw error;
    }

    let bind = typeof port === 'string'
        ? 'Pipe ' + port
        : 'Port ' + port;

    // handle specific listen errors with friendly messages
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

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
    let addr = server.address();
    let bind = typeof addr === 'string'
        ? 'pipe ' + addr
        : 'port ' + addr.port;
    debug('Listening on ' + bind);
}
