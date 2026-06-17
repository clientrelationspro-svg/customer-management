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
    body: JSON.stringify({
      model: MODEL,
      messages,
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`AI API error: ${res.status} - ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || '';
}

// 提取邮件要点
export async function extractInquiryPoints(
  subject: string,
  body: string,
  language: string
): Promise<{ productInterested: string; quantity: string; deliveryRequired: string; summary: string }> {
  const prompt = `你是一名外贸业务助手。请从以下客户邮件中提取关键信息。

邮件主题: ${subject}
邮件内容: ${body.slice(0, 3000)}

请以JSON格式返回（不要其他文字）：
{
  "productInterested": "客户感兴趣的产品",
  "quantity": "需求数量",
  "deliveryRequired": "交期要求",
  "summary": "用${language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文'}一句话总结客户的核心诉求"
}`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    // 尝试解析 JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  
  return { productInterested: '', quantity: '', deliveryRequired: '', summary: '' };
}

// 生成回复草稿
export async function generateReplyDraft(
  subject: string,
  body: string,
  language: string,
  customerInfo: string,
  extractedPoints: { productInterested: string; quantity: string; deliveryRequired: string }
): Promise<{ subject: string; body: string }> {
  const langLabel = language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文';
  const prompt = `你是一名资深外贸业务员。请根据客户邮件生成一封专业回复邮件。

客户邮件主题: ${subject}
客户邮件内容: ${body.slice(0, 3000)}
客户背景: ${customerInfo || '暂无额外信息'}
提取的邮件要点:
- 产品: ${extractedPoints.productInterested || '待确认'}
- 数量: ${extractedPoints.quantity || '待确认'}
- 交期: ${extractedPoints.deliveryRequired || '待确认'}

要求:
1. 回复语言: ${langLabel}
2. 语气专业、友好，体现诚意
3. 包含对客户询问的正面回应
4. 如能提供报价则给出报价范围（以FOB/CIF格式），否则请客户提供更多规格信息
5. 留下进一步沟通的开放式结尾

请以JSON格式返回（不要其他文字）：
{
  "subject": "回复邮件主题（保持原邮件Re:前缀）",
  "body": "回复邮件的HTML格式正文"
}`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }]);
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) return JSON.parse(jsonMatch[0]);
  } catch {}
  
  return { subject: `Re: ${subject}`, body: `<p>感谢您的询价，我们会尽快回复。</p>` };
}
