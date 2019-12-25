var ejs = require('ejs');
var nodeMailer = require('nodemailer');
var fs = require('fs');
var mail = config.mail;
function sendHtmlMailFromTemplate(toAddress, fromName, subject, templateFile, data, callback) {
    fs.readFile(appRoot + "templates/mail/" + templateFile + ".ejs", "utf8", function (err, content) {
        if (err) {
            callback(err);
            console.error(err);
            return;
        }
        console.log(content);
        var html = ejs.render(content, data);
        var secure = mail.port == 465;
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
        }, function (err, info) {
            if (err) {
                callback(err);
                console.error(err);
                return;
            }
            console.log(info);
            callback(false);
        });
    });
}
module.exports = {
    sendHtmlMailFromTemplate: sendHtmlMailFromTemplate
};
//# sourceMappingURL=utils.js.map