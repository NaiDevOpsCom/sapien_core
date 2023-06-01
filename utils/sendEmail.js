// const nodemailer = require("nodemailer");
const Mailjet = require('node-mailjet');

const mailjet = new Mailjet({
    apiKey: process.env.MJ_APIKEY_PUBLIC || '',
    apiSecret: process.env.MJ_APIKEY_PRIVATE || ''
});

const sendEmail = async (email, subject, username, message, header,token) => {
    try {

        const request = mailjet
            .post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        From: {
                            Email: "collinshillary1@gmail.com",
                            Name: "Sapien Africa"
                        },
                        To: [
                            {
                                Email: email,
                                Name: email
                            }
                        ],
                        "TemplateID": 4321895,
                        "TemplateLanguage": true,
                        "Subject": subject,
                        "Variables": {
                            'username': username,
                            'message': message,
                            'header': header,
                            "token_link": token
                        }
                    }
                ]
            })

        request
            .then((result) => {
                // console.log(result.body)
            })
            .catch((err) => {
                // console.log(err.statusCode)
            })
    } catch (error) {
        console.log(error, "email not sent");
    }
};

module.exports = sendEmail;