const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 按任务分配模型
const MODEL_CONFIG = {
  // 日常简单任务：分类、提取 → 用 7B 最便宜
  classification: ['Qwen/Qwen2.5-7B-Instruct'],
  extraction: ['Qwen/Qwen2.5-7B-Instruct'],
  // 邮件草稿：需稳定 JSON → 14B 起，8B 备用
  draft: ['Qwen/Qwen2.5-14B-Instruct', 'Qwen/Qwen3-8B', 'deepseek-ai/DeepSeek-V3'],
  // Prompt 生成 → 7B 足够
  prompt: ['Qwen/Qwen2.5-7B-Instruct'],
};

function getApiKey(): string {
  return process.env.SILICONFLOW_API_KEY || '';
}

async function callAI(
  messages: { role: string; content: string }[],
  task: keyof typeof MODEL_CONFIG = 'draft',
  maxTokens = 2048
): Promise<string> {
  const models = MODEL_CONFIG[task] || MODEL_CONFIG.draft;
  let lastError = '';

  for (const model of models) {
    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getApiKey()}`,
        },
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: maxTokens }),
      });
      const data = await res.json();

      if (data.code === 30001) {
        lastError = `账户余额不足，请在 https://siliconflow.cn 充值`;
        continue;
      }
      if (data.code === 30003 || data.code === 30007) {
        continue;
      }
      if (!res.ok) {
        lastError = `API 错误: HTTP ${res.status}`;
        continue;
      }

      const content = data.choices?.[0]?.message?.content;
      if (content) return content;
    } catch (e: any) {
      lastError = e?.message || '网络错误';
    }
  }

  throw new Error(lastError || '所有模型均不可用');
}

// 解析 AI 返回的 JSON（处理多个 JSON 对象、截断、markdown代码块等问题）
function parseAIJson(text: string): Record<string, string> | null {
  // 清理 markdown 代码块
  let cleaned = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  
  // 先尝试直接解析
  try { return JSON.parse(cleaned); } catch {}

  // 尝试合并多个 JSON 对象 {a:1}{b:2} → {a:1,b:2}
  const merged = cleaned.replace(/\}\s*\{/g, ',');
  try { return JSON.parse(merged); } catch {}

  // 提取所有 JSON 对象并合并
  const allMatches = cleaned.match(/\{[^{}]*\}/g) || [];
  if (allMatches.length >= 2) {
    const result: Record<string, string> = {};
    for (const match of allMatches) {
      try {
        Object.assign(result, JSON.parse(match));
      } catch {}
    }
    if (Object.keys(result).length > 0) return result;
  }

  // 最后尝试：宽松匹配（处理未闭合的花括号）
  const looseMatch = cleaned.match(/"subject"\s*:\s*"([^"]*)"/);
  const bodyMatch = cleaned.match(/"body"\s*:\s*"([^"]*(?:\\.[^"]*)*)"/);
  if (looseMatch) {
    return { subject: looseMatch[1], body: bodyMatch?.[1] || '' };
  }

  return null;
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
    const result = await callAI([{ role: 'user', content: prompt }], 'extraction');
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
    const result = await callAI([{ role: 'user', content: prompt }], 'classification');
    return result.split(/[,，]/).map((s: string) => s.trim()).filter(Boolean);
  } catch {}
  return [];
}

// 生成回复草稿
export async function generateReplyDraft(
  subject: string,
  body: string,
  language: string,
  customerInfo: string,
  extractedPoints: { productInterested: string; quantity: string; deliveryRequired: string },
  customerContext: string,
  senderInfo?: { name: string; company: string; role: string; description: string; contact: string; email: string } | null
): Promise<{ subject: string; body: string }> {
  const langLabel = language === 'zh' ? '中文' : language === 'en' ? '英文' : '西班牙文';
  const isUserGuided = customerContext && customerContext.length < 500 && !customerContext.includes('\n最近互动');

  let instructions = '';
  if (isUserGuided) {
    instructions = `\n## ⚠️ 用户指定要点（严格遵循）\n${customerContext}\n`;
  } else if (customerContext) {
    instructions = `\n## 客户背景\n${customerContext}\n`;
  }

  // 发件人身份（从系统设置读取，固定不可变）
  let senderBlock = '';
  if (senderInfo?.name || senderInfo?.company) {
    const roleMap: Record<string, string> = { supplier: '供应商', buyer: '采购商', middleman: '中间商' };
    senderBlock = `\n## 👤 你的身份（邮件签名必须使用以下信息）\n`;
    if (senderInfo.name) senderBlock += `- 姓名: ${senderInfo.name}\n`;
    if (senderInfo.company) senderBlock += `- 公司: ${senderInfo.company}\n`;
    if (senderInfo.description) senderBlock += `- 业务: ${senderInfo.description}\n`;
    if (senderInfo.contact) senderBlock += `- 联系方式: ${senderInfo.contact}（必须出现在结尾）\n`;
    senderBlock += `- 角色: ${roleMap[senderInfo.role] || senderInfo.role}\n`;
  }

  const prompt = `你是资深外贸业务员，请生成一封专业美观的邮件回复草稿。
${senderBlock}
${customerInfo ? `客户: ${customerInfo}` : ''}${instructions}
邮件: ${subject}
内容: ${body.slice(0, 3000)}
要点: ${extractedPoints.productInterested || ''} / ${extractedPoints.quantity || ''} / ${extractedPoints.deliveryRequired || ''}

回复要求:
1. 语言: ${langLabel}
2. ${isUserGuided ? '严格按用户要点生成' : '简洁扼要，抓住邮件核心诉求'}
3. 格式要求（必须使用 Markdown 排版）:
   - 用 **粗体** 突出关键信息
   - 如有数据用 - 列表展示，段落间空行分隔
4. 邮件结尾必须包含你的姓名、公司、联系方式（从上方"你的身份"获取）
5. 友好商务结尾

【重要】只返回一个完整的JSON对象，不要分多个JSON，格式如下:
{"subject":"Re: 原标题","body":"Markdown正文"}

直接返回JSON：`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }], 'draft', 2048);
    const parsed = parseAIJson(result);
    if (parsed?.subject && parsed?.body) {
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch {}
  return { subject: `Re: ${subject}`, body: `## 感谢您的来信\n\n我们已收到您的询价，正在确认相关信息。\n\n> 如有紧急需求，请随时联系我们。\n\n**期待与您的合作！**` };
}
