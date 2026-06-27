/**
 * Format a number as currency string
 */
export declare function formatCurrency(amount: number | string | null | undefined): string;
/**
 * Format a date to a readable string
 */
export declare function formatDate(date: Date | string | null | undefined): string;
/**
 * Truncate text for display
 */
export declare function truncate(text: string | null | undefined, maxLength?: number): string;
/**
 * Safely parse JSON string
 */
export declare function safeJsonParse<T = unknown>(str: string | null | undefined, fallback: T): T;
/**
 * Build a search condition for Prisma 'contains' queries
 */
export declare function buildSearchFilter(field: string | undefined): {
    contains: string;
} | undefined;
