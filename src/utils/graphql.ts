// @ts-ignore
let {graphql, buildSchema} = require('graphql');

// @ts-ignore
const fs = require('fs');

// @ts-ignore
let schemaString = fs.readFileSync(global.appRoot + '/data/schema.graphql', "utf8");

let schema = buildSchema(schemaString);

function createConnection() {
    return new Promise((succeed, fail) => {
        global.pool.getConnection((err: any, connection: any) => {
            if (err) {
                return fail(err)
            }

            return succeed(connection);
        });
    });
}

function createQuery(connection: any, query: string, params: any[]) {

    return new Promise((succeed: any, fail: any) => {

        connection.query(query, params, (err: any, rows: any) => {
            if (err) {
                connection.release();
                return fail(err)
            }

            return succeed(rows)
        });
    });
}

let resolver = {
    user: async function (args: any, request: any) {
        let connection: any = await createConnection();
        let user_results: any = await createQuery(connection, "SELECT username, email FROM traincarts_users WHERE id = ?", [request.app.locals.user_id]);
        if (user_results.length == 0) {
            return {};
        }

        let accounts_result: any = await createQuery(connection, "SELECT external_account_id as 'id', account_type as 'type' FROM user_accounts as uc INNER JOIN external_accounts ea on uc.account_id = ea.account_id WHERE user_id = ?", [request.app.locals.user_id]);
        let accounts: { type: string, profile: { id: string } }[] = [];
        for (let i = 0; i < accounts_result.length; i++) {
            let account_result = accounts_result[i];

            accounts.push({
                type: account_result.type,
                profile: {
                    id: account_result.id
                }
            });
        }

        return {
            id: request.app.locals.user_id,
            name: user_results[0].username,
            email: user_results[0].email,
            external_accounts: accounts
        }
    }
};

module.exports = {
    schema: schema,
    resolver: resolver
};
