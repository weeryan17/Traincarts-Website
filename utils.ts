var ejs = require('ejs');
var nodeMailer = require('nodemailer');
// @ts-ignore
var fs = require('fs');

var mail : any = config.mail;

function sendHtmlMailFromTemplate(toAddress: string, fromName : string, subject: string, templateFile : string, data : any, callback : (err : boolean | any) => void) {
    // @ts-ignore
    fs.readFile(appRoot + "templates/mail/" + templateFile + ".ejs", "utf8", function (err, content) {
        if (err) {
            callback(err);
            console.error(err);
            return;
        }
        console.log(content);

        var html : string = ejs.render(content, data);

        var secure : boolean = mail.port == 465;
        var transport = nodeMailer.createTransport({
            host: mail.host,
            port: mail.port,
            secure: secure,
            auth: mail.auth
        });

        transport.sendMail({
            from: '"' + fromName + '" <' + mail.auth.user + '>',
            to: toAddress,
            subject: subject,
            html: html
        }, function (err : any, info : any) {
            if (err) {
                callback(err);
                console.error(err);
                return;
            }

            console.log(info);
            callback(false);
        })
    });


}

module.exports = {
    sendHtmlMailFromTemplate: sendHtmlMailFromTemplate
};