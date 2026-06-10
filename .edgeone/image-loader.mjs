'use client'

export default function edgeoneImageLoader({ src, width, quality }) {
  // 外部图片（http/https 开头）不走万象处理，回退到默认行为
  // if (src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//')) {
  //   return '/_next/image?url=' + encodeURIComponent(src) + '&w=' + (width || 0) + '&q=' + (quality || 75);
  // }

  // 跳过 SVG/GIF/ICO（不适合光栅优化）
  var ext = src.split('?')[0].split('#')[0].split('.').pop();
  if (ext && ['svg', 'gif', 'ico'].indexOf(ext.toLowerCase()) !== -1) {
    return src;
  }

  var q = quality || 75;
  var params = [];
  if (width) params.push('thumbnail/' + width + 'x');
  params.push('quality/' + q);
  params.push('format/webp');

  var sep = src.indexOf('?') !== -1 ? '&' : '?';
  return src + sep + 'imageMogr2/' + params.join('/');
}
