import { addToReport } from "./report.ts";

export async function runAiTest(
    testName: string,
    testFunc: () => Promise<boolean>,
    runs: number = 3
) {
    let successful = 0;

    for (let i = 0; i < runs; i++) {
        // console.log("Running test", testName, " (iteration", i + ")");
        if (await testFunc()) successful++;
    }

    const successRate = (successful / runs) * 100;
    addToReport(testName, runs, successful, successRate);
}
