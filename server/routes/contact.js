const express = require('express');
const nodemailer = require('nodemailer');
const router = express.Router();

router.post('/', async (req, res) => {
  const { name, phone, service, message } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // In dev mode without email config, just log and return success
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('Contact form submission:', { name, phone, service, message });
    return res.json({ ok: true });
  }

  try {
    // EMAIL_HOST = generic SMTP (beget mail, etc.); falls back to Gmail
    const transporter = nodemailer.createTransport(
      process.env.EMAIL_HOST
        ? {
            host: process.env.EMAIL_HOST,
            port: Number(process.env.EMAIL_PORT || 465),
            secure: process.env.EMAIL_PORT !== '587',
            auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
          }
        : { service: 'gmail', auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS } }
    );
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.EMAIL_TO || 'info@majudrosiba.lv',
      subject: `Jauns pieprasījums — ${service || 'Vispārējs'}`,
      text: `Vārds: ${name}\nTālrunis: ${phone}\nPakalpojums: ${service || '—'}\n\n${message || ''}`,
    });
    res.json({ ok: true });
  } catch (err) {
    console.error('Email error:', err.message);
    res.status(500).json({ error: 'Email sending failed' });
  }
});

module.exports = router;
