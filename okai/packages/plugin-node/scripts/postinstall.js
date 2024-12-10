import os from "os";
const platform = os.platform();

if (
    platform === "linux" &&
    !(os.release().includes("ubuntu") || os.release().includes("debian"))
) {
    console.log(
        "Skipping playwright installation on unsupported platform:",
        platform
    );
} else {
    const { execSync } = await import("child_process");
    execSync("npx playwright install-deps && npx playwright install", {
        stdio: "inherit",
    });
}
