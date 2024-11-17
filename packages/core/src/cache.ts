import path from "path";
import fs from "fs/promises";
import type { ICacheManager, IDatabaseCacheAdapter, UUID } from "./types";

export interface CacheAdapter {
    get(key: string): Promise<string | undefined>;
    set(key: string, value: string): Promise<void>;
    del(key: string): Promise<void>;
}

export class FsCacheAdapter implements CacheAdapter {
    constructor(private dataDir: string) {}

    async get(key: string): Promise<string | undefined> {
        try {
            return await fs.readFile(path.join(this.dataDir, key), "utf8");
        } catch {
            // console.error(error);
            return undefined;
        }
    }

    async set(key: string, value: string): Promise<void> {
        try {
            const filePath = path.join(this.dataDir, key);
            // Ensure the directory exists
            await fs.mkdir(path.dirname(filePath), { recursive: true });
            await fs.writeFile(filePath, value, "utf8");
        } catch (error) {
            console.error(error);
        }
    }

    async del(key: string): Promise<void> {
        try {
            const filePath = path.join(this.dataDir, key);
            await fs.unlink(filePath);
        } catch {
            // console.error(error);
        }
    }
}

export class DbCacheAdapter implements CacheAdapter {
    constructor(
        private db: IDatabaseCacheAdapter,
        private agentId: UUID
    ) {}

    async get(key: string): Promise<string | undefined> {
        return this.db.getCached({ agentId: this.agentId, key });
    }

    async set(key: string, value: string): Promise<void> {
        await this.db.setCached({ agentId: this.agentId, key, value });
    }

    async del(key: string): Promise<void> {
        await this.db.delCached({ agentId: this.agentId, key });
    }
}

export class CacheManager implements ICacheManager {
    adapter: CacheAdapter;

    constructor(adapter: CacheAdapter) {
        this.adapter = adapter;
    }

    async get(key: string): Promise<string | undefined> {
        return this.adapter.get(key);
    }

    async del(key: string): Promise<void> {
        return this.adapter.del(key);
    }

    async set(key: string, value: string): Promise<void> {
        return this.adapter.set(key, value);
    }
}
