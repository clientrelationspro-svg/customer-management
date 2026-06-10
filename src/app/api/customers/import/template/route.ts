import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';

export async function GET() {
  try {
    // 使用英文header避免编码问题，用户可以在Excel中手动改为中文
    const templateData = [
      {
        'company_name': '示例公司有限公司',
        'enterprise_scale': '中型企业',
        'country': '中国',
        'establish_date': '2020-01-01',
        'address': '上海市浦东新区XX路XX号',
        'reg_capital': '1000万人民币',
        'industry': '信息技术',
        'employee_count': '150',
        'notes': '重要客户，优先服务',
        'phone': '021-12345678',
        'fax': '021-87654321',
        'website': 'https://www.example.com',
        'email': 'contact@example.com',
        'social_media': '微信：example_wx',
        'contact_address': '上海市静安区XX路XX号',
        'contact_name': '张三',
        'contact_position': '采购经理',
        'contact_email': 'zhangsan@example.com',
        'contact_whatsapp': '+86 138 1234 5678',
        'contact_phone': '021-11111111',
        'contact_remarks': '主要对接人',
      },
      {
        'company_name': 'ABC Trading Co., Ltd.',
        'enterprise_scale': '小型企业',
        'country': '美国',
        'establish_date': '2018-05-15',
        'address': '123 Main St, New York, NY 10001',
        'reg_capital': '$500,000',
        'industry': '贸易',
        'employee_count': '30',
        'notes': '',
        'phone': '+1-212-555-0123',
        'fax': '+1-212-555-0124',
        'website': 'https://www.abctrading.com',
        'email': 'info@abctrading.com',
        'social_media': 'LinkedIn: abc-trading',
        'contact_address': '456 Broadway, New York, NY 10002',
        'contact_name': 'John Smith',
        'contact_position': 'Sales Director',
        'contact_email': 'john.smith@abctrading.com',
        'contact_whatsapp': '+1-212-555-0125',
        'contact_phone': '+1-212-555-0126',
        'contact_remarks': '',
      },
    ];
    
    // 创建工作簿
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    
    // 设置列宽
    const colWidths = [
      { wch: 25 }, // company_name
      { wch: 15 }, // enterprise_scale
      { wch: 10 }, // country
      { wch: 12 }, // establish_date
      { wch: 30 }, // address
      { wch: 18 }, // reg_capital
      { wch: 15 }, // industry
      { wch: 12 }, // employee_count
      { wch: 25 }, // notes
      { wch: 18 }, // phone
      { wch: 18 }, // fax
      { wch: 25 }, // website
      { wch: 25 }, // email
      { wch: 20 }, // social_media
      { wch: 30 }, // contact_address
      { wch: 15 }, // contact_name
      { wch: 15 }, // contact_position
      { wch: 25 }, // contact_email
      { wch: 20 }, // contact_whatsapp
      { wch: 18 }, // contact_phone
      { wch: 20 }, // contact_remarks
    ];
    worksheet['!cols'] = colWidths;
    
    XLSX.utils.book_append_sheet(workbook, worksheet, '客户导入模板');
    
    // 生成Excel文件
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const excelData = new Uint8Array(excelBuffer);
    
    // 返回文件
    return new NextResponse(excelData, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="customer_import_template.xlsx"',
      },
    });
  } catch (error) {
    console.error('Error generating template:', error);
    return NextResponse.json(
      { success: false, error: '生成模板失败' },
      { status: 500 }
    );
  }
}
