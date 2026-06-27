export declare const dashboardTools: {
    name: string;
    description: string;
    schema: {};
    handler: () => Promise<{
        content: {
            type: "text";
            text: string;
        }[];
        isError?: undefined;
    } | {
        content: {
            type: "text";
            text: string;
        }[];
        isError: boolean;
    }>;
}[];
