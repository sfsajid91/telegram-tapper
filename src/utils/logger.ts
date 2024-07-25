import chalk from 'chalk';

type Logger = {
    message: string;
    type: 'info' | 'error' | 'success' | 'warn';
};

const orange = chalk.hex('#FFC500');

const cLogger = ({ message, type }: Logger) => {
    let color = chalk.blue;

    switch (type) {
        case 'error':
            color = chalk.red;
            break;
        case 'success':
            color = chalk.green;
            break;
        case 'warn':
            color = chalk.yellow;
            break;
        default:
            color = chalk.blue;
            break;
    }
    const colorizedLevel = color(type.toUpperCase().padEnd(8));
    console.log(
        chalk.cyan(
            `${orange(new Date().toISOString())} | ${chalk.bold(colorizedLevel)}  | ${message}`
        )
    );
};

export const logger = {
    info: (message: string, from?: string) => {
        const coloredMessage = chalk.blue(
            `${message}${from ? ` | from ${from}` : ''}`
        );
        cLogger({
            message: coloredMessage,
            type: 'info',
        });
    },
    error: (message: string, from?: string) => {
        const coloredMessage = chalk.red(
            `${message}${from ? ` | from ${from}` : ''}`
        );
        cLogger({
            message: coloredMessage,
            type: 'error',
        });
    },
    success: (message: string, from?: string) => {
        const coloredMessage = chalk.green(
            `${message}${from ? ` | from ${from}` : ''}`
        );
        cLogger({
            message: coloredMessage,
            type: 'success',
        });
    },
    warn: (message: string, from?: string) => {
        const coloredMessage = chalk.yellow(
            `${message}${from ? ` | from ${from}` : ''}`
        );
        cLogger({
            message: coloredMessage,
            type: 'warn',
        });
    },
};
