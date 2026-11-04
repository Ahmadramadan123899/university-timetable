const nodemailer = require('nodemailer');
const pool = require('../config/db');

const transporter = nodemailer.createTransport({
  service: process.env.EMAIL_SERVICE,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

const sendEmail = async (req, res) => {
  try {
    const { to, subject, body } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html: body
    };

    await transporter.sendMail(mailOptions);
    
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).json({
      message: 'Failed to send email',
      error: err.message
    });
  }
};

module.exports = {
  sendEmail
};