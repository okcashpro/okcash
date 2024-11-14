class ElizaLogger {
    constructor() {
        this.verbose = process.env.verbose === "true" || false;
    }

    verbose = false;
    closeByNewLine = true;
    useIcons = true;
    logsTitle = "LOGS";
    warningsTitle = "WARNINGS";
    errorsTitle = "ERRORS";
    informationsTitle = "INFORMATIONS";
    successesTitle = "SUCCESS";
    debugsTitle = "DEBUG";
    assertsTitle = "ASSERT";
    #getColor(foregroundColor = "", backgroundColor = "") {
        let fgc = "\x1b[37m";
        switch (foregroundColor.trim().toLowerCase()) {
            case "black":
                fgc = "\x1b[30m";
                break;
            case "red":
                fgc = "\x1b[31m";
                break;
            case "green":
                fgc = "\x1b[32m";
                break;
            case "yellow":
                fgc = "\x1b[33m";
                break;
            case "blue":
                fgc = "\x1b[34m";
                break;
            case "magenta":
                fgc = "\x1b[35m";
                break;
            case "cyan":
                fgc = "\x1b[36m";
                break;
            case "white":
                fgc = "\x1b[37m";
                break;
        }

        let bgc = "";
        switch (backgroundColor.trim().toLowerCase()) {
            case "black":
                bgc = "\x1b[40m";
                break;
            case "red":
                bgc = "\x1b[44m";
                break;
            case "green":
                bgc = "\x1b[44m";
                break;
            case "yellow":
                bgc = "\x1b[43m";
                break;
            case "blue":
                bgc = "\x1b[44m";
                break;
            case "magenta":
                bgc = "\x1b[45m";
                break;
            case "cyan":
                bgc = "\x1b[46m";
                break;
            case "white":
                bgc = "\x1b[47m";
                break;
        }

        return `${fgc}${bgc}`;
    }
    #getColorReset() {
        return "\x1b[0m";
    }
    clear() {
        console.clear();
    }
    print(foregroundColor = "white", backgroundColor = "black", ...strings) {
        const c = this.#getColor(foregroundColor, backgroundColor);
        // turns objects into printable strings
        strings = strings.map((item) => {
            if (typeof item === "object") {
                // Handle BigInt serialization
                return JSON.stringify(item, (key, value) =>
                    typeof value === "bigint" ? value.toString() : value
                );
            }
            return item;
        });
        console.log(c, strings.join(""), this.#getColorReset());
        if (this.closeByNewLine) console.log("");
    }

    log(...strings) {
        const fg = "white";
        const bg = "";
        const icon = "\u25ce";
        const groupTile = ` ${this.logsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item, this.#getColorReset());
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    warn(...strings) {
        const fg = "yellow";
        const bg = "";
        const icon = "\u26a0";
        const groupTile = ` ${this.warningsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item, this.#getColorReset());
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    error(...strings) {
        const fg = "red";
        const bg = "";
        const icon = "\u26D4";
        const groupTile = ` ${this.errorsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item);
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    info(...strings) {
        const fg = "blue";
        const bg = "";
        const icon = "\u2139";
        const groupTile = ` ${this.informationsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item);
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    success(...strings) {
        const fg = "green";
        const bg = "";
        const icon = "\u2713";
        const groupTile = ` ${this.successesTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item);
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    debug(...strings) {
        if (!this.verbose) return;
        const fg = "magenta";
        const bg = "";
        const icon = "\u1367";
        const groupTile = ` ${this.debugsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item);
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
    assert(...strings) {
        const fg = "cyan";
        const bg = "";
        const icon = "\u0021";
        const groupTile = ` ${this.assertsTitle}`;
        if (strings.length > 1) {
            const c = this.#getColor(fg, bg);
            console.group(c, (this.useIcons ? icon : "") + groupTile);
            const nl = this.closeByNewLine;
            this.closeByNewLine = false;
            strings.forEach((item) => {
                this.print(fg, bg, item);
            });
            this.closeByNewLine = nl;
            console.groupEnd();
            if (nl) console.log();
        } else {
            this.print(
                fg,
                bg,
                strings.map((item) => {
                    return `${this.useIcons ? `${icon} ` : ""}${item}`;
                })
            );
        }
    }
}

export const elizaLogger = new ElizaLogger();
elizaLogger.clear();
elizaLogger.closeByNewLine = true;
elizaLogger.useIcons = true;

export default elizaLogger;
