'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, User, Bot, ArrowRight, RefreshCw, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import MarkdownEditor, { markdownToHtml } from '@/components/ui/MarkdownEditor';

interface Props {
  inquiryId: string;
  customerId?: string;
  customerName?: string;
  inquirySubject?: string;
  inquiryBody?: string;
  onDraftReady: (subject: string, body: string) => void;
}

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export default function ConversationEmailBuilder({ inquiryId, customerId, customerName, inquirySubject, inquiryBody, onDraftReady }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [context, setContext] = useState<any>({});
  const [draft, setDraft] = useState<{ subject: string; body: string } | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 加载上下文
  useEffect(() => {
    loadContext();
  }, [customerId]);

  const loadContext = async () => {
    const ctx: any = {};
    try {
      // 用户角色
      const meRes = await fetch('/api/auth/me');
      const me = await meRes.json();
      if (me.success) ctx.businessRole = me.data.businessRole || 'supplier';

      // 客户信息
      if (customerId) {
        const cRes = await fetch(`/api/customers/${customerId}`);
        const c = await cRes.json();
        if (c.success) ctx.customer = c.data;

        // 开发方案
        const pRes = await fetch(`/api/development-plans?customerId=${customerId}`);
        const p = await pRes.json();
        if (p.success && p.data) ctx.plan = p.data;

        // 跟进历史
        const fRes = await fetch(`/api/follow-ups?customerId=${customerId}&limit=5`);
        const f = await fRes.json();
        if (f.success) ctx.followUps = f.data;
      }
    } catch {}
    setContext(ctx);

    // 初始系统消息
    const roleLabel = ctx.businessRole === 'buyer' ? '采购商' : ctx.businessRole === 'middleman' ? '中间商' : '供应商';
    const initialMsg = buildInitialMessage(ctx, roleLabel);
    setMessages([{ role: 'system', content: initialMsg }]);
  };

  const buildInitialMessage = (ctx: any, roleLabel: string) => {
    const c = ctx.customer;
    const p = ctx.plan;
    const lines: string[] = [];
    lines.push(`我是你的外贸助手。你正以**${roleLabel}**身份回复${customerName || '客户'}的邮件。`);
    if (c) lines.push(`\n📋 客户档案: ${c.companyName || ''} ${c.country ? '(' + c.country + ')' : ''} ${c.industry || ''} ${c.level ? c.level + '级' : ''}`);
    if (p) {
      lines.push(`📌 开发目标: ${p.goal || ''} | 阶段: ${p.stage || ''}`);
      if (p.lastQuote) lines.push(`💰 最新报价: ${p.lastQuote}`);
    }
    if (ctx.followUps?.length) {
      lines.push(`💬 最近互动: ${ctx.followUps.slice(0, 3).map((f: any) => `${new Date(f.lastFollowUpDate).toLocaleDateString('zh-CN')} ${f.nextAction || f.contactMethod}`).join(' | ')}`);
    }
    lines.push(`\n邮件主题: ${inquirySubject || ''}`);
    lines.push(`\n你想怎么回复？可以先告诉我这封邮件的核心目的。`);
    return lines.join('\n');
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);

    setLoading(true);
    try {
      const apiKey = process.env.NEXT_PUBLIC_SILICONFLOW_API_KEY || '';
      const role = context.businessRole || 'supplier';
      const roleLabel = role === 'buyer' ? '采购商' : role === 'middleman' ? '中间商' : '供应商';

      // 构建对话历史
      const chatMessages = [
        { role: 'system', content: `你是资深外贸业务专家，以${roleLabel}身份引导用户完成邮件回复。\n
用户背景:\n${JSON.stringify({ customer: context.customer?.companyName, plan: context.plan?.goal, lastQuote: context.plan?.lastQuote, role })}` },
        ...messages.filter(m => m.role !== 'system').map(m => ({ role: m.role as any, content: m.content })),
        { role: 'user', content: userMsg },
      ];

      // 判断是否需要生成草稿（用户说"可以了"、"生成吧"等）
      const shouldDraft = /可以了|生成吧|就这样|结束|完成|好了|ok|done|yes that/i.test(userMsg);

      const res = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer sk-jgbhxrvhddhyftssclsxybloybwlcgwqoiwwweeguqpqwiti` },
        body: JSON.stringify({
          model: 'deepseek-ai/DeepSeek-V3',
          messages: chatMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) throw new Error('AI error');
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || '';

      if (shouldDraft) {
        // 生成最终草稿
        const draftRes = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer sk-jgbhxrvhddhyftssclsxybloybwlcgwqoiwwweeguqpqwiti` },
          body: JSON.stringify({
            model: 'deepseek-ai/DeepSeek-V3',
            messages: [
              ...chatMessages,
              { role: 'assistant', content: reply },
              { role: 'user', content: `好的，请根据以上所有对话内容，生成最终回复邮件。JSON格式返回：
{"subject":"回复主题（保留Re:前缀）","body":"Markdown格式正文"}` }
            ],
            temperature: 0.7, max_tokens: 2048,
          }),
        });
        const draftData = await draftRes.json();
        const draftContent = draftData.choices?.[0]?.message?.content || '';
        const jsonMatch = draftContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          setDraft(parsed);
          onDraftReady(parsed.subject, parsed.body);
        }
        setMessages(prev => [...prev, { role: 'assistant', content: reply + '\n\n✅ 草稿已生成，请在下方编辑器中查看和调整。' }]);
      } else {
        // 继续引导
        setMessages(prev => [...prev, { role: 'assistant', content: reply }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: '抱歉，AI 暂时无法响应。请重试。' }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight); }, [messages]);

  return (
    <div className="border border-green-200 rounded-xl overflow-hidden bg-white">
      {/* 头部 */}
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 px-4 py-2.5 border-b border-green-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-green-600" />
        <span className="text-sm font-medium text-green-800">对话式邮件生成</span>
        <span className="text-[10px] text-green-500 ml-auto">逐步引导 · AI 辅助</span>
      </div>

      {/* 对话区 */}
      <div ref={scrollRef} className="h-[350px] overflow-y-auto p-3 space-y-3 bg-gray-50/50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
              m.role === 'user' ? 'bg-blue-600 text-white' :
              m.role === 'system' ? 'bg-green-50 text-green-800 border border-green-100' :
              'bg-white text-gray-700 border border-gray-200'
            }`}>
              <div className="flex items-center gap-1.5 mb-0.5">
                {m.role === 'system' ? <Bot className="w-3.5 h-3.5 text-green-600" /> :
                 m.role === 'assistant' ? <Bot className="w-3.5 h-3.5 text-gray-400" /> :
                 <User className="w-3.5 h-3.5 text-blue-300" />}
                <span className="text-[10px] opacity-60">
                  {m.role === 'system' ? '系统' : m.role === 'assistant' ? 'AI 助手' : '你'}
                </span>
              </div>
              <div className="whitespace-pre-wrap leading-relaxed text-xs">{m.content}</div>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-white border border-gray-200 rounded-xl px-3 py-2 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
              <span className="text-xs text-gray-400">思考中...</span>
            </div>
          </div>
        )}
      </div>

      {/* 输入区 */}
      <div className="border-t border-gray-100 p-2 flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
          placeholder="输入回复要点，或说「可以了」生成草稿..."
          className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
          disabled={loading}
        />
        <button onClick={handleSend} disabled={loading || !input.trim()}
          className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
