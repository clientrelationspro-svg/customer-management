// 三语询价关键词库 - 用于识别客户邮件是否为询价
export const INQUIRY_KEYWORDS: Record<string, string[]> = {
  zh: [
    '询价', '报价', '价格', '多少钱', '单价', '最低价', '批发价',
    '货物', '产品目录', '样品', '起订量', '交期', '交货期', '发货',
    '采购', '订购', '下单', '进口', '进货', '求购', '需要购买',
    '规格', '参数', '材质', '尺寸', '型号',
    'FOB', 'CIF', 'CFR', 'EXW', '付款方式', '信用证', '付款条件',
    '折扣', '优惠',
  ],
  en: [
    'inquiry', 'enquiry', 'quotation', 'quote', 'price', 'pricing',
    'how much', 'cost', 'rate', 'offer', 'best price', 'competitive price',
    'catalog', 'brochure', 'sample', 'catalogue',
    'MOQ', 'minimum order', 'delivery', 'shipment', 'lead time', 'shipping',
    'purchase', 'order', 'buy', 'procurement', 'sourcing', 'import',
    'specification', 'spec', 'material', 'dimension', 'model',
    'FOB', 'CIF', 'CFR', 'EXW', 'payment term', 'L/C', 'T/T',
    'discount', 'commission',
    'interested in', 'looking for', 'would like to buy', 'need to source',
  ],
  es: [
    'cotización', 'cotizacion', 'presupuesto', 'precio', 'cuánto cuesta', 'costo',
    'cuanto vale', 'precios', 'mejor precio', 'oferta',
    'catálogo', 'catalogo', 'muestra', 'folleto', 'información',
    'MOQ', 'pedido mínimo', 'cantidad mínima', 'entrega', 'envío', 'plazo',
    'comprar', 'adquirir', 'importar', 'abastecimiento', 'proveedor',
    'especificación', 'especificacion', 'material', 'medida', 'modelo',
    'FOB', 'CIF', 'CFR', 'EXW', 'pago', 'condiciones', 'forma de pago',
    'descuento', 'comisión', 'comision',
    'interesado en', 'busco', 'necesito', 'quisiera comprar',
  ],
};

// 检测邮件语言
export function detectLanguage(subject: string, body: string): string {
  const text = (subject + ' ' + body.slice(0, 500)).toLowerCase();
  const scores: Record<string, number> = { zh: 0, en: 0, es: 0 };

  for (const lang of Object.keys(INQUIRY_KEYWORDS)) {
    for (const kw of INQUIRY_KEYWORDS[lang]) {
      if (text.includes(kw.toLowerCase())) scores[lang]++;
    }
  }

  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  return best[1] > 0 ? best[0] : 'en';
}

// 判断是否为询价邮件
export function isInquiryEmail(subject: string, body: string): { isInquiry: boolean; language: string; matchedKeywords: string[] } {
  const lang = detectLanguage(subject, body);
  const text = (subject + ' ' + body.slice(0, 1000)).toLowerCase();
  const matched: string[] = [];

  // 先查检测到的语言
  for (const kw of INQUIRY_KEYWORDS[lang] || []) {
    if (text.includes(kw.toLowerCase())) matched.push(kw);
  }
  // 补充查其他语言
  for (const l of Object.keys(INQUIRY_KEYWORDS)) {
    if (l === lang) continue;
    for (const kw of INQUIRY_KEYWORDS[l]) {
      if (text.includes(kw.toLowerCase())) matched.push(kw);
    }
  }

  // 去重去嵌套
  const unique = Array.from(new Set(matched));
  return {
    isInquiry: unique.length >= 2,
    language: lang,
    matchedKeywords: unique,
  };
}
