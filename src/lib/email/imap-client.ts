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

export async function fetchUnreadEmails(config: ImapConfig, since?: Date, allEmails?: boolean): Promise<FetchedEmail[]> {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      ...config,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000,
      authTimeout: 15000,
    });

    const emails: FetchedEmail[] = [];
    let resolved = false;

    // 超时保护（Vercel 限制 10s，设为 9s）
    const timer = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { imap.destroy(); } catch {}
        resolve(emails); // 不报错，返回空数组
      }
    }, 9000);

    const done = () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timer);
        try { imap.end(); } catch {}
        resolve(emails);
      }
    };

    imap.once('ready', () => {
      imap.openBox('INBOX', false, (err) => {
        if (err) { console.error('IMAP openBox error:', err.message); return done(); }

        const criteria: any[] = allEmails ? ['ALL'] : ['UNSEEN'];
        if (since) criteria.push(['SINCE', since]);

        imap.search(criteria, (err, results) => {
          if (err) { console.error('IMAP search error:', err.message); return done(); }
          if (!results?.length) return done();

          const fetch = imap.fetch(results, { bodies: '', struct: true });

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

          fetch.once('error', (err) => { console.error('IMAP fetch error:', err.message); });
          fetch.once('end', () => done());
        });
      });
    });

    imap.once('error', (err) => {
      console.error('IMAP connection error:', err.message);
      done();
    });

    try {
      imap.connect();
    } catch (err) {
      console.error('IMAP connect error:', err.message);
      done();
    }
  });
}
