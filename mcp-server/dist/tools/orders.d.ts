import { z } from 'zod';
export declare const orderTools: ({
    name: string;
    description: string;
    schema: {
        status: z.ZodOptional<z.ZodString>;
        customerId: z.ZodOptional<z.ZodString>;
        search: z.ZodOptional<z.ZodString>;
        page: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        pageSize: z.ZodDefault<z.ZodOptional<z.ZodNumber>>;
        orderId?: undefined;
        items?: undefined;
        notes?: undefined;
        deliveryDate?: undefined;
    };
    handler: (args: {
        status?: string;
        customerId?: string;
        search?: string;
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
        orderId: z.ZodString;
        status?: undefined;
        customerId?: undefined;
        search?: undefined;
        page?: undefined;
        pageSize?: undefined;
        items?: undefined;
        notes?: undefined;
        deliveryDate?: undefined;
    };
    handler: (args: {
        orderId: string;
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
        items: z.ZodArray<z.ZodObject<{
            productId: z.ZodString;
            quantity: z.ZodNumber;
            unitPrice: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            productId: string;
            quantity: number;
            unitPrice?: number | undefined;
        }, {
            productId: string;
            quantity: number;
            unitPrice?: number | undefined;
        }>, "many">;
        status: z.ZodDefault<z.ZodOptional<z.ZodEnum<["pending", "processing", "shipped", "delivered", "cancelled"]>>>;
        notes: z.ZodOptional<z.ZodString>;
        deliveryDate: z.ZodOptional<z.ZodString>;
        search?: undefined;
        page?: undefined;
        pageSize?: undefined;
        orderId?: undefined;
    };
    handler: (args: {
        customerId: string;
        items: Array<{
            productId: string;
            quantity: number;
            unitPrice?: number;
        }>;
        status?: string;
        notes?: string;
        deliveryDate?: string;
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
        orderId: z.ZodString;
        status: z.ZodEnum<["pending", "processing", "shipped", "delivered", "cancelled"]>;
        customerId?: undefined;
        search?: undefined;
        page?: undefined;
        pageSize?: undefined;
        items?: undefined;
        notes?: undefined;
        deliveryDate?: undefined;
    };
    handler: (args: {
        orderId: string;
        status: string;
    }) => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
    }>;
})[];
