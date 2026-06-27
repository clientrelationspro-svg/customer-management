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
export {};
