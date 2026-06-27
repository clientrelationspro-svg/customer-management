/**
 * 专业邮件排版模板
 * 
 * 将 Markdown/纯文本转换为美观的 HTML 邮件
 */

const EMAIL_WRAPPER_START = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background-color:#f5f5f5;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f5f5f5;padding:20px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06);border:1px solid #e8e8e8;">
`;

const EMAIL_WRAPPER_END = `
</table>
<!-- 底部 footer -->
<table width="600" cellpadding="0" cellspacing="0" style="margin-top:16px;">
<tr><td style="padding:12px 0;text-align:center;">
  <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#999;line-height:1.5;">
    此邮件由客户管理系统自动发送 · <a href="http://localhost:3000" style="color:#1a73e8;text-decoration:none;">客户管理系统</a>
  </p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;

// 将纯文本智能分段（识别空行分隔的段落）
function plainTextToHtml(text: string): string {
  // 先按双换行分段
  const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim());

  return paragraphs.map(p => {
    const lines = p.trim().split('\n');
    return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#333333;">
      ${lines.map(l => l.trim() || '&nbsp;').join('<br>')}
    </p>`;
  }).join('\n');
}

// 增强版 Markdown → HTML 转换
function markdownToEmailHtml(md: string): string {
  let html = md;

  // === 标题 ===
  html = html.replace(/^### (.+)$/gm,
    '<h3 style="margin:24px 0 12px 0;font-family:Arial,Helvetica,sans-serif;font-size:16px;font-weight:600;color:#1a1a1a;line-height:1.4;">$1</h3>');
  html = html.replace(/^## (.+)$/gm,
    '<h2 style="margin:28px 0 14px 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:600;color:#1a1a1a;line-height:1.4;border-bottom:1px solid #eee;padding-bottom:8px;">$1</h2>');
  html = html.replace(/^# (.+)$/gm,
    '<h1 style="margin:32px 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:20px;font-weight:700;color:#111;line-height:1.3;">$1</h1>');

  // === 引用 ===
  html = html.replace(/^> (.+)$/gm,
    '<blockquote style="margin:16px 0;padding:12px 16px;background-color:#f8f9fa;border-left:4px solid #1a73e8;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#555;line-height:1.6;">$1</blockquote>');

  // === 粗体 + 斜体 ===
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong style="font-weight:700;"><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong style="font-weight:700;">$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // === 链接 ===
  html = html.replace(/\[(.+?)\]\((.+?)\)/g,
    '<a href="$2" style="color:#1a73e8;text-decoration:none;border-bottom:1px solid rgba(26,115,232,0.3);">$1</a>');

  // === 分割线 ===
  html = html.replace(/^---$/gm,
    '<hr style="margin:24px 0;border:none;border-top:1px solid #e0e0e0;">');

  // === 无序列表（识别连续的行首 `- `） ===
  // 将连续的列表项包裹在 <ul> 中
  html = html.replace(/^- (.+)$/gm, '<li style="margin:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#333;">$1</li>');
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)/g,
    '<ul style="margin:12px 0;padding:0 0 0 24px;list-style-type:disc;">$1</ul>');

  // === 数字列表 ===
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li style="margin:4px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#333;">$1</li>');
  // 数字列表包裹在 ol 中
  html = html.replace(/((?:<li[^>]*>.*?<\/li>\s*)+)(?!<\/[ou]l>)/g, (match) => {
    if (match.includes('<ul')) return match;
    return `<ol style="margin:12px 0;padding:0 0 0 24px;">${match}</ol>`;
  });

  // === 段落处理 ===
  // 双换行 → 新段落
  html = html.replace(/\n\n+/g, '</p><p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#333333;">');
  // 单换行 → 行内换行
  html = html.replace(/\n/g, '<br>');

  return `<p style="margin:0 0 16px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.8;color:#333333;">${html}</p>`;
}

// 判断内容是否为 Markdown（包含 Markdown 语法标记）
function isMarkdown(text: string): boolean {
  return /^#{1,3}\s|^\*\*|^\*[^*]|^>\s|^-\s|^\d+\.\s|\[.+\]\(.+\)/m.test(text);
}

/**
 * 将任意文本转换为专业 HTML 邮件
 * - Markdown 文本 → 丰富的 HTML 格式
 * - 纯文本 → 智能分段排版
 * - 已有 HTML → 保持原样
 */
export function formatEmailBody(content: string): string {
  // 如果已经是 HTML
  if (content.trim().startsWith('<') && content.includes('</')) {
    return content;
  }

  let bodyHtml: string;

  // 检测是否为 Markdown
  if (isMarkdown(content)) {
    bodyHtml = markdownToEmailHtml(content);
  } else {
    bodyHtml = plainTextToHtml(content);
  }

  return bodyHtml;
}

/**
 * 将正文包装为完整的 HTML 邮件
 * @param bodyHtml 邮件正文 HTML
 * @param subject 邮件主题（可选，用于内部追踪）
 */
export function wrapEmailHtml(bodyHtml: string, _subject?: string): string {
  return `${EMAIL_WRAPPER_START}
<tr><td style="padding:32px 40px;">
${bodyHtml}
</td></tr>
${EMAIL_WRAPPER_END}`;
}

/**
 * 一键生成完整 HTML 邮件
 * @param content 邮件内容（Markdown、纯文本或 HTML）
 * @param subject 邮件主题（可选）
 */
export function buildEmailHtml(content: string, subject?: string): string {
  const bodyHtml = formatEmailBody(content);
  return wrapEmailHtml(bodyHtml, subject);
}
