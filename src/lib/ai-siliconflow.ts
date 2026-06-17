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
  const prompt = `从以下客户邮件提取关键信息，用${langLabel}回复JSON：
邮件主题: ${subject}
邮件内容: ${body.slice(0, 3000)}
{"productInterested":"感兴趣产品","quantity":"数量","deliveryRequired":"交期要求","summary":"一句话总结"}`;
  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { productInterested: '', quantity: '', deliveryRequired: '', summary: '' };
}

// 邮件自动分类
export async function classifyEmail(
  subject: string, body: string, language: string
): Promise<string[]> {
  const prompt = `请对以下邮件进行分类，从这些标签中选择最匹配的1-3个：询价,报价跟进,催单,投诉,技术咨询,付款,物流查询,订单确认,样品需求,合作洽谈,新客户,其他
邮件主题: ${subject}
邮件内容: ${body.slice(0, 2000)}
只返回逗号分隔的标签，如: 询价,报价跟进`;
  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    return result.replace(/[^a-zA-Z\u4e00-\u9fa5,]/g, '').split(',').map(t => t.trim()).filter(Boolean);
  } catch {}
  return ['其他'];
}

// 生成回复草稿 — 注入完整客户上下文
export async function generateReplyDraft(
  subject: string,
  body: string,
  language: string,
  customerInfo: string,
  extractedPoints: { productInterested: string; quantity: string; deliveryRequired: string },
  customerContext: string  // 客户历史互动 / 或用户引导指令
): Promise<{ subject: string; body: string }> {
  const langLabel = language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文';

  // 判断是用户引导指令还是客户上下文
  const isUserGuided = customerContext && customerContext.length < 500 && !customerContext.includes('\n最近互动');
  
  let instructions = '';
  if (isUserGuided) {
    instructions = `\n## ⚠️ 用户指定回复要点（必须严格按照以下指令生成回复）\n${customerContext}\n`;
  } else if (customerContext) {
    instructions = `\n## 客户历史互动与背景（务必在回复中融合使用）\n${customerContext}\n`;
  }

  const prompt = `你是一名资深外贸业务员。请根据当前邮件和客户历史生成专业回复。

客户档案: ${customerInfo || '未知客户'}${instructions}
当前邮件主题: ${subject}
当前邮件内容: ${body.slice(0, 3000)}

提取要点:
- 产品: ${extractedPoints.productInterested || '待确认'}
- 数量: ${extractedPoints.quantity || '待确认'}
- 交期: ${extractedPoints.deliveryRequired || '待确认'}

要求:
1. 回复语言: ${langLabel}
2. ${isUserGuided ? '严格遵照用户指定要点生成，不可偏离' : '融合客户历史信息，体现"记得他"'}
3. 专业、友好，留下进一步沟通的开放式结尾
4. 如客户曾仲裁/对价格敏感，措辞格外注意

JSON格式返回：
{"subject":"回复主题（保留Re:前缀）","body":"HTML格式正文"}`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  return { subject: `Re: ${subject}`, body: `<p>感谢您的来信，我们会尽快回复。</p>` };
}
