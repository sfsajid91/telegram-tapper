import { hamsterBot } from '@/constants';
import { getTgUrl } from '@/telegram/telegram';
import type { Session } from '@/telegram/utils/sessions';
import { getSessions } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import { select, Separator } from '@inquirer/prompts';
import axios, { type AxiosRequestConfig } from 'axios';
import chalk from 'chalk';

import { delay, handleAxiosError } from '@/utils/utils';
import { HttpsProxyAgent } from 'https-proxy-agent';
import {
    handleAutoTapper,
    handleDailyCipher,
    handleDailyCombo,
    handleDailyReward,
} from './actions';
import { login } from './api/auth';
import { getIpInfo, getProfileData } from './api/scripts';

type Action =
    | 'solveCieper'
    | 'dailyReward'
    | 'autoTapper'
    | 'allInOne'
    | 'dailyCombo';

const startHamsterAction = async (session: Session, action: Action) => {
    const tgWebUrl = await getTgUrl(session.name, session.username, hamsterBot);

    const response = await login(tgWebUrl, session.proxy);

    if (!response.authToken) {
        throw new Error('Failed to login');
    }

    const requestOptions: AxiosRequestConfig = {
        headers: { Authorization: `Bearer ${response.authToken}` },
    };

    if (session.proxy) {
        const agent = new HttpsProxyAgent(session.proxy);
        requestOptions['httpsAgent'] = agent;
        requestOptions['httpAgent'] = agent;
    }

    const axiosInstance = axios.create(requestOptions);

    const profileData = await getProfileData(axiosInstance);

    const ipInfo = await getIpInfo(axiosInstance);

    const ip = chalk.cyan(ipInfo['ip'] || 'Unknown');
    const country = chalk.bold(chalk.cyan(ipInfo['country_code'] || 'Unknown'));
    const city = chalk.bold(chalk.cyan(ipInfo['city_name'] || 'Unknown'));
    const asnOrg = chalk.bold(chalk.cyan(ipInfo['asn_org'] || 'Unknown'));

    logger.info(
        `${session.name} - IP: ${ip} - Country: ${country} - City: ${city} - Network Provider: ${asnOrg}`
    );

    const lastPassiveEarnings = Number(profileData['lastPassiveEarn']).toFixed(
        2
    );
    const earnPerHour = profileData['earnPassivePerHour'];
    const earnPerTap = Number(profileData['earnPerTap']);
    const availableTaps = profileData['availableTaps'];

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
            await handleAutoTapper(
                axiosInstance,
                session,
                earnPerTap,
                availableTaps
            );
            break;
        case 'dailyCombo':
            await handleDailyCombo(axiosInstance, session);
            break;
        case 'allInOne':
            await Promise.allSettled([
                handleDailyCipher(axiosInstance, session),
                handleDailyReward(axiosInstance, session),
                handleDailyCombo(axiosInstance, session),
                handleAutoTapper(
                    axiosInstance,
                    session,
                    earnPerTap,
                    availableTaps
                ),
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

                // delay if there are a session left
                if (s !== sessions[sessions.length - 1]) {
                    console.log(
                        chalk.yellow('='.repeat(process.stdout.columns))
                    );
                    logger.info(
                        'Waiting 10 seconds before starting the next session...'
                    );
                    await delay(10 * 1000);
                }
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
        handleAxiosError(error);
    }
};
