import { $, chalk } from 'zx';
import assert from 'assert';
import {
    startAgent,
    stopAgent,
    send
} from "./testLibrary.mjs";
import { stringToUuid } from '../packages/core/dist/index.js'

export const DEFAULT_CHARACTER = "trump"
export const DEFAULT_AGENT_ID = stringToUuid(DEFAULT_CHARACTER ?? uuidv4());

async function test1() {
    const proc = await startAgent();
    try {

        const reply = await send("Hi");
        assert(reply.length > 10);
        console.log(chalk.green('✓ Test 1 passed'));
    } catch (error) {
        console.error(chalk.red(`✗ Test 1 failed: ${error.message}`));
        process.exit(1);
    } finally {
        await stopAgent(proc);
    }
}

try {
    await test1();
} catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
}