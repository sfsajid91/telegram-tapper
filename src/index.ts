import { hamsterBot } from '@/constants';
import { createSession } from '@/telegram/telegram';
import { getSessions } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import chalk from 'chalk';
import figlet from 'figlet';
import inquirer from 'inquirer';

const startBot = async () => {
    const { botName } = await inquirer.prompt([
        {
            type: 'list',
            name: 'botName',
            message: 'Choose the bot:',
            choices: [
                {
                    name: 'Hamster Kombat',
                    value: hamsterBot,
                },
            ],
        },
    ]);

    logger.info(`Starting ${botName}...`);
    if (botName === hamsterBot) {
        // await hamsterKombat();
    }
};

//@ts-expect-error - This is a valid import
const mainFunc = async () => {
    // Clears the terminal screen.
    process.stdout.write('\u001B[2J\u001B[0;0f');

    console.log(chalk.red(figlet.textSync('Telegram Tapper')));
    console.log(chalk.yellow('Version: 1.0.0'));
    console.log(chalk.yellow('Author: @sfsajid91'));
    console.log(chalk.yellow('GitHub: https://github.com/sfsajid91'));
    console.log(chalk.yellow('='.repeat(process.stdout.columns)));
    console.log(chalk.green('Welcome to Telegram Tapper!'));
    console.log(
        chalk.green(
            'This script will help you to automate the process of tapping on the telegram game.'
        )
    );

    const sessions = await getSessions();

    const totalSessions = sessions.length;

    if (totalSessions <= 0) {
        await createSession();
        return mainFunc();
    }

    console.log(chalk.green(`Total Sessions: ${totalSessions}`));

    const { action } = await inquirer.prompt([
        {
            type: 'list',
            name: 'action',
            message: 'What do you want to do?',
            choices: [
                {
                    name: 'Add a new session',
                    value: 'addSession',
                },
                {
                    name: 'Start Bot',
                    value: 'startBot',
                },
                {
                    name: 'Exit',
                    value: 'exit',
                },
            ],
        },
    ]);

    switch (action) {
        case 'addSession':
            await createSession();
            return mainFunc();
        case 'startBot':
            await startBot();
            break;

        default:
            logger.info('Exiting...');
            break;
    }
};

mainFunc();
