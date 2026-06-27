import { z } from 'zod';
/**
 * Customer tools for MCP server
 */
export declare const customerTools: ({
    name: string;
    description: string;
    schema: {
        search: z.ZodOptional<z.ZodString>;
        level: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        customerId?: undefined;
        companyName?: undefined;
        country?: undefined;
        industry?: undefined;
        email?: undefined;
        phone?: undefined;
        website?: undefined;
        address?: undefined;
        notes?: undefined;
    };
    handler: (args: {
        search?: string;
        level?: string;
        status?: string;
        page?: number;
        pageSize?: number;
    }) => Promise<{
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
        search?: undefined;
        level?: undefined;
        status?: undefined;
        page?: undefined;
        pageSize?: undefined;
        companyName?: undefined;
        country?: undefined;
        industry?: undefined;
        email?: undefined;
        phone?: undefined;
        website?: undefined;
        address?: undefined;
        notes?: undefined;
    };
    handler: (args: {
        customerId: string;
    }) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
} | {
    name: string;
    description: string;
    schema: {
        companyName: z.ZodString;
        country: z.ZodOptional<z.ZodString>;
        industry: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        website: z.ZodOptional<z.ZodString>;
        address: z.ZodOptional<z.ZodString>;
        level: z.ZodOptional<z.ZodEnum<["A", "B", "C", "D", "E"]>>;
        notes: z.ZodOptional<z.ZodString>;
        search?: undefined;
        status?: undefined;
        page?: undefined;
        pageSize?: undefined;
        customerId?: undefined;
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
        companyName: z.ZodOptional<z.ZodString>;
        country: z.ZodOptional<z.ZodString>;
        industry: z.ZodOptional<z.ZodString>;
        email: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        level: z.ZodOptional<z.ZodEnum<["A", "B", "C", "D", "E"]>>;
        status: z.ZodOptional<z.ZodEnum<["active", "inactive"]>>;
        notes: z.ZodOptional<z.ZodString>;
        search?: undefined;
        page?: undefined;
        pageSize?: undefined;
        website?: undefined;
        address?: undefined;
    };
    handler: (args: Record<string, unknown>) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
})[];
