import fs from "fs";
import path from "path";
class Logger {
  frameChar = "*";

  async log(
    message: string,
    title: string = "",
    color: string = "white",
  ): Promise<void> {
    const c = await import("ansi-colors");
    const ansiColors = c.default;
    console.log(ansiColors[color]("*** LOG: " + title + "\n" + message));
  }

  warn(message: string, options = {}) {
    console.warn(message, { ...options });
  }

  error(message: string, options = {}) {
    console.error(message, { ...options });
  }

  frameMessage(message: string, title: string) {
    const lines = message.split("\n");
    const frameHorizontalLength = 30;
    const topFrame =
      this.frameChar.repeat(frameHorizontalLength + 4) +
      " " +
      this.frameChar +
      " " +
      (title ?? "log") +
      " ".repeat(
        frameHorizontalLength -
          ((title as string) ?? ("log" as string)).length +
          1,
      ) +
      this.frameChar.repeat(frameHorizontalLength + 4);
    const bottomFrame = this.frameChar.repeat(frameHorizontalLength + 4);
    return [topFrame, ...lines, bottomFrame].join("\n");
  }
}

const logger = new Logger();

export function log_to_file(
  filename: string,
  message: string,
  logDirectory: string = "./logs",
): void {
  // Ensure the log directory exists
  if (!fs.existsSync(logDirectory)) {
    fs.mkdirSync(logDirectory, { recursive: true });
  }

  let fullPath = path.join(logDirectory, filename);
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;

  // if full path doesnt end in .log or .txt, append .log
  if (!fullPath.endsWith(".log") && !fullPath.endsWith(".txt")) {
    fullPath += ".log";
  }

  // Append the log entry to the file
  fs.appendFileSync(fullPath, logEntry);

  // Print a message to the console
  const preview =
    message.length > 200 ? message.substring(0, 200) + "..." : message;
  logger.log(`Logged to ${filename}: ${preview}`, filename);
}

export default logger;
