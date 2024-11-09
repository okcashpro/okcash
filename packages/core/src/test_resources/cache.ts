// getCachedEmbeddings
// check cache.json for embedding where the key is a stringified version of the memory and the value is a number array
import fs from "fs";
export const getCachedEmbeddings = async (text: string) => {
    if (!fs.existsSync("./embedding-cache.json")) {
        fs.writeFileSync("./embedding-cache.json", "{}");
    }
    // read cache.json
    const cache = JSON.parse(
        fs.readFileSync("./embedding-cache.json", "utf8") as string
    );
    // stringify the memory
    const key = JSON.stringify(text);
    // return the value of the memory
    return cache[key];
};

export const writeCachedEmbedding = async (
    text: string,
    embedding: number[]
) => {
    // check if ./embedding-cache.json exists, if it doesn't, write {} to it
    if (!fs.existsSync("./embedding-cache.json")) {
        fs.writeFileSync("./embedding-cache.json", "{}");
    }
    // read cache.json
    const cache = JSON.parse(
        fs.readFileSync("./embedding-cache.json", "utf8") as string
    );
    // stringify the memory
    const key = JSON.stringify(text);
    // write the value of the memory
    cache[key] = embedding;
    // write the cache to cache.json
    fs.writeFileSync("./embedding-cache.json", JSON.stringify(cache));
};
