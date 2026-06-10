import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// 导出跟进+话术模板
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get('customerId');

    let md = `# 客户跟进导入模板\n\n`;
    md += `> 📋 将本文件交给 AI 填写，然后导入系统。\n`;
    md += `> 💡 AI 会识别 `;
    md += `\`=== 新增跟进 ===\` 和 \`=== 新增话术 ===\` 标记并填写对应内容。\n\n`;

    if (customerId) {
      // 查询客户信息
      const customers = await prisma.$queryRaw<any[]>`
        SELECT id, company_name, phone, email FROM customers WHERE id = ${customerId} LIMIT 1
      `;
      if (!customers[0]) {
        return NextResponse.json({ error: '客户不存在' }, { status: 404 });
      }
      const customer = customers[0];

      md += `## 客户: ${customer.company_name}\n\n`;
      md += `> 📱 电话: ${customer.phone || '无'} | 📧 邮箱: ${customer.email || '无'}\n\n`;

      // 已有跟进记录（参考）
      const followUps = await prisma.$queryRaw<any[]>`
        SELECT * FROM follow_ups WHERE customer_id = ${customerId} ORDER BY created_at DESC LIMIT 5
      `;
      if (followUps.length > 0) {
        md += `### 📝 已有跟进记录（供参考）\n\n`;
        followUps.forEach((f, i) => {
          md += `| 字段 | 值 |\n|------|----|\n`;
          md += `| 日期 | ${new Date(f.created_at).toLocaleDateString('zh-CN')} |\n`;
          md += `| 电话 | ${f.phone || '-'} |\n`;
          md += `| WhatsApp | ${f.whatsapp || '-'} |\n`;
          md += `| 邮箱 | ${f.email || '-'} |\n`;
          md += `| 跟进事宜 | ${f.follow_up_matters || '-'} |\n`;
          md += `| 联系方式 | ${f.contact_method || '-'} |\n`;
          md += `| 下一步动作 | ${f.next_action || '-'} |\n`;
          md += `| 优先级 | ${f.priority || '-'} |\n`;
          md += `| 状态 | ${f.status || '-'} |\n`;
          md += `| 上次跟进 | ${f.last_follow_up_date ? new Date(f.last_follow_up_date).toLocaleDateString('zh-CN') : '-'} |\n`;
          md += `| 下次跟进 | ${f.next_follow_up_date ? new Date(f.next_follow_up_date).toLocaleDateString('zh-CN') : '-'} |\n\n`;
        });
      }

      // 已有话术（参考）
      const scripts = await prisma.$queryRaw<any[]>`
        SELECT * FROM follow_up_scripts WHERE customer_id = ${customerId} ORDER BY created_at DESC LIMIT 10
      `;
      if (scripts.length > 0) {
        md += `### 💬 已有话术（供参考）\n\n`;
        scripts.forEach(s => {
          md += `- **${s.title}** (${s.type}) | 创建于 ${new Date(s.created_at).toLocaleDateString('zh-CN')}\n`;
          md += `  \`\`\`\n  ${s.content.replace(/\n/g, '\n  ')}\n  \`\`\`\n\n`;
        });
      }
    }

    // 空白模板部分
    md += `---\n\n`;
    md += `## ⬇️ 以下为空白模板，请 AI 填写后导入 ⬇️\n\n`;

    md += `\`\`\`yaml\n`;
    md += `# ==========================================\n`;
    md += `# 客户跟进记录 - 空白模板\n`;
    md += `# 说明:\n`;
    md += `#   followUpMatters: 开发,报价,样品,谈判,成交,其他 (多选用逗号分隔)\n`;
    md += `#   contactMethod: phone, email, whatsapp, wechat, other\n`;
    md += `#   priority: high, medium, low\n`;
    md += `#   status: in_progress, completed, archived\n`;
    md += `#   lastFollowUpDate / nextFollowUpDate: YYYY-MM-DD 格式\n`;
    md += `# ==========================================\n\n`;

    md += `=== 新增跟进 ===\n`;
    md += `phone: ""                 # 电话号码\n`;
    md += `whatsapp: ""              # WhatsApp 号码\n`;
    md += `email: ""                 # 邮箱地址\n`;
    md += `followUpMatters: ""       # 跟进事宜 (开发,报价,样品,谈判,成交,其他)\n`;
    md += `contactMethod: ""         # 联系方式 (phone,email,whatsapp,wechat,other)\n`;
    md += `nextAction: ""            # 下一步动作\n`;
    md += `priority: "medium"        # 优先级 (high,medium,low)\n`;
    md += `status: "in_progress"     # 状态 (in_progress,completed,archived)\n`;
    md += `lastFollowUpDate: "${new Date().toISOString().split('T')[0]}"  # 上次跟进日期\n`;
    md += `nextFollowUpDate: ""      # 下次跟进日期\n`;
    md += `remarks: ""               # 备注\n\n`;

    md += `=== 新增话术 ===\n`;
    md += `type: "whatsapp"           # 类型: whatsapp, email, phone\n`;
    md += `title: ""                  # 话术标题\n`;
    md += `content: |\n`;
    md += `  Hi [客户名称]!\n`;
    md += `  我是 [您的名字]，来自 [公司名称]。\n`;
    md += `  关于 [项目/产品名称]，想跟您沟通一下。\n`;
    md += `  期待您的回复！\n`;
    md += `nextFollowUpDate: ""       # 下次跟进日期 (可选)\n`;
    md += `# --- (用 type: 作为新话术分隔符) ---\n\n`;

    md += `type: "email"\n`;
    md += `title: ""\n`;
    md += `content: |\n`;
    md += `  尊敬的 [客户名称]：\n`;
    md += `  \n`;
    md += `  感谢您的询价！以下是我们的报价方案。\n`;
    md += `  如有疑问请随时联系。\n`;
    md += `  \n`;
    md += `  此致\n`;
    md += `  [您的名字]\n`;
    md += `nextFollowUpDate: ""\n\n`;

    md += `type: "phone"\n`;
    md += `title: ""\n`;
    md += `content: |\n`;
    md += `  通话要点：\n`;
    md += `  1. 自我介绍：您好，我是 [公司] 的 [名字]\n`;
    md += `  2. 目的说明：关于 [项目]，想跟您电话沟通\n`;
    md += `  3. 关键问题确认\n`;
    md += `  4. 下一步安排\n`;
    md += `nextFollowUpDate: ""\n`;
    md += `\`\`\`\n`;

    const fileName = customerId ? `follow-up-template-${customerId}.md` : `follow-up-template.md`;

    return new NextResponse(md, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error('Error exporting template:', error);
    return NextResponse.json({ error: '导出失败' }, { status: 500 });
  }
}
