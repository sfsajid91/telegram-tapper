import { hamsterBot, version } from '@/constants';
import { createSession } from '@/telegram/telegram';
import { getSessions } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import figlet from 'figlet';
import { hamsterKombatBot } from './bots/hamsterKombat';

const startBot = async () => {
    const botName = await select({
        message: 'Choose the bot:',
        choices: [
            {
                name: 'Hamster Kombat',
                value: hamsterBot,
                description: 'Automate Hamster Kombat game',
            },
        ],
    });

    logger.info(`Starting ${botName}...`);
    if (botName === hamsterBot) {
        await hamsterKombatBot();
    }
};

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
const mainFunc = async () => {
    // Clears the terminal screen.
    process.stdout.write('\u001B[2J\u001B[0;0f');

    console.log(chalk.red(figlet.textSync('Telegram Tapper')));
    console.log(chalk.yellow(`Version: ${version}`));
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

    const action = await select({
        message: 'What do you want to do?',
        choices: [
            {
                name: 'Add a new session',
                value: 'addSession',
                description: 'Add a new session to the list',
            },
            {
                name: 'Start Bot',
                value: 'startBot',
                description: 'Start Automating the bot',
            },
            {
                name: 'Exit',
                value: 'exit',
            },
        ],
    });

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
