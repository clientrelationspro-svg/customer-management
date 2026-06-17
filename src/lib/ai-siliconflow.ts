const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';
const MODEL = 'deepseek-ai/DeepSeek-V3';

function getApiKey(): string {
  return process.env.SILICONFLOW_API_KEY || '';
}

async function callAI(messages: { role: string; content: string }[]): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${getApiKey()}`,
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 2048 }),
  });
  if (!res.ok) throw new Error(`AI API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 提取邮件要点
export async function extractInquiryPoints(
  subject: string, body: string, language: string
): Promise<{ productInterested: string; quantity: string; deliveryRequired: string; summary: string }> {
  const langLabel = language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文';
  const prompt = `从以下邮件提取关键信息，用${langLabel}回复纯JSON（不要markdown标记）：
邮件: ${subject}\n${body.slice(0, 3000)}
{"productInterested":"产品","quantity":"数量","deliveryRequired":"交期","summary":"20字内总结"}`;
  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { productInterested: '', quantity: '', deliveryRequired: '', summary: '' };
}

// 邮件自动分类
export async function classifyEmail(subject: string, body: string): Promise<string[]> {
  const prompt = `分类以下邮件（选1-3个标签）：询价,报价跟进,催单,投诉,技术咨询,付款,物流查询,订单确认,样品需求,合作洽谈,新客户,其他
邮件: ${subject}\n${body.slice(0, 2000)}
只返回逗号分隔标签，如: 询价,报价跟进`;
  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    return result.replace(/[^a-zA-Z\u4e00-\u9fa5,]/g, '').split(',').map(t => t.trim()).filter(Boolean);
  } catch {}
  return ['其他'];
}

// 生成回复草稿 — Markdown 格式
export async function generateReplyDraft(
  subject: string,
  body: string,
  language: string,
  customerInfo: string,
  extractedPoints: { productInterested: string; quantity: string; deliveryRequired: string },
  customerContext: string
): Promise<{ subject: string; body: string }> {
  const langLabel = language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文';
  const isUserGuided = customerContext && customerContext.length < 500 && !customerContext.includes('\n最近互动');

  let instructions = '';
  if (isUserGuided) {
    instructions = `\n## ⚠️ 用户指定要点（严格遵循）\n${customerContext}\n`;
  } else if (customerContext) {
    instructions = `\n## 客户背景\n${customerContext}\n`;
  }

  const prompt = `你是资深外贸业务员，请生成专业邮件回复。

${customerInfo ? `客户: ${customerInfo}` : ''}${instructions}
邮件: ${subject}
内容: ${body.slice(0, 3000)}
要点: ${extractedPoints.productInterested || ''} / ${extractedPoints.quantity || ''} / ${extractedPoints.deliveryRequired || ''}

回复要求:
1. 语言: ${langLabel}
2. ${isUserGuided ? '严格按用户要点生成' : '简洁扼要，抓住邮件核心诉求'}
3. ${isUserGuided ? '' : '字数不超过200字，条理清晰'}
4. 回复格式必须使用 Markdown:
   - 用 **粗体** 突出关键信息
   - 如有报价/规格用 - 列表展示
   - 段落简短，2-3段即可
5. 友好结尾

返回纯JSON（不要\`\`\`标记）:
{"subject":"Re: 原标题","body":"Markdown格式正文"}`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch {}
  return { subject: `Re: ${subject}`, body: `感谢您的来信，我们会尽快回复。` };
}
