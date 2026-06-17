import nodemailer from 'nodemailer';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  fromName: string;
}

interface Attachment {
  filename: string;
  content?: Buffer | string;
  path?: string;
  contentType?: string;
}

export async function sendReplyEmail(
  config: SmtpConfig,
  to: string,
  inReplyTo: string,
  subject: string,
  htmlBody: string,
  attachments?: Attachment[]
): Promise<string> {
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
  });

  const mailOptions: any = {
    from: `"${config.fromName}" <${config.user}>`,
    to,
    subject,
    html: htmlBody,
    inReplyTo,
    references: inReplyTo,
  };

  if (attachments?.length) {
    mailOptions.attachments = attachments.map(a => ({
      filename: a.filename,
      content: a.content,
      path: a.path,
      contentType: a.contentType,
    }));
  }

  const info = await transporter.sendMail(mailOptions);
  return info.messageId;
}
