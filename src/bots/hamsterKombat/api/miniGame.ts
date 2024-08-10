import type { AxiosInstance } from 'axios';
import { randomInt } from 'node:crypto';

export const getMiniGameCipher = async (
    httpClient: AxiosInstance,
    userId: string,
    startDate: string,
    gameSleepTime: number
) => {
    // using random cipher for mini game
    const cipher =
        `0${gameSleepTime}${randomInt(10000000000, 99999999999)}`.slice(0, 10);
    const body = `${cipher}|${userId}`;

    const buffer = Buffer.from(body);
    const encodedBody = buffer.toString('base64');

    return encodedBody;
};

export const startDailyMiniGame = async (httpClient: AxiosInstance) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/start-keys-minigame'
    );
    return response.data;
};

export const claimDailyMiniGame = async (
    httpClient: AxiosInstance,
    cipher: string
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/claim-daily-keys-minigame',
        {
            cipher,
        }
    );
    const profileData = response.data['clickerUser'];
    const dailyMiniGame = response.data['dailyKeysMiniGame'];

    return { profileData, dailyMiniGame };
};
