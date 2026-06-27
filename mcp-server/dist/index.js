#!/usr/bin/env node
/**
 * CRM MCP Server - WorkBuddy Integration
 *
 * 提供客户管理系统的 MCP 工具集，WorkBuddy 可通过 stdio 连接
 *
 * 工具列表:
 *   - list_customers / get_customer / create_customer / update_customer / delete_customer
 *   - list_orders / get_order / create_order / update_order_status
 *   - list_products / get_product / update_product_stock
 *   - list_suppliers / get_supplier
 *   - list_follow_ups / create_follow_up / update_follow_up
 *   - get_dashboard_stats
 *
 * 环境变量:
 *   DATABASE_URL - SQLite 数据库路径 (必填)
 *   默认值: file:/Users/mima0000/CodeBuddy/客户管理系统/prisma/dev.db
 */
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
// 加载 .env 文件（如果存在且 DATABASE_URL 未设置）
if (!process.env.DATABASE_URL) {
    try {
        const __dirname = dirname(fileURLToPath(import.meta.url));
        const envPath = resolve(__dirname, '..', '.env');
        const envContent = readFileSync(envPath, 'utf-8');
        for (const line of envContent.split('\n')) {
            const match = line.match(/^([^=]+)=(.*)$/);
            if (match && !process.env[match[1]]) {
                process.env[match[1]] = match[2].trim();
            }
        }
    }
    catch {
        // .env file not found, use default
        if (!process.env.DATABASE_URL) {
            process.env.DATABASE_URL = 'file:/Users/mima0000/CodeBuddy/客户管理系统/prisma/dev.db';
        }
    }
}
import { customerTools } from './tools/customers.js';
import { orderTools } from './tools/orders.js';
import { productTools } from './tools/products.js';
import { supplierTools } from './tools/suppliers.js';
import { followUpTools } from './tools/followups.js';
import { dashboardTools } from './tools/dashboard.js';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const allTools = [
    ...customerTools,
    ...orderTools,
    ...productTools,
    ...supplierTools,
    ...followUpTools,
    ...dashboardTools,
];
async function main() {
    const server = new McpServer({
        name: 'CRM客户管理系统',
        version: '1.0.0',
    });
    // 注册所有工具
    for (const tool of allTools) {
        server.tool(tool.name, tool.description, tool.schema, tool.handler);
    }
    // 使用 Stdio 传输（WorkBuddy 通过进程通信连接）
    const transport = new StdioServerTransport();
    console.error('🚀 CRM MCP Server 已启动，等待 WorkBuddy 连接...');
    console.error(`📦 已注册 ${allTools.length} 个工具`);
    await server.connect(transport);
}
main().catch((error) => {
    console.error('❌ MCP Server 启动失败:', error);
    process.exit(1);
});
