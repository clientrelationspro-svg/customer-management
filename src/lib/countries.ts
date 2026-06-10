// 全球国家列表（中文名称）
export const COUNTRIES = [
  // 亚洲
  '中国', '日本', '韩国', '朝鲜', '蒙古',
  '印度', '巴基斯坦', '孟加拉国', '斯里兰卡', '尼泊尔', '不丹', '马尔代夫',
  '泰国', '越南', '缅甸', '柬埔寨', '老挝', '马来西亚', '新加坡',
  '印度尼西亚', '菲律宾', '文莱',
  '阿富汗', '伊朗', '伊拉克', '沙特阿拉伯', '阿联酋', '卡塔尔', '科威特', '巴林', '阿曼', '也门',
  '约旦', '黎巴嫩', '叙利亚', '以色列', '巴勒斯坦',
  '土耳其', '格鲁吉亚', '亚美尼亚', '阿塞拜疆',
  '哈萨克斯坦', '乌兹别克斯坦', '土库曼斯坦', '吉尔吉斯斯坦', '塔吉克斯坦',
  
  // 欧洲
  '英国', '法国', '德国', '意大利', '西班牙', '葡萄牙', '荷兰', '比利时', '瑞士', '奥地利',
  '爱尔兰', '冰岛', '丹麦', '挪威', '瑞典', '芬兰', '波兰', '捷克', '斯洛伐克',
  '匈牙利', '罗马尼亚', '保加利亚', '希腊', '克罗地亚', '塞尔维亚', '斯洛文尼亚', '波黑',
  '黑山', '北马其顿', '阿尔巴尼亚', '立陶宛', '拉脱维亚', '爱沙尼亚',
  '乌克兰', '白俄罗斯', '摩尔多瓦', '俄罗斯',
  
  // 北美洲
  '美国', '加拿大', '墨西哥',
  '危地马拉', '伯利兹', '洪都拉斯', '萨尔瓦多', '尼加拉瓜', '哥斯达黎加', '巴拿马',
  
  // 南美洲
  '巴西', '阿根廷', '智利', '哥伦比亚', '秘鲁', '委内瑞拉', '厄瓜多尔', '玻利维亚', '巴拉圭', '乌拉圭',
  
  // 非洲
  '埃及', '南非', '尼日利亚', '肯尼亚', '埃塞俄比亚', '坦桑尼亚', '加纳', '摩洛哥', '阿尔及利亚', '突尼斯',
  '利比亚', '苏丹', '南苏丹', '乌干达', '刚果(金)', '刚果(布)', '安哥拉', '莫桑比克', '马达加斯加',
  '喀麦隆', '科特迪瓦', '塞内加尔', '赞比亚', '津巴布韦', '博茨瓦纳', '纳米比亚',
  
  // 大洋洲
  '澳大利亚', '新西兰', '巴布亚新几内亚', '斐济', '萨摩亚', '汤加', '瓦努阿图', '所罗门群岛',
  
  // 其他地区
  '香港', '澳门', '台湾', '波多黎各', '关岛', '北马里亚纳群岛',
];

// 英文名称映射（用于搜索）
export const COUNTRY_EN_MAP: Record<string, string> = {
  '中国': 'China',
  '美国': 'United States',
  '日本': 'Japan',
  '德国': 'Germany',
  '英国': 'United Kingdom',
  '法国': 'France',
  '韩国': 'South Korea',
  '印度': 'India',
  '巴西': 'Brazil',
  '俄罗斯': 'Russia',
  '澳大利亚': 'Australia',
  '加拿大': 'Canada',
  '意大利': 'Italy',
  '西班牙': 'Spain',
  '墨西哥': 'Mexico',
  '印度尼西亚': 'Indonesia',
  '荷兰': 'Netherlands',
  '土耳其': 'Turkey',
  '沙特阿拉伯': 'Saudi Arabia',
  '瑞士': 'Switzerland',
  '阿根廷': 'Argentina',
  '南非': 'South Africa',
  '瑞典': 'Sweden',
  '挪威': 'Norway',
  '丹麦': 'Denmark',
  '芬兰': 'Finland',
  '波兰': 'Poland',
  '比利时': 'Belgium',
  '奥地利': 'Austria',
  '泰国': 'Thailand',
  '越南': 'Vietnam',
  '新加坡': 'Singapore',
  '马来西亚': 'Malaysia',
  '菲律宾': 'Philippines',
  '新西兰': 'New Zealand',
  '阿联酋': 'UAE',
  '巴基斯坦': 'Pakistan',
};

// 搜索国家（支持中英文）
export function searchCountries(keyword: string): string[] {
  if (!keyword || keyword.trim() === '') return COUNTRIES;
  
  const lowerKeyword = keyword.toLowerCase().trim();
  
  return COUNTRIES.filter(country => {
    // 中文匹配
    if (country.toLowerCase().includes(lowerKeyword)) return true;
    
    // 英文匹配
    const enName = COUNTRY_EN_MAP[country];
    if (enName && enName.toLowerCase().includes(lowerKeyword)) return true;
    
    return false;
  });
}
