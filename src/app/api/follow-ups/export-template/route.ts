import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let prompt = '';

    if (customerId) {
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          contacts: true,
          keyContact: true,
        },
      });

      if (!customer) {
        return NextResponse.json({ error: '客户不存在' }, { status: 404 });
      }

      // AI 提示词头部
      prompt += `你是一名专业的外贸业务员。请为以下客户生成开发记录和沟通话术。\n\n`;

      // 客户信息
      prompt += `## 客户信息\n`;
      prompt += `- 公司名称: ${customer.companyName}\n`;
      if (customer.industry) prompt += `- 行业: ${customer.industry}\n`;
      if (customer.country) prompt += `- 国家: ${customer.country}\n`;
      if (customer.enterpriseScale) prompt += `- 规模: ${customer.enterpriseScale}\n`;
      if (customer.address) prompt += `- 地址: ${customer.address}\n`;

      // 关键联系人
      const kc = customer.keyContact;
      if (kc) {
        prompt += `\n## 关键联系人\n`;
        prompt += `- 姓名: ${kc.name}\n`;
        if (kc.position) prompt += `- 职位: ${kc.position}\n`;
        if (kc.phone) prompt += `- 电话: ${kc.phone}\n`;
        if (kc.email) prompt += `- 邮箱: ${kc.email}\n`;
        if (kc.whatsapp) prompt += `- WhatsApp: ${kc.whatsapp}\n`;
      }

      // 所有联系人
      if (customer.contacts.length > 0) {
        prompt += `\n## 所有联系人\n`;
        customer.contacts.forEach((c, i) => {
          prompt += `${i + 1}. ${c.name}`;
          if (c.position) prompt += ` - ${c.position}`;
          if (c.phone) prompt += ` - ${c.phone}`;
          if (c.whatsapp) prompt += ` - ${c.whatsapp}`;
          prompt += `\n`;
        });
      }

      // 生成要求
      prompt += `\n## 请生成以下内容\n`;
      prompt += `1. 一条开发记录，分析客户当前阶段并制定开发策略\n`;
      prompt += `2. 2-3条沟通话术（WhatsApp/邮件/电话），内容自然专业\n\n`;

      // 格式说明
      prompt += `## 输出格式（严格遵守）\n`;
      prompt += `\`\`\`\n`;
      prompt += `=== 新增开发 ===\n`;
      prompt += `followUpMatters: "开发,报价"       # 多选用逗号分隔: 开发,报价,样品,谈判,成交,其他\n`;
      prompt += `contactMethod: "whatsapp"          # phone,email,whatsapp,wechat,other\n`;
      prompt += `nextAction: "发送报价单跟进邮件"    # 下一步动作\n`;
      prompt += `priority: "high"                   # high,medium,low\n`;
      prompt += `status: "in_progress"              # in_progress,completed,archived\n`;
      prompt += `lastFollowUpDate: "${new Date().toISOString().split('T')[0]}"\n`;
      prompt += `nextFollowUpDate: ""               # 下次开发日期 YYYY-MM-DD\n`;
      prompt += `remarks: "客户对价格比较敏感"       # 备注\n\n`;

      prompt += `=== 新增话术 ===\n\n`;
      prompt += `type: "whatsapp"\n\n`;
      prompt += `title: "话术标题"\n\n`;
      prompt += `content: |\n`;
      prompt += `  话术内容（多行）\n\n`;
      prompt += `nextFollowUpDate: ""\n\n`;

      prompt += `type: "email"\n\n`;
      prompt += `title: "邮件标题"\n\n`;
      prompt += `content: |\n`;
      prompt += `  邮件内容（多行）\n\n`;
      prompt += `nextFollowUpDate: ""\n`;
      prompt += `\`\`\`\n`;
    } else {
      // 通用模板
      prompt += `你是一名专业的外贸业务员。请为以下客户生成开发记录和沟通话术。\n\n`;
      prompt += `## 客户信息\n`;
      prompt += `- 公司名称: [请填写客户公司名称]\n`;
      prompt += `- 行业: [请填写行业]\n`;
      prompt += `- 国家: [请填写国家]\n`;
      prompt += `- 联系人: [请填写联系人名称]\n`;
      prompt += `- 电话: [请填写电话]\n`;
      prompt += `- WhatsApp: [请填写WhatsApp]\n\n`;

      prompt += `## 请生成以下内容\n`;
      prompt += `1. 一条开发记录\n`;
      prompt += `2. 2-3条沟通话术\n\n`;

      prompt += `## 输出格式\n`;
      prompt += `\`\`\`\n`;
      prompt += `=== 新增开发 ===\n`;
      prompt += `phone: ""\nwhatsapp: ""\nemail: ""\n`;
      prompt += `followUpMatters: ""  # 开发,报价,样品,谈判,成交,其他\n`;
      prompt += `contactMethod: ""   # phone,email,whatsapp,wechat,other\n`;
      prompt += `nextAction: ""\npriority: "medium"  # high,medium,low\n`;
      prompt += `status: "in_progress"\n`;
      prompt += `lastFollowUpDate: "${new Date().toISOString().split('T')[0]}"\n`;
      prompt += `nextFollowUpDate: ""\nremarks: ""\n\n`;

      prompt += `=== 新增话术 ===\n`;
      prompt += `type: "whatsapp"\ntitle: ""\ncontent: |\n  话术内容\nnextFollowUpDate: ""\n\n`;
      prompt += `type: "email"\ntitle: ""\ncontent: |\n  邮件内容\nnextFollowUpDate: ""\n`;
      prompt += `\`\`\`\n`;
    }

    // 原始格式说明（供导入用）
    prompt += `\n---\n`;
    prompt += `💡 将以上 \`=== 新增开发 ===\` 和 \`=== 新增话术 ===\` 之间的内容复制后，可在系统导入页面粘贴导入。\n`;

    const fileName = customerId ? `follow-up-prompt-${customerId}.txt` : `follow-up-prompt.txt`;

    return new NextResponse(prompt, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting template:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
