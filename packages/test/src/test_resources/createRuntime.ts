import { SqliteDatabaseAdapter } from "../adapters/sqlite.ts";
import { load } from "../../../adapter-sqlite/src/sqlite_vec.ts";
import { SqlJsDatabaseAdapter } from "../../../adapter-sqljs/src/index.ts";
import { SupabaseDatabaseAdapter } from "../../../adapter-supabase/src/index.ts";
import { DatabaseAdapter } from "@ai16z/eliza/src/database.ts";
import { AgentRuntime } from "@ai16z/eliza/src/runtime.ts";
import {
    Action,
    Evaluator,
    ModelProviderName,
    Provider,
} from "@ai16z/eliza/src/types.ts";
import {
    SUPABASE_ANON_KEY,
    SUPABASE_URL,
    TEST_EMAIL,
    TEST_PASSWORD,
    zeroUuid,
} from "./constants.ts";
import { User } from "./types.ts";

export async function createRuntime({
    env,
    conversationLength,
    evaluators = [],
    actions = [],
    providers = [],
}: {
    env?: Record<string, string> | NodeJS.ProcessEnv;
    conversationLength?: number;
    evaluators?: Evaluator[];
    actions?: Action[];
    providers?: Provider[];
}) {
    let adapter: DatabaseAdapter;
    let user: User;
    let session: {
        user: User;
    };

    switch (env?.TEST_DATABASE_CLIENT as string) {
        case "sqljs":
            {
                const module = await import("sql.js");

                const initSqlJs = module.default;

                // SQLite adapter
                const SQL = await initSqlJs({});
                const db = new SQL.Database();

                adapter = new SqlJsDatabaseAdapter(db);

                // Load sqlite-vss
                load((adapter as SqlJsDatabaseAdapter).db);
                // Create a test user and session
                user = {
                    id: zeroUuid,
                    email: "test@example.com",
                } as User;
                session = {
                    user: user,
                };
            }
            break;
        case "supabase": {
            const module = await import("@supabase/supabase-js");

            const { createClient } = module;

            const supabase = createClient(
                env?.SUPABASE_URL ?? SUPABASE_URL,
                env?.SUPABASE_SERVICE_API_KEY ?? SUPABASE_ANON_KEY
            );

            const { data } = await supabase.auth.signInWithPassword({
                email: TEST_EMAIL!,
                password: TEST_PASSWORD!,
            });

            user = data.user as User;
            session = data.session as unknown as { user: User };

            if (!session) {
                const response = await supabase.auth.signUp({
                    email: TEST_EMAIL!,
                    password: TEST_PASSWORD!,
                });

                // Change the name of the user
                const { error } = await supabase
                    .from("accounts")
                    .update({ name: "Test User" })
                    .eq("id", response.data.user?.id);

                if (error) {
                    throw new Error(
                        "Create runtime error: " + JSON.stringify(error)
                    );
                }

                user = response.data.user as User;
                session = response.data.session as unknown as { user: User };
            }

            adapter = new SupabaseDatabaseAdapter(
                env?.SUPABASE_URL ?? SUPABASE_URL,
                env?.SUPABASE_SERVICE_API_KEY ?? SUPABASE_ANON_KEY
            );
        }
        case "sqlite":
        default:
            {
                const module = await import("better-sqlite3");

                const Database = module.default;

                // SQLite adapter
                adapter = new SqliteDatabaseAdapter(new Database(":memory:"));

                // Load sqlite-vss
                await load((adapter as SqliteDatabaseAdapter).db);
                // Create a test user and session
                user = {
                    id: zeroUuid,
                    email: "test@example.com",
                } as User;
                session = {
                    user: user,
                };
            }
            break;
    }

    const runtime = new AgentRuntime({
        serverUrl: "https://api.openai.com/v1",
        conversationLength,
        token: env!.OPENAI_API_KEY!,
        modelProvider: ModelProviderName.OPENAI,
        actions: actions ?? [],
        evaluators: evaluators ?? [],
        providers: providers ?? [],
        databaseAdapter: adapter,
    });

    return { user, session, runtime };
}
