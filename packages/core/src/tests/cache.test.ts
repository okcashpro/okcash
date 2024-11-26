import { CacheManager, MemoryCacheAdapter } from "../cache.ts";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("CacheManager", () => {
    let cache: CacheManager<MemoryCacheAdapter>;

    beforeEach(() => {
        vi.useFakeTimers();
        cache = new CacheManager(new MemoryCacheAdapter());
        vi.setSystemTime(Date.now());
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it("should set/get/delete cache", async () => {
        await cache.set("foo", "bar");

        expect(await cache.get("foo")).toEqual("bar");

        await cache.delete("foo");

        expect(await cache.get("foo")).toEqual(undefined);
    });

    it("should handle expiring cache", async () => {
        const expires = Date.now() + 1000;

        await cache.set("foo", "bar", { expires });

        expect(await cache.get("foo")).toEqual("bar");

        expect(cache.adapter.data.get("foo")).toEqual(
            JSON.stringify({ value: "bar", expires: expires })
        );

        vi.setSystemTime(expires + 1000);

        expect(await cache.get("foo")).toEqual(undefined);
        expect(cache.adapter.data.get("foo")).toEqual(undefined);
    });
});
