import type { DatalogueConfig, QueryOptions, QueryResult } from './types.js';
export declare class Datalogue {
    private readonly config;
    private readonly adapter;
    private readonly ai;
    private readonly auditLog;
    private readonly contextManager;
    private cachedSchema;
    constructor(config: DatalogueConfig);
    private resolveAdapter;
    private resolveAIProvider;
    private getSchema;
    query(naturalLanguageQuery: string, options?: QueryOptions): Promise<QueryResult>;
    suggestQueries(count?: number): Promise<string[]>;
    refreshSchema(): Promise<void>;
    close(): Promise<void>;
    buildSystemPrompt(): Promise<string>;
}
//# sourceMappingURL=Datalogue.d.ts.map