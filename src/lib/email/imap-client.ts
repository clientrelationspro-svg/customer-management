// @ts-nocheck
import Imap from 'imap';
import { simpleParser } from 'mailparser';

interface ImapConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

interface FetchedEmail {
  messageId: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  body: string;
  bodyHtml?: string;
  date: Date;
}

// 连接 IMAP 并拉取未读邮件
export async function fetchUnreadEmails(config: ImapConfig, since?: Date): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      ...config,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
    });

    const emails: FetchedEmail[] = [];

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { imap.end(); return reject(err); }

        const criteria: any[] = ['UNSEEN'];
        if (since) criteria.push(['SINCE', since]);

        imap.search(criteria, (err, results) => {
          if (err || !results.length) { imap.end(); return resolve(emails); }

          const fetch = imap.fetch(results, {
            bodies: '',
            struct: true,
          });

          fetch.on('message', (msg: any) => {
            msg.on('body', (stream: any) => {
              simpleParser(stream, (err: any, parsed: any) => {
                if (err) return;
                emails.push({
                  messageId: parsed.messageId || '',
                  fromEmail: parsed.from?.value?.[0]?.address || '',
                  fromName: parsed.from?.value?.[0]?.name || '',
                  subject: parsed.subject || '',
                  body: parsed.text || '',
                  bodyHtml: parsed.html || undefined,
                  date: parsed.date || new Date(),
                });
              });
            });
          });

          fetch.once('error', (err) => { console.error('Fetch error:', err); });
          fetch.once('end', () => { imap.end(); });
        });
      });
    });

    imap.once('error', (err) => reject(err));
    imap.once('end', () => resolve(emails));
    imap.connect();
  });
}
