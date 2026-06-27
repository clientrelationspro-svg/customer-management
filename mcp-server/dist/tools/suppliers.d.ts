import { z } from 'zod';
export declare const supplierTools: ({
    name: string;
    description: string;
    schema: {
        search: z.ZodOptional<z.ZodString>;
        cooperationStatus: z.ZodOptional<z.ZodString>;
        riskLevel: z.ZodOptional<z.ZodString>;
        starred: z.ZodOptional<z.ZodBoolean>;
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        supplierId?: undefined;
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
        supplierId: z.ZodString;
        search?: undefined;
        cooperationStatus?: undefined;
        riskLevel?: undefined;
        starred?: undefined;
        page?: undefined;
        pageSize?: undefined;
    };
    handler: (args: {
        supplierId: string;
    }) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
})[];
