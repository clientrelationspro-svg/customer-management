import { z } from 'zod';
export declare const followUpTools: ({
    name: string;
    description: string;
    schema: {
        customerId: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        priority: z.ZodOptional<z.ZodString>;
        overdue: z.ZodOptional<z.ZodBoolean>;
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        followUpMatters?: undefined;
        contactMethod?: undefined;
        stage?: undefined;
        remarks?: undefined;
        nextFollowUpDate?: undefined;
        followUpId?: undefined;
        replySentiment?: undefined;
    };
    handler: (args: Record<string, unknown>) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    schema: {
        customerId: z.ZodString;
        followUpMatters: z.ZodString;
        contactMethod: z.ZodEnum<["电话", "邮件", "WhatsApp", "微信", "其他"]>;
        priority: z.ZodDefault<z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>>;
        stage: z.ZodOptional<z.ZodString>;
        remarks: z.ZodOptional<z.ZodString>;
        nextFollowUpDate: z.ZodOptional<z.ZodString>;
        status?: undefined;
        overdue?: undefined;
        page?: undefined;
        pageSize?: undefined;
        followUpId?: undefined;
        replySentiment?: undefined;
    };
    handler: (args: Record<string, unknown>) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    schema: {
        followUpId: z.ZodString;
        status: z.ZodOptional<z.ZodEnum<["in_progress", "completed", "archived"]>>;
        priority: z.ZodOptional<z.ZodEnum<["high", "medium", "low"]>>;
        remarks: z.ZodOptional<z.ZodString>;
        nextFollowUpDate: z.ZodOptional<z.ZodString>;
        replySentiment: z.ZodOptional<z.ZodEnum<["positive", "neutral", "negative"]>>;
        customerId?: undefined;
        overdue?: undefined;
        page?: undefined;
        pageSize?: undefined;
        followUpMatters?: undefined;
        contactMethod?: undefined;
        stage?: undefined;
    };
    handler: (args: Record<string, unknown>) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
})[];
