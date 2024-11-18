/* eslint-disable no-dupe-class-members */
import { CacheManager, MemoryCacheAdapter } from "../cache.ts"; // Adjust the import based on your project structure

// Now, let’s fix the test suite.

describe.only("CacheManager", () => {
    let cache: CacheManager<MemoryCacheAdapter>;

    jest.useFakeTimers();

    beforeEach(() => {
        cache = new CacheManager(new MemoryCacheAdapter());
        jest.setSystemTime(Date.now());
    });

    it("should set/get/delete cache", async () => {
        await cache.set("foo", "bar");

        expect(await cache.get("foo")).toEqual("bar");

        expect(cache.adapter.data.get("foo")).toEqual(
            JSON.stringify({ value: "bar", expires: 0 })
        );

        await cache.delete("foo");

        expect(await cache.get("foo")).toEqual(undefined);
        expect(cache.adapter.data.get("foo")).toEqual(undefined);
    });

    it("should set/get/delete cache with expiration", async () => {
        const expires = Date.now() + 5 * 1000;

        await cache.set("foo", "bar", { expires: expires });

        expect(await cache.get("foo")).toEqual("bar");

        expect(cache.adapter.data.get("foo")).toEqual(
            JSON.stringify({ value: "bar", expires: expires })
        );

        jest.setSystemTime(expires + 1000);

        expect(await cache.get("foo")).toEqual(undefined);
        expect(cache.adapter.data.get("foo")).toEqual(undefined);
    });
});
