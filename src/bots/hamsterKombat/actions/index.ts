import type { Session } from '@/telegram/utils/sessions';
import { Card } from '@/types';
import { logger } from '@/utils/logger';
import { handleAxiosError } from '@/utils/utils';
import { AxiosInstance } from 'axios';
import { randomInt } from 'node:crypto';
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
    const reward = dailyTask['rewardCoins'];
    const isCompleted = dailyTask['isCompleted'];
    const days = dailyTask['days'];

    if (!isCompleted) {
        logger.info('Completing Daily Task...');
        const status = await claimDailyReward(httpClient);
        if (status) {
            logger.info(
                `${session.name} - Completed Daily Task - Reward: ${reward} - Days: ${days}`
            );
        }
    }

    if (isCompleted) {
        logger.info(`${session.name} - Daily Task already completed`);
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
        const bonus = dailyCipher['bonusCoins'];

        if (!isClaimed) {
            logger.info('Claiming Daily Cipher...');
            const decodedCipher = decodeCipher(cipher);
            const status = await claimDailyCipher(httpClient, decodedCipher);

            if (status) {
                logger.info(
                    `${session.name} - Claimed Daily Cipher - Bonus: ${bonus}`
                );
            }
        }

        if (isClaimed) {
            logger.info(`${session.name} - Daily Cipher already claimed`);
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
        if (cardToBuy.condition._type === 'ByUpgrade') {
            const { upgradeId } = cardToBuy.condition;
            const upgrade = cards.find((upgrade) => upgrade.id === upgradeId);
            if (!upgrade) {
                throw new Error('Upgrade not found');
            }

            const { level: levelToUpgrade } = cardToBuy.condition;
            const level = upgrade.level;
            for (let i = level - 1; i < levelToUpgrade; i++) {
                await buyCard(httpClient, upgradeId);
            }
        } else {
            throw new Error(`Card is not available: ${cardId}`);
        }
    }

    const res = await buyUpgrade(httpClient, cardId);
    if (res) {
        const level = res[cardId]['level'];
        logger.info(
            `Card bought: ${cardToBuy.name} - Price: ${price} - Level: ${level} - Balance: ${(balance - price).toFixed(2)}`
        );
    }
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
            logger.info(`${session.name} - Daily Combo already claimed`);
            return;
        }
        const boughtCards = dailyCombo['upgradeIds'] as string[];
        const comboCards = await getComboCards(httpClient);

        if (!comboCards.length) {
            logger.error(`${session.name} - No combo cards found`);
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
            logger.info(`${session.name} - Daily Combo claimed`);
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
    console.log('maxTap', maxTap);

    const randomTaps = randomInt(maxTap / 2, maxTap); // Random taps between half and max taps
    const claimedEnergy = randomTaps * earnPerTap;

    const remainingEnergy = availableTaps - claimedEnergy;

    const status = await sendTaps(httpClient, remainingEnergy, randomTaps);
    if (status) {
        logger.info(
            `${session.name} - Taps sent: ${randomTaps} - Energy claimed: ${claimedEnergy} - Remaining taps: ${remainingEnergy}`
        );
    }
};
