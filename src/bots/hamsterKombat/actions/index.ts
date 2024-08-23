import type { Session } from '@/telegram/utils/sessions';
import { Card } from '@/types';
import { logger } from '@/utils/logger';
import { delay, handleAxiosError } from '@/utils/utils';
import { AxiosError, AxiosInstance } from 'axios';
import chalk from 'chalk';
import { randomInt } from 'node:crypto';
import {
    claimDailyMiniGame,
    getMiniGameCipher,
    startDailyMiniGame,
} from '../api/miniGame';
import { applyPromoCode, getPromoCode, getPromoCodes } from '../api/promoCodes';
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

    logger.info(
        `${chalk.bold.cyan('@' + session.username)} - Completing Daily Rewards`
    );

    const filteredTasks = tasks.filter(
        (task: { id: string }) =>
            task['id'].startsWith('hamster_youtube') ||
            task['id'].startsWith('streak_days')
    );

    for (const task of filteredTasks) {
        const taskId = String(task['id']);
        const rewardCoins = task['rewardCoins'];
        const isCompleted = task['isCompleted'];

        if (!isCompleted && rewardCoins > 0) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Waiting for 5 seconds before completing ${chalk.bold.cyan(taskId)} Task`
            );
            await delay(5000);

            const { profileData, taskDetails } = await claimDailyReward(
                httpClient,
                taskId
            );

            if (taskDetails.isCompleted) {
                const balanceCoins = parseInt(profileData['balanceCoins'], 10);

                if (taskDetails['days']) {
                    logger.success(
                        `${chalk.bold.cyan('@' + session.username)} - Completed ${chalk.bold.cyan(taskId)} Task - Reward: ${chalk.bold.cyan(rewardCoins)} - Days: ${chalk.bold.cyan(taskDetails['days'])} - Balance: ${chalk.bold.cyan(balanceCoins)}`
                    );
                    return;
                }

                logger.success(
                    `${chalk.bold.cyan('@' + session.username)} - Completed ${chalk.bold.cyan(taskId)} Task - Reward: ${chalk.bold.cyan(rewardCoins)} - Balance: ${chalk.bold.cyan(balanceCoins)}`
                );
            } else {
                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Failed to complete ${chalk.bold.cyan(taskId)} Task`
                );
            }
        }
        if (isCompleted) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - ${chalk.bold.cyan(taskId)} Task already completed`
            );
        }
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
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Claiming Daily Cipher...`
            );
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

const buyCard = async (
    httpClient: AxiosInstance,
    cardId: string,
    session: Session
) => {
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
                    await buyCard(httpClient, upgradeId, session);
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
                `${chalk.bold.cyan('@' + session.username)} - Card on cooldown: ${chalk.bold.cyan(cardToBuy.name)} - Cooldown: ${cardToBuy.cooldownSeconds} seconds`
            );

            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Waiting for cooldown to end`
            );

            await delay(cardToBuy.cooldownSeconds * 1000);
        }
    }

    const res = await buyUpgrade(httpClient, cardId);
    if (res) {
        const level = res[cardId]['level'];
        logger.info(
            `${chalk.bold.cyan('@' + session.username)} - Card bought: ${chalk.bold.cyan(cardToBuy.name)} - Price: ${chalk.bold.cyan(price)} - Level: ${chalk.bold.cyan(level)} - Balance: ${chalk.bold.cyan((balance - price).toFixed(2))}`
        );
    }

    const randSleep = randomInt(5, 15);

    logger.info(
        `${chalk.bold.cyan('@' + session.username)} - Waiting ${randSleep} second before buying next card`
    );
    await delay(randSleep * 1000);
};

export const handleDailyCombo = async (
    httpClient: AxiosInstance,
    session: Session
) => {
    try {
        const upgrades = await getUpgrades(httpClient);
        const dailyCombo = upgrades['dailyCombo'];
        const upgradesForBuy = upgrades['upgradesForBuy'] as Card[];
        const isClaimed = dailyCombo['isClaimed'];

        if (isClaimed) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Daily Combo already claimed`
            );
            return;
        }
        const boughtCards = dailyCombo['upgradeIds'] as string[];
        const comboCards = await getComboCards(httpClient);

        if (!comboCards.length) {
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - No combo cards found`
            );
            return;
        }

        // filter the cards that are not bought
        const cardsTobuy = comboCards.filter(
            (card) => !boughtCards.includes(card)
        );

        const filteredUpgrades = upgradesForBuy.filter((card) =>
            cardsTobuy.includes(card.id)
        );

        const totalCost = filteredUpgrades.reduce(
            (acc, card) => acc + card.price,
            0
        );

        if (totalCost >= 5000000) {
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - Total cost of combo cards is more than 5M`
            );
            return;
        }

        for (const card of cardsTobuy) {
            await buyCard(httpClient, card, session);
        }

        const claimStatus = await claimDailyCombo(httpClient);
        if (claimStatus) {
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - Daily Combo claimed`
            );
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - ${error.message}`,
                'handleDailyCombo'
            );
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
            `${chalk.bold.cyan('@' + session.username)} - Taps sent: ${chalk.bold.cyan(randomTaps)} - Energy claimed: ${chalk.bold.cyan(claimedEnergy)} - Remaining taps: ${chalk.bold.cyan(remainingEnergy)}`
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
            logger.info(
                `${chalk.bold.cyan('@' + session.username)} - No profitable upgrades found`
            );
            return;
        }

        for (const [index, card] of filteredUpgrades.entries()) {
            const res = await buyUpgrade(httpClient, card.id);

            if (res) {
                const level = chalk.cyan(res[card.id]['level']);
                logger.success(
                    `${chalk.bold.cyan('@' + session.username)} - Card bought: ${chalk.bold.cyan(card.name)} - Price: ${chalk.cyan(card.price)} - Level: ${level} - Profit: ${chalk.cyan(card.profitPerHourDelta)}`
                );
            }

            const isLastCard = index === filteredUpgrades.length - 1;
            if (!isLastCard) {
                const randSleep = randomInt(5, 15);
                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Waiting ${randSleep} second before buying ${chalk.bold.cyan(filteredUpgrades[index + 1].name)}`
                );
                await delay(5000);
            }

            if (isLastCard) {
                const randSleep = randomInt(8, 20);
                logger.success(
                    `${chalk.bold.cyan('@' + session.username)} - Total ${chalk.bold.cyan(filteredUpgrades.length)} cards bought`
                );
                logger.info(
                    chalk.cyan(
                        `${chalk.bold.cyan('@' + session.username)} - Waiting ${randSleep} second before next iteration`
                    )
                );
                await delay(randSleep * 1000);
                await buyBestUpgrades(httpClient, session, profitPercentage);
            }
        }
    } catch (error: unknown) {
        if (error instanceof Error) {
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - ${error.message}`,
                'buyBestUpgrades'
            );
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
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - ${error.message}`,
                'handleMiniGame'
            );
        }
        handleAxiosError(error);
    }
};

export const handlePromoCode = async (
    httpClient: AxiosInstance,
    session: Session
) => {
    try {
        const promosData = await getPromoCodes(httpClient);

        const promoStates = promosData['states'];
        const promos = promosData['promos'];

        const promoActivates: Record<string, number> = {};

        for (const promo of promoStates) {
            promoActivates[promo.promoId] = promo.receiveKeysToday;
        }

        const appTokens: Record<string, string> = {
            '61308365-9d16-4040-8bb0-2f4a4c69074c':
                '61308365-9d16-4040-8bb0-2f4a4c69074c',
            'fe693b26-b342-4159-8808-15e3ff7f8767':
                '74ee0b5b-775e-4bee-974f-63e7f4d5bacb',
            'b4170868-cef0-424f-8eb9-be0622e8e8e3':
                'd1690a07-3780-4068-810f-9b5bbf2931b2',
            'c4480ac7-e178-4973-8061-9ed5b2e17954':
                '82647f43-3f87-402d-88dd-09a90025313f',
            '43e35910-c168-4634-ad4f-52fd764a843f':
                'd28721be-fd2d-4b45-869e-9f253b554e50',
            'dc128d28-c45b-411c-98ff-ac7726fbaea4':
                '8d1cc2ad-e097-4b86-90ef-7a27e19fb833',
        };

        for (const promo of promos) {
            const promoId = promo.promoId as string;
            const promoAppToken = appTokens[promoId];
            const promoActivate = promoActivates[promoId];

            if (!promoAppToken) {
                continue;
            }

            const promoTitle = promo['title']['en'];
            const keysPerDay = promo['keysPerDay'];
            const keysPerCode = 1;

            let todayPromoActivatesCount = promoActivate || 0;

            if (todayPromoActivatesCount >= keysPerDay) {
                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Promo Code already claimed today for ${chalk.bold.red(promoTitle)}`
                );
                continue;
            }

            while (todayPromoActivatesCount < keysPerDay) {
                const promoCode = await getPromoCode(
                    promoAppToken,
                    promoId,
                    promoTitle,
                    session,
                    20,
                    promoTitle === 'My Clone Army' ? 120 : 20
                ).catch(() => null);
                if (!promoCode) {
                    continue;
                }

                const { profileData, promoState } = await applyPromoCode(
                    httpClient,
                    promoCode
                );

                if (profileData && promoState) {
                    const totalKeys = profileData['totalKeys'];
                    todayPromoActivatesCount = promoState['receiveKeysToday'];

                    logger.success(
                        `${chalk.bold.cyan('@' + session.username)} - Promo code applied for ${chalk.bold.red(promoTitle)} - Total Keys: ${chalk.bold.red(totalKeys)} (${chalk.bold.green('+' + keysPerCode)}) - Keys claimed today: ${chalk.bold.red(todayPromoActivatesCount)}`
                    );
                } else {
                    logger.error(
                        `${chalk.bold.cyan('@' + session.username)} - Failed to apply promo code for ${chalk.bold.red(promoTitle)}`
                    );
                }

                const randomSleep = randomInt(10, 15);

                logger.info(
                    `${chalk.bold.cyan('@' + session.username)} - Waiting for ${randomSleep} seconds before next promo code`
                );

                await delay(randomSleep * 1000);
            }
        }
    } catch (error: unknown) {
        if (error instanceof AxiosError) {
            logger.error(
                `${chalk.bold.cyan('@' + session.username)} - ${error.response?.data?.error_message || error.message}`,
                'handlePromoCode'
            );
        }
        handleAxiosError(error);
    }
};
