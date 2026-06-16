import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
}

export async function sendReplyEmail(
  config: SmtpConfig,
  to: string,
  inReplyTo: string,
  subject: string,
  htmlBody: string
): Promise<string> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });

  const info = await transporter.sendMail({
    from: `"${config.fromName}" <${config.user}>`,
    to,
    subject,
    html: htmlBody,
    inReplyTo,
    references: inReplyTo,
  });

  return info.messageId;
}
