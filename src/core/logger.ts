import fs from 'fs';
import path from 'path';

export function log_to_file(filename: string, message: string, logDirectory: string = './logs'): void {
  // Ensure the log directory exists
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  let fullPath = path.join(logDirectory, filename);
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  // if full path doesnt end in .log or .txt, append .log
  if (!fullPath.endsWith('.log') && !fullPath.endsWith('.txt')) {
    fullPath += '.log';
  }

  // Append the log entry to the file
  fs.appendFileSync(fullPath, logEntry);

  // Print a message to the console
  const preview = message.length > 200 ? message.substring(0, 200) + '...' : message;
  console.log(`Logged to ${filename}: ${preview}`);
}