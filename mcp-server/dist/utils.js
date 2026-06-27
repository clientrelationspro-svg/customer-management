/**
 * Format a number as currency string
 */
export function formatCurrency(amount) {
    if (amount === null || amount === undefined)
        return '—';
    const num = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `$${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}
/**
 * Format a date to a readable string
 */
export function formatDate(date) {
    if (!date)
        return '—';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' });
}
/**
 * Truncate text for display
 */
export function truncate(text, maxLength = 100) {
    if (!text)
        return '—';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}
/**
 * Safely parse JSON string
 */
export function safeJsonParse(str, fallback) {
    if (!str)
        return fallback;
    try {
        return JSON.parse(str);
    }
    catch {
        return fallback;
    }
}
/**
 * Build a search condition for Prisma 'contains' queries
 */
export function buildSearchFilter(field) {
    return field ? { contains: field } : undefined;
}
