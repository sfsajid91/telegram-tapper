import type { Session } from '@/telegram/utils/sessions';
import { Card } from '@/types';
import { logger } from '@/utils/logger';
import { delay, handleAxiosError } from '@/utils/utils';
import { AxiosInstance } from 'axios';
import chalk from 'chalk';
import { randomInt } from 'node:crypto';
import {
    claimDailyMiniGame,
    getMiniGameCipher,
    startDailyMiniGame,
} from '../api/miniGame';
import {
    buyUpgrade,
    claimDailyCipher,
    claimDailyCombo,
    claimDailyReward,
    getComboCards,
    getConfig,
    getProfileData,
    getTasks,
    getUpgrades,
    sendTaps,
} from '../api/scripts';
import { decodeCipher } from '../utils/scripts';

export const handleDailyReward = async (
    httpClient: AxiosInstance,
    session: Session
) => {
    const tasks = await getTasks(httpClient);
    const dailyTask = tasks[tasks.length - 1];
    const reward = chalk.bold.cyan(dailyTask['rewardCoins']);
    const isCompleted = dailyTask['isCompleted'];
    const days = chalk.bold.cyan(dailyTask['days']);

    if (!isCompleted) {
        logger.info('Completing Daily Task...');
        const status = await claimDailyReward(httpClient);
        if (status) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Completed Daily Task - Reward: ${reward} - Days: ${days}`
            );
        }
    }

    if (isCompleted) {
        logger.info(
            `${chalk.bold.cyan('@' + session.username)} - Daily Task already completed`
        );
    }
};

export const handleDailyCipher = async (
    httpClient: AxiosInstance,
    session: Session
) => {
    const gameConfig = await getConfig(httpClient);
    const dailyCipher = gameConfig['dailyCipher'];

    if (dailyCipher) {
        const cipher = dailyCipher['cipher'];
        const isClaimed = dailyCipher['isClaimed'];
        const bonus = chalk.bold.cyan(dailyCipher['bonusCoins']);

        if (!isClaimed) {
            logger.info('Claiming Daily Cipher...');
            const decodedCipher = decodeCipher(cipher);
            const status = await claimDailyCipher(httpClient, decodedCipher);

            if (status) {
                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Claimed Daily Cipher - Bonus: ${bonus}`
                );
            }
        }

        if (isClaimed) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Daily Cipher already claimed`
            );
        }
    }
};

const buyCard = async (httpClient: AxiosInstance, cardId: string) => {
    const upgrades = await getUpgrades(httpClient);
    const cards = upgrades['upgradesForBuy'] as Card[];
    const profileData = await getProfileData(httpClient);
    const balance = profileData['balanceCoins'];
    const cardToBuy = cards.find((card) => card.id === cardId);
    if (!cardToBuy) {
        throw new Error('Card not found in upgradesForBuy');
    }
    const isAvailable = cardToBuy.isAvailable;
    const price = cardToBuy.price;

    if (balance < price) {
        throw new Error('Not enough balance to buy card');
    }

    if (!isAvailable) {
        if (!cardToBuy.condition) {
            throw new Error('Card not available');
        }
        switch (cardToBuy.condition._type) {
            case 'ByUpgrade': {
                const { upgradeId } = cardToBuy.condition;
                const upgrade = cards.find(
                    (upgrade) => upgrade.id === upgradeId
                );
                if (!upgrade) {
                    throw new Error('Upgrade not found');
                }

                const { level: levelToUpgrade } = cardToBuy.condition;
                const level = upgrade.level;
                for (let i = level - 1; i < levelToUpgrade; i++) {
                    await buyCard(httpClient, upgradeId);
                }
                break;
            }
            case 'ReferralCount':
                throw new Error(
                    `Total ${cardToBuy.condition.referralCount} referrals needed to buy card ${cardToBuy.name}`
                );
            case 'MoreReferralsCount':
                throw new Error(
                    `More ${cardToBuy.condition.moreReferralsCount} referrals needed to buy card ${cardToBuy.name}`
                );
            default:
                throw new Error('Invalid card condition type');
        }
    }

    if (cardToBuy.cooldownSeconds && cardToBuy.cooldownSeconds > 0) {
        if (cardToBuy.cooldownSeconds > 120) {
            throw new Error('Card cooldown is more than 120 seconds');
        } else {
            logger.info(
                `Card on cooldown: ${chalk.bold.cyan(cardToBuy.name)} - Cooldown: ${cardToBuy.cooldownSeconds} seconds`
            );

            logger.info('Waiting for cooldown to end');

            await delay(cardToBuy.cooldownSeconds * 1000);
        }
    }

    const res = await buyUpgrade(httpClient, cardId);
    if (res) {
        const level = res[cardId]['level'];
        logger.info(
            `Card bought: ${chalk.bold.cyan(cardToBuy.name)} - Price: ${chalk.bold.cyan(price)} - Level: ${chalk.bold.cyan(level)} - Balance: ${chalk.bold.cyan((balance - price).toFixed(2))}`
        );
    }

    const randSleep = randomInt(5, 15);

    logger.info(`Waiting ${randSleep} second before buying next card`);
    await delay(randSleep * 1000);
};

export const handleDailyCombo = async (
    httpClient: AxiosInstance,
    session: Session
) => {
    try {
        const upgrades = await getUpgrades(httpClient);
        const dailyCombo = upgrades['dailyCombo'];
        // const upgradesForBuy = upgrades['upgradesForBuy'] as Card[];
        const isClaimed = dailyCombo['isClaimed'];

        if (isClaimed) {
            logger.info(
                `${chalk.bold.cyan(session.username)} - Daily Combo already claimed`
            );
            return;
        }
        const boughtCards = dailyCombo['upgradeIds'] as string[];
        const comboCards = await getComboCards(httpClient);

        if (!comboCards.length) {
            logger.error(
                `${chalk.bold.cyan(session.username)} - No combo cards found`
            );
            return;
        }
        // filter the cards that are not bought
        const cardsTobuy = comboCards.filter(
            (card) => !boughtCards.includes(card)
        );

        for (const card of cardsTobuy) {
            await buyCard(httpClient, card);
        }

        const claimStatus = await claimDailyCombo(httpClient);
        if (claimStatus) {
            logger.info(
                `${chalk.bold.cyan(session.username)} - Daily Combo claimed`
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(error.message, 'handleDailyCombo');
        }
        handleAxiosError(error);
    }
};

export const handleAutoTapper = async (
    httpClient: AxiosInstance,
    session: Session,
    earnPerTap: number,
    availableTaps: number
) => {
    const maxTap = Math.ceil(availableTaps / earnPerTap);

    const randomTaps = randomInt(Math.ceil(maxTap / 2), maxTap); // Random taps between half and max taps
    const claimedEnergy = randomTaps * earnPerTap;

    const remainingEnergy = availableTaps - claimedEnergy;

    const status = await sendTaps(httpClient, remainingEnergy, randomTaps);
    if (status) {
        logger.info(
            `${chalk.bold.cyan(session.username)} - Taps sent: ${randomTaps} - Energy claimed: ${claimedEnergy} - Remaining taps: ${remainingEnergy}`
        );
    }
};

export const buyBestUpgrades = async (
    httpClient: AxiosInstance,
    session: Session,
    profitPercentage: number = 10
) => {
    try {
        const upgrades = await getUpgrades(httpClient);
        const upgradesForBuy = upgrades['upgradesForBuy'] as Card[];

        const filteredUpgrades = upgradesForBuy.filter((card) => {
            if (!card.isAvailable || card.isExpired) {
                return false;
            }
            if (card.cooldownSeconds && card.cooldownSeconds > 0) {
                return false;
            }

            const isProfitable =
                (card.profitPerHourDelta / card.price) * 100 >=
                profitPercentage;

            if (!isProfitable) {
                return false;
            }
            return true;
        });

        if (filteredUpgrades.length === 0) {
            logger.info('No profitable upgrades found');
            return;
        }

        for (const [index, card] of filteredUpgrades.entries()) {
            const res = await buyUpgrade(httpClient, card.id);

            if (res) {
                const level = chalk.cyan(res[card.id]['level']);
                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Card bought: ${chalk.bold.cyan(card.name)} - Price: ${chalk.cyan(card.price)} - Level: ${level} - Profit: ${chalk.cyan(card.profitPerHourDelta)}`
                );
            }

            const isLastCard = index === filteredUpgrades.length - 1;
            if (!isLastCard) {
                const randSleep = randomInt(5, 15);
                logger.info(
                    `Waiting ${randSleep} second before buying ${chalk.bold.cyan(filteredUpgrades[index + 1].name)}`
                );
                await delay(5000);
            }

            if (isLastCard) {
                const randSleep = randomInt(8, 20);
                logger.success(
                    `Total ${chalk.bold.cyan(filteredUpgrades.length)} cards bought`
                );
                logger.info(
                    chalk.cyan(
                        `Waiting ${randSleep} second before next iteration`
                    )
                );
                await delay(randSleep * 1000);
                await buyBestUpgrades(httpClient, session, profitPercentage);
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(error.message, 'buyBestUpgrades');
        }
        handleAxiosError(error);
    }
};

export const handleMiniGame = async (
    httpClient: AxiosInstance,
    session: Session,
    userId: string,
    claimedKeys: number
) => {
    try {
        const gameConfig = await getConfig(httpClient);
        const dailyMiniGame = gameConfig['dailyKeysMiniGame'];

        if (!dailyMiniGame) {
            logger.info(
                `${chalk.bold.cyan(`@${session.username}`)} - Daily Mini Game not available`
            );
            return;
        }

        const isClaimed = dailyMiniGame['isClaimed'];
        const secondsForNextAttempt =
            dailyMiniGame['remainSecondsToNextAttempt'];
        const startDate = dailyMiniGame['startDate'];

        if (isClaimed) {
            logger.info(
                `${chalk.bold.cyan(`@${session.username}`)} - Daily Mini Game already claimed`
            );
            return;
        }

        if (secondsForNextAttempt > 0) {
            logger.info(
                `${chalk.bold.cyan(`@${session.username}`)} - Waiting for ${secondsForNextAttempt} seconds before attempting Mini Game`
            );
            return;
        }

        const gameSleepTime = randomInt(12, 26);
        const encodedBody = await getMiniGameCipher(
            httpClient,
            userId,
            startDate,
            gameSleepTime
        );

        if (!encodedBody) {
            return;
        }

        await startDailyMiniGame(httpClient);

        logger.info(
            `${chalk.bold.cyan(`@${session.username}`)} - Waiting for ${gameSleepTime} seconds before Mini Game`
        );

        await delay(gameSleepTime * 1000);

        const { dailyMiniGame: miniGameResponse, profileData } =
            await claimDailyMiniGame(httpClient, encodedBody);

        if (!miniGameResponse) {
            return;
        }

        const isClaimedAfterGame = miniGameResponse['isClaimed'];

        if (isClaimedAfterGame) {
            const newTotalKeys = profileData['totalKeys'];
            const earnedKeys = newTotalKeys - claimedKeys;

            logger.success(
                `${chalk.bold.cyan(`@${session.username}`)} - Claimed Daily Mini Game - Earned: ${chalk.bold(
                    chalk.cyan(
                        `${claimedKeys} (${chalk.green(`+${earnedKeys}`)})`
                    )
                )} keys`
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(error.message, 'handleMiniGame');
        }
        handleAxiosError(error);
    }
};
