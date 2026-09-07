import nodemailer from 'nodemailer';
import mailConfig from './mailConfig.js';

const sendVerificationEmail = async ({ name, email, otp, origin }) => {
  // Tokenless convenience link - just navigates to the right page with the email
  // pre-filled, the code itself still has to be typed in. Not an auth mechanism.
  const verifyPageURL = `${origin}/verify-email?email=${encodeURIComponent(email)}`;

  const transporter = nodemailer.createTransport(mailConfig);

  const message = {
    from: '"CareerSync" <no-reply@careersync.com>',
    to: email,
    subject: 'Verify your CareerSync email',
    html: `<h4>Hello ${name}</h4>
      <p>Your email verification code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. Enter it on the <a href="${verifyPageURL}">verification page</a>.</p>
      <p>If you did not create this account, please ignore this email.</p>`
  };
  try {
    const info = await transporter.sendMail(message);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Verification email sent');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default sendVerificationEmail;
