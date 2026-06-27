const API_URL = 'https://api.siliconflow.cn/v1/chat/completions';

// 按任务分配模型（优先使用免费/低价模型）
const MODEL_CONFIG = {
  // 日常简单任务：分类、提取 → 用最便宜的
  classification: ['Qwen/Qwen2.5-7B-Instruct'],
  extraction: ['Qwen/Qwen2.5-7B-Instruct'],
  // 邮件草稿生成 → 中等模型即可
  draft: ['Qwen/Qwen2.5-7B-Instruct', 'Qwen/Qwen3-8B', 'Qwen/Qwen2.5-14B-Instruct'],
  // Prompt 生成 → 便宜模型
  prompt: ['Qwen/Qwen2.5-7B-Instruct'],
};

function getApiKey(): string {
  return process.env.SILICONFLOW_API_KEY || '';
}

async function callAI(
  messages: { role: string; content: string }[],
  task: keyof typeof MODEL_CONFIG = 'draft'
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
        body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2048 }),
      });
      const data = await res.json();

      if (data.code === 30001) {
        lastError = `账户余额不足，请在 https://siliconflow.cn 充值`;
        continue;
      }
      if (data.code === 30003 || data.code === 30007) {
        continue; // 模型不可用
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

  const prompt = `你是资深外贸业务员，请生成一封专业、美观的邮件回复。

${customerInfo ? `客户: ${customerInfo}` : ''}${instructions}
邮件: ${subject}
内容: ${body.slice(0, 3000)}
要点: ${extractedPoints.productInterested || ''} / ${extractedPoints.quantity || ''} / ${extractedPoints.deliveryRequired || ''}

回复要求:
1. 语言: ${langLabel}
2. ${isUserGuided ? '严格按用户要点生成' : '简洁扼要，抓住邮件核心诉求'}
3. ${isUserGuided ? '' : '字数不超过200字，条理清晰'}
4. 格式要求（必须使用 Markdown 排版，确保邮件美观专业）:
   - 标题用 ## 开头（如 ## 关于XX的回复）
   - 用 **粗体** 突出关键信息（产品名、价格、交期等）
   - 如有报价/规格/数量等数据，用 - 列表展示
   - 每个要点之间用空行分隔，2-3个段落
   - 使用 > 引用标注特别说明
5. 友好商务结尾，包含期待回复等礼貌用语

返回纯JSON（不要\`\`\`标记）:
{"subject":"Re: 原标题","body":"Markdown格式正文，段落间用空行分隔"}`;

  try {
    const result = await callAI([{ role: 'user', content: prompt }], 'draft');
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      return { subject: parsed.subject, body: parsed.body };
    }
  } catch {}
  return { subject: `Re: ${subject}`, body: `## 感谢您的来信\n\n我们已收到您的询价，正在确认相关信息。\n\n> 如有紧急需求，请随时联系我们。\n\n**期待与您的合作！**` };
}
