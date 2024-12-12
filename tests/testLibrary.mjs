import { $, fs, path, chalk } from 'zx';
import { DEFAULT_AGENT_ID, DEFAULT_CHARACTER } from './test1.mjs';
import { spawn } from 'node:child_process';
$.verbose = false; // Suppress command output unless there's an error

function projectRoot() {
    return path.join(import.meta.dirname, "..");
}

async function runProcess(command, args = [], directory = projectRoot()) {
    try {
        const result = await $`cd ${directory} && ${command} ${args}`;
        return result.stdout.trim();
    } catch (error) {
        throw new Error(`Command failed: ${error.message}`);
    }
}

async function installProjectDependencies() {
    console.log(chalk.blue('Installing dependencies...'));
    return await runProcess('pnpm', ['install', '-r']);
}

async function buildProject() {
    console.log(chalk.blue('Building project...'));
    return await runProcess('pnpm', ['build']);
}

async function writeEnvFile(entries) {
    const envContent = Object.entries(entries)
        .map(([key, value]) => `${key}=${value}`)
        .join('\n');
    await fs.writeFile('.env', envContent);
}

async function startAgent(character = DEFAULT_CHARACTER) {
    console.log(chalk.blue(`Starting agent for character: ${character}`));
    const proc = spawn('pnpm', ['start', `--character=characters/${character}.character.json`, '--non-interactive'], { shell: true, "stdio": "inherit" });
    log(`proc=${JSON.stringify(proc)}`);

    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 20000));
    return proc;
}

async function stopAgent(proc) {
    console.log(chalk.blue('Stopping agent...'));
    proc.kill('SIGTERM')
}

async function send(message) {
    const endpoint = `http://127.0.0.1:3000/${DEFAULT_AGENT_ID}/message`;
    const payload = {
        text: message,
        userId: "user",
        userName: "User"
    };

    try {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        return data[0].text;
    } catch (error) {
        throw new Error(`Failed to send message: ${error.message}`);
    }
}

function log(message) {
    console.log(message);
}

export {
    projectRoot,
    runProcess,
    installProjectDependencies,
    buildProject,
    writeEnvFile,
    startAgent,
    stopAgent,
    send,
    log
}