declare module "@ai16z/eliza" {
    export interface Plugin {
        name: string;
        description?: string;
        actions?: any[];
        evaluators?: any[];
        providers?: any[];
        services?: any[];
    }

    export interface Provider {
        name: string;
        description?: string;
        get(runtime: IAgentRuntime, message: Memory, state?: State): Promise<string>;
        getState?(memory: Memory, state: State): Promise<State>;
    }

    export interface Memory {
        runtime: IAgentRuntime;
        id: string;
        roomId: string;
        userId: string;
        agentId: string;
        content: {
            text: string;
            action?: string;
            source?: string;
        };
        createdAt: number;
        embedding?: number[];
    }

    export interface State {
        roomId: string;
        userId: string;
        userName?: string;
        userScreenName?: string;
        source?: string;
        [key: string]: any;
    }

    export interface Action {
        name: string;
        description: string;
        handler: (params: any) => Promise<any>;
        template?: string;
    }

    export interface IAgentRuntime {
        agentId?: string;
        serverUrl?: string;
        token?: string | null;
        databaseAdapter?: IDatabaseAdapter;
        getSetting(key: string): string | null;
        character: Character;
        settings: Settings;
        state: State;
        memory: Memory[];
        evaluators: Evaluator[];
        plugins: Plugin[];
        providers: Provider[];
        actions: Action[];
        services: Service[];
        managers: IMemoryManager[];
    }
}
