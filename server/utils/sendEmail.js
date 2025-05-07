import nodemailer from 'nodemailer'
import nodemailerConfig from 'nodemailerconfiguration'

const sendEmail= async ({ to, subject, html })=>{
    let testAccount = await nodemailer.createTestAccount();
    const transporter=  nodemailer.createTransport(nodemailerConfig)
    return transporter.sendMail({
        from: '"Amir Ali Anwar" <amiralianwar611@gmail.com>',
        to,
        subject,
        html
    })
}
export default sendEmail;