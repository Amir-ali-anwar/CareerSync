import nodemailer from 'nodemailer';
import mailConfig from './mailConfig.js';

const sendPasswordResetEmail = async ({ name, email, otp, origin }) => {
  // Tokenless convenience link - just navigates to the right page with the email
  // pre-filled, the code itself still has to be typed in. Not an auth mechanism.
  const resetPageURL = `${origin}/reset-password?email=${encodeURIComponent(email)}`;

  const transporter = nodemailer.createTransport(mailConfig);

  const message = {
    from: '"CareerSync" <no-reply@careersync.com>',
    to: email,
    subject: 'Reset your CareerSync password',
    html: `<h4>Hello ${name}</h4>
      <p>We received a request to reset your CareerSync password. Your reset code is:</p>
      <p style="font-size: 32px; font-weight: bold; letter-spacing: 4px;">${otp}</p>
      <p>This code expires in 10 minutes. Enter it on the <a href="${resetPageURL}">reset password page</a>.</p>
      <p>If you did not request a password reset, please ignore this email - your password will not change.</p>`
  };
  try {
    const info = await transporter.sendMail(message);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
    console.log('Password reset email sent');
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

export default sendPasswordResetEmail;
