import nodemailer from 'nodemailer';

export async function sendEmailIfConfigured({ html, markdown, subject }, env = process.env) {
  const required = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'REPORT_TO_EMAIL'];
  const missing = required.filter((name) => !env[name]);
  if (missing.length > 0) return { sent: false, reason: `Email disabled; missing ${missing.join(', ')}` };

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT),
    secure: String(env.SMTP_SECURE || '').toLowerCase() === 'true',
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS }
  });
  await transporter.sendMail({
    from: env.REPORT_FROM_EMAIL || env.SMTP_USER,
    to: env.REPORT_TO_EMAIL,
    subject,
    text: markdown,
    html
  });
  return { sent: true };
}
