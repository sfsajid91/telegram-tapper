import { hamsterBot } from '@/constants';
import { getTgUrl } from '@/telegram/telegram';
import type { Session } from '@/telegram/utils/sessions';
import { getSessions } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import { select, Separator } from '@inquirer/prompts';
import axios from 'axios';
import chalk from 'chalk';

import { fileLogger } from '@/utils/fileLogger';
import {
    handleDailyCipher,
    handleDailyCombo,
    handleDailyReward,
} from './actions';
import { login } from './api/auth';
import { getProfileData } from './api/scripts';

type Action =
    | 'solveCieper'
    | 'dailyReward'
    | 'autoTapper'
    | 'allInOne'
    | 'dailyCombo';

const startHamsterAction = async (session: Session, action: Action) => {
    const tgWebUrl = await getTgUrl(session.name, session.username, hamsterBot);
    const response = await login(tgWebUrl);

    if (!response.authToken) {
        throw new Error('Failed to login');
    }

    const headers = {
        Authorization: `Bearer ${response.authToken}`,
    };

    const axiosInstance = axios.create({
        headers,
    });

    const profileData = await getProfileData(axiosInstance);

    const lastPassiveEarnings = profileData['lastPassiveEarn'];
    const earnPerHour = profileData['earnPassivePerHour'];

    logger.info(
        `${session.name} - Last Passive Earnings: ${lastPassiveEarnings} - Earn Per Hour: ${earnPerHour}`
    );

    switch (action) {
        case 'solveCieper':
            await handleDailyCipher(axiosInstance, session);
            break;
        case 'dailyReward':
            await handleDailyReward(axiosInstance, session);
            break;
        case 'autoTapper':
            logger.info('Starting Auto Tapper...');
            break;
        case 'dailyCombo':
            await handleDailyCombo(axiosInstance, session);
            break;
        case 'allInOne':
            await Promise.all([
                handleDailyCipher(axiosInstance, session),
                handleDailyReward(axiosInstance, session),
                handleDailyCombo(axiosInstance, session),
            ]);
            break;
        default:
            logger.info('Exiting...');
            break;
    }
};

export const hamsterKombatBot = async () => {
    try {
        const sessions = await getSessions();

        const action = await select<Action>({
            message: 'Select an action',
            choices: [
                {
                    name: 'Solve Cieper',
                    value: 'solveCieper',
                    description: 'Solve the daily cipher',
                },

                {
                    name: 'Claim Daily Reward',
                    value: 'dailyReward',
                    description: 'Claim the daily reward',
                },
                {
                    name: 'Auto Tapper',
                    value: 'autoTapper',
                    description: 'Start the auto tapper',
                },
                {
                    name: 'Claim Daily Combo',
                    value: 'dailyCombo',
                },
                {
                    name: 'All in One',
                    value: 'allInOne',
                    description: 'Run all the actions',
                },
            ],
        });

        const session = await select<Session | 'all'>({
            message: 'Select a session',
            choices: [
                {
                    name: 'All Sessions',
                    value: 'all',
                    description: 'Start the action for all sessions',
                },
                new Separator(),
                ...sessions.map((s) => ({
                    name: `${s.name}'s Session - (@${s.username})`,
                    value: s,
                    description: `For @${s.username} session`,
                })),
            ],
        });

        if (session === 'all') {
            for (const s of sessions) {
                await startHamsterAction(s, action);
                logger.success(`Finished @${s.username}'s Session`);
                console.log(chalk.yellow('='.repeat(process.stdout.columns)));
                console.log('\n');
            }
        } else {
            await startHamsterAction(session, action);
        }

        logger.info('Finished job!');
        process.exit(0);
    } catch (error) {
        if (error instanceof Error) {
            logger.error(error.message);
        }
        fileLogger.error(error);
    }
};
