import { z } from 'zod';
export declare const productTools: ({
    name: string;
    description: string;
    schema: {
        search: z.ZodOptional<z.ZodString>;
        category: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodString>;
        lowStock: z.ZodOptional<z.ZodBoolean>;
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        productId?: undefined;
        stock?: undefined;
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
        productId: z.ZodString;
        search?: undefined;
        category?: undefined;
        status?: undefined;
        lowStock?: undefined;
        page?: undefined;
        pageSize?: undefined;
        stock?: undefined;
    };
    handler: (args: {
        productId: string;
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
        productId: z.ZodString;
        stock: z.ZodNumber;
        search?: undefined;
        category?: undefined;
        status?: undefined;
        lowStock?: undefined;
        page?: undefined;
        pageSize?: undefined;
    };
    handler: (args: {
        productId: string;
        stock: number;
    }) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
})[];
