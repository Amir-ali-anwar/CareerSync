import nodemailer from 'nodemailer';
import mailConfig from './mailConfig.js';

const sendVerificationEmail = async ({ name, email, verificationToken, origin }) => {
  const verifyURL = `${origin}/user/verify-email?token=${verificationToken}&email=${email}`;

  const transporter = nodemailer.createTransport(mailConfig);

  const message = {
    from: '"CareerSync" <no-reply@careersync.com>',
    to: email,
    subject: 'Email Verification',
    html: `<h4>Hello ${name}</h4>
      <p>Please confirm your email by clicking the following link:</p>
      <a href="${verifyURL}">Verify Email</a>
      <p>If you did not create this account, please ignore this email.</p>`
  };
  try {
    await transporter.sendMail(message);
    const info = await transporter.sendMail(message);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending email:', error);
  }
};

export default sendVerificationEmail;
