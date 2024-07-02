import chalk from 'chalk';

export const logger = {
    info: (message: string, from?: string) => {
        console.log(
            chalk.blue(`[INFO] ${message} ${from ? `from ${from}` : ''}`)
        );
    },
    error: (message: string, from?: string) => {
        console.log(
            chalk.red(`[ERROR] ${message} ${from ? `from ${from}` : ''}`)
        );
    },
    success: (message: string, from?: string) => {
        console.log(
            chalk.green(`[SUCCESS] ${message} ${from ? `from ${from}` : ''}`)
        );
    },
    warn: (message: string, from?: string) => {
        console.log(
            chalk.yellow(`[WARN] ${message} ${from ? `from ${from}` : ''}`)
        );
    },
};
