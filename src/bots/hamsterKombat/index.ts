import { hamsterBot } from '@/constants';
import { getTgUrl } from '@/telegram/telegram';
import type { Session } from '@/telegram/utils/sessions';
import { getSessions } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import { number, select, Separator } from '@inquirer/prompts';
import axios, { AxiosInstance, type AxiosRequestConfig } from 'axios';
import chalk from 'chalk';

import { handleAxiosError } from '@/utils/utils';
import { HttpsProxyAgent } from 'https-proxy-agent';
import PQueue from 'p-queue';
import {
    buyBestUpgrades,
    handleAutoTapper,
    handleDailyCipher,
    handleDailyCombo,
    handleDailyReward,
    handleMiniGame,
    handlePromoCode,
} from './actions';
import { login } from './api/auth';
import { getIpInfo, getProfileData } from './api/scripts';

type Action =
    | 'solveCieper'
    | 'dailyReward'
    | 'autoTapper'
    | 'allInOne'
    | 'dailyCombo'
    | 'buyBestUpgrades'
    | 'dailyMiniGame'
    | 'handlePromoCodes';

const handleBuyBestUpgrades = async (
    axiosInstance: AxiosInstance,
    session: Session
) => {
    const profitPercentage = await number({
        message: 'Enter the profit percentage(%):',
        min: 1,
        max: 100,
        default: 10,
        required: true,
        validate: (value) => {
            if (value && (value < 1 || value > 100)) {
                return 'The value must be between 1 and 100';
            }
            return true;
        },
    });

    await buyBestUpgrades(axiosInstance, session, profitPercentage);
};

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
        `${chalk.bold.cyan('@' + session.username)} - IP: ${ip} - Country: ${country} - City: ${city} - Network Provider: ${asnOrg}`
    );

    const lastPassiveEarnings = Number(profileData['lastPassiveEarn']).toFixed(
        2
    );
    const earnPerHour = profileData['earnPassivePerHour'];
    const earnPerTap = Number(profileData['earnPerTap']);
    const availableTaps = profileData['availableTaps'];

    const totalKeys = profileData['totalKeys'] || 0;

    logger.info(
        `${chalk.bold.cyan('@' + session.username)} - Last Passive Earnings: ${chalk.bold.cyan(lastPassiveEarnings)} - Earn Per Hour: ${chalk.bold.cyan(earnPerHour)} - Total Keys: ${chalk.bold.cyan(totalKeys)}`
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
        case 'dailyMiniGame':
            await handleMiniGame(
                axiosInstance,
                session,
                profileData['id'],
                totalKeys
            );
            break;
        case 'handlePromoCodes':
            await handlePromoCode(axiosInstance, session);
            break;
        case 'allInOne':
            await Promise.allSettled([
                handleDailyCipher(axiosInstance, session),
                handleDailyReward(axiosInstance, session),
                handleMiniGame(
                    axiosInstance,
                    session,
                    profileData['id'],
                    totalKeys
                ),
                handleDailyCombo(axiosInstance, session),
                handleAutoTapper(
                    axiosInstance,
                    session,
                    earnPerTap,
                    availableTaps
                ),
                // handlePromoCode(axiosInstance, session),
            ]);
            break;

        case 'buyBestUpgrades':
            await handleBuyBestUpgrades(axiosInstance, session);
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
            pageSize: 10,
            choices: [
                {
                    name: 'Solve Cieper',
                    value: 'solveCieper',
                    description: 'Solve the daily cipher',
                },

                {
                    name: 'Claim Daily Tasks',
                    value: 'dailyReward',
                    description: 'Claim the daily tasks',
                },
                {
                    name: 'Auto Tapper',
                    value: 'autoTapper',
                    description: 'Start the auto tapper',
                },
                {
                    name: 'Claim Daily Combo',
                    value: 'dailyCombo',
                    description: 'Claim the daily combo',
                },
                {
                    name: 'Daily Mini Game',
                    value: 'dailyMiniGame',
                    description: 'Play the daily mini game',
                },
                {
                    name: 'Apply Promo Codes',
                    value: 'handlePromoCodes',
                    description: 'Apply promo codes',
                },
                {
                    name: 'All in One',
                    value: 'allInOne',
                    description: 'Run all the actions',
                },
                new Separator(),
                {
                    name: 'Buy Best Upgrades',
                    value: 'buyBestUpgrades',
                    description: 'Buy the best upgrades',
                },
            ],
        });

        const session = await select<Session | 'all'>({
            message: 'Select a session',
            pageSize: 10,
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
            const queue = new PQueue({ concurrency: 2 });

            sessions.forEach((s) => {
                queue.add(() => {
                    logger.info(
                        `Starting ${chalk.bold.cyan('@' + s.username)}'s Session`
                    );
                    return startHamsterAction(s, action);
                });
            });

            await queue.onIdle();
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
