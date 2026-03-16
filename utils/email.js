const nodemailer = require('nodemailer');
const pug = require('pug');
const htmlToText = require('html-to-text');

module.exports = class Email {
  constructor(user, url) {
    this.to = user.email;
    this.firstName = user.name.split(' ')[0];
    this.url = url;
    this.from = `Name Surname <${process.env.EMAIL_FROM}`;
  }

  newTransport() {
    if (process.env.NODE_ENV === 'production') {
      //Email provider
      return nodemailer.createTransport({
        host: process.env.MAIL_PROVIDER_HOST,
        port: process.env.MAIL_PROVIDER_PORT,
        auth: {
          user: process.env.MAIL_PROVIDER_USER,
          pass: process.env.MAIL_PROVIDER_PASSWORD,
        },
      });
    }
    const transport = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      auth: {
        user: process.env.EMAIL_USERNAME,
        pass: process.env.EMAIL_PASSWORD,
      },
    });
    return transport;
  }

  //Send actual email
  async send(template, subject) {
    // 1) Generate HTML
    const html = pug.renderFile(`${__dirname}/../views/email/${template}.pug`, {
      firstName: this.firstName,
      url: this.url,
      subject,
    });

    // 2) Email options
    const mailOptions = {
      from: this.from,
      to: this.to,
      subject: subject,
      html,
      text: htmlToText.convert(html),
    };

    // 3) Create trnsport and send emil
    await this.newTransport().sendMail(mailOptions);
  }

  async sendWelcome() {
    await this.send('Welcome', 'Welcome to the Natours Family');
  }

  async sendPasswordReset() {
    await this.send(
      'passwordReset',
      'Your password reset token (valid for 10 mins',
    );
  }
};
