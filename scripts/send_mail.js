import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

let transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true, // use TLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
});

transporter.sendMail({
    from: "nischaypro@gmail.com", // verified sender email
    to: "rounaknayee007@gmail.com", // recipient email
    subject: "Test message subject", // Subject line
    text: "Hello world!", // plain text body
    html: "<b>Hello world!</b>", // html body
  }, function(error, info){
    if (error) {
      console.log(error);
    } else {
      console.log('Email sent: ' + info.response);
    }
  });