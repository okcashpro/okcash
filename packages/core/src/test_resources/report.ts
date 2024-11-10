import fs from "fs";

interface TestResult {
    testName: string;
    attempts: number;
    successful: number;
    successRate: number;
}

export async function deleteReport() {
    const { existsSync, unlinkSync } = fs;

    // Define the path to the test-report.json file
    const reportPath = "./test-report.json";

    // Check if test-report.json exists
    if (existsSync(reportPath)) {
        // Delete the file
        unlinkSync(reportPath);
    }
}

export async function addToReport(
    testName: string,
    attempts: number,
    successful: number,
    successRate: number
) {
    const { existsSync, readFileSync, writeFileSync } = fs;

    // Define the path to the test-report.json file
    const reportPath = "./test-report.json";

    // Initialize an empty array to hold the test results
    let report: TestResult[] = [];

    // Check if test-report.json exists
    if (existsSync(reportPath)) {
        // Read the existing test report
        const reportContent = readFileSync(reportPath, "utf-8");
        report = JSON.parse(reportContent);
    }

    // Check if the test already exists in the report
    const existingTestIndex = report.findIndex(
        (test) => test.testName === testName
    );

    // Create a new test result object
    const newTestResult: TestResult = {
        testName,
        attempts,
        successful,
        successRate,
    };

    if (existingTestIndex !== -1) {
        // If the test already exists, replace it with the new result
        report[existingTestIndex] = newTestResult;
    } else {
        // If the test doesn't exist, add the new result to the report
        report.push(newTestResult);
    }

    // Write the updated report to test-report.json
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
}

export async function logReport() {
    const { existsSync, readFileSync } = fs;

    // Define the path to the test-report.json file
    const reportPath = "./test-report.json";

    // Check if test-report.json exists
    if (!existsSync(reportPath)) {
        console.log("Error: test-report.json does not exist.");
        return;
    }

    // Read the test report
    const reportContent = readFileSync(reportPath, "utf-8");
    const report: TestResult[] = JSON.parse(reportContent);

    // Log each test result with appropriate color-coding
    report.forEach((test) => {
        const logMessage = `${test.testName}: ${test.attempts} Attempts, ${test.successful} Successful, Success Rate: ${test.successRate}%`;

        if (test.successRate === 100) {
            console.log(logMessage);
        } else if (test.successRate < 100 && test.successRate > 0) {
            console.warn(logMessage);
        } else {
            console.error(logMessage);
        }
    });
}
