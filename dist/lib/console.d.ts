export function cs(config: any, n: any): {
    log: Function;
    error: Function;
};
export function csm(...args: any[]): void;
export function cdev(...args: any[]): void;
export function cdebug(...args: any[]): void;
export function cinfo(...args: any[]): void;
export function cwarn(...args: any[]): void;
export function clog(...args: any[]): void;
export function cerror(...args: any[]): void;
export function prompt(promptText: string, validator: () => boolean, option: any): Promise<any>;
export namespace style {
    export { reset };
    export { bold };
    export { dim };
    export { underline };
    export { reverse };
    export { hidden };
    export { black };
    export { red };
    export { green };
    export { yellow };
    export { blue };
    export { magenta };
    export { cyan };
    export { white };
    export { brightBlack };
    export { brightRed };
    export { brightGreen };
    export { brightYellow };
    export { brightBlue };
    export { brightMagenta };
    export { brightCyan };
    export { brightWhite };
    export { bgBlack };
    export { bgRed };
    export { bgGreen };
    export { bgYellow };
    export { bgBlue };
    export { bgMagenta };
    export { bgCyan };
    export { bgWhite };
    export { bgBrightBlack };
    export { bgBrightRed };
    export { bgBrightGreen };
    export { bgBrightYellow };
    export { bgBrightBlue };
    export { bgBrightMagenta };
    export { bgBrightCyan };
    export { bgBrightWhite };
}
export function clear(n?: number): void;
export function echo(data: any): {
    show: any;
    stop(): void;
};
export function fresh(): void;
declare const reset: "\u001B[0m";
declare const bold: "\u001B[1m";
declare const dim: "\u001B[2m";
declare const underline: "\u001B[4m";
declare const reverse: "\u001B[7m";
declare const hidden: "\u001B[8m";
declare const black: "\u001B[30m";
declare const red: "\u001B[31m";
declare const green: "\u001B[32m";
declare const yellow: "\u001B[33m";
declare const blue: "\u001B[34m";
declare const magenta: "\u001B[35m";
declare const cyan: "\u001B[36m";
declare const white: "\u001B[37m";
declare const brightBlack: "\u001B[90m";
declare const brightRed: "\u001B[91m";
declare const brightGreen: "\u001B[92m";
declare const brightYellow: "\u001B[93m";
declare const brightBlue: "\u001B[94m";
declare const brightMagenta: "\u001B[95m";
declare const brightCyan: "\u001B[96m";
declare const brightWhite: "\u001B[97m";
declare const bgBlack: "\u001B[40m";
declare const bgRed: "\u001B[41m";
declare const bgGreen: "\u001B[42m";
declare const bgYellow: "\u001B[43m";
declare const bgBlue: "\u001B[44m";
declare const bgMagenta: "\u001B[45m";
declare const bgCyan: "\u001B[46m";
declare const bgWhite: "\u001B[47m";
declare const bgBrightBlack: "\u001B[100m";
declare const bgBrightRed: "\u001B[101m";
declare const bgBrightGreen: "\u001B[102m";
declare const bgBrightYellow: "\u001B[103m";
declare const bgBrightBlue: "\u001B[104m";
declare const bgBrightMagenta: "\u001B[105m";
declare const bgBrightCyan: "\u001B[106m";
declare const bgBrightWhite: "\u001B[107m";
export {};
