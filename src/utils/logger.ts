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
            `${orange(new Date().toISOString())} | ${chalk.bold(colorizedLevel)}  | ${orange(message)}`
        )
    );
};

export const logger = {
    info: (message: string, from?: string) => {
        cLogger({
            message: `${message}${from ? ` | from ${from}` : ''}`,
            type: 'info',
        });
    },
    error: (message: string, from?: string) => {
        cLogger({
            message: `${message}${from ? ` | from ${from}` : ''}`,
            type: 'error',
        });
    },
    success: (message: string, from?: string) => {
        cLogger({
            message: `${message}${from ? ` | from ${from}` : ''}`,
            type: 'success',
        });
    },
    warn: (message: string, from?: string) => {
        cLogger({
            message: `${message}${from ? ` | from ${from}` : ''}`,
            type: 'warn',
        });
    },
};
