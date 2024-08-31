import type { AxiosInstance } from 'axios';
import moment from 'moment-timezone';

export const getMeTelegram = async (httpClient: AxiosInstance) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/auth/me-telegram',
        {}
    );
    return response.data;
};

export const getConfig = async (httpClient: AxiosInstance) => {
    const profile = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/config',
        {}
    );
    return profile.data;
};

export const getProfileData = async (httpClient: AxiosInstance) => {
    const profile = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/sync',
        {}
    );
    const profileData = profile.data['clickerUser'] || {};
    return profileData;
};

export const getTasks = async (httpClient: AxiosInstance) => {
    const tasks = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/list-tasks',
        {}
    );
    return tasks.data.tasks;
};

export const claimDailyReward = async (
    httpClient: AxiosInstance,
    taskId: string
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/check-task',
        { taskId }
    );
    const taskDetails = response.data['task'];
    const profileData = response.data['clickerUser'];
    return { taskDetails, profileData };
};

export const getUpgrades = async (httpClient: AxiosInstance) => {
    const upgrades = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/upgrades-for-buy',
        {}
    );
    return upgrades.data;
};

export const buyUpgrade = async (
    httpClient: AxiosInstance,
    upgradeId: string
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/buy-upgrade',
        { timestamp: Date.now(), upgradeId }
    );
    return response.data['clickerUser']['upgrades'];
};

export const getBoosts = async (httpClient: AxiosInstance) => {
    const boosts = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/boosts-for-buy',
        {}
    );
    return boosts.data;
};

export const claimDailyCipher = async (
    httpClient: AxiosInstance,
    cipher: string
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/claim-daily-cipher',
        { cipher }
    );
    return response.data;
};

export const sendTaps = async (
    httpClient: AxiosInstance,
    availableTaps: number,
    taps: number
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/tap',
        {
            availableTaps,
            count: taps,
            timestamp: Date.now(),
        }
    );
    return response.data;
};

export const applyBoost = async (
    httpClient: AxiosInstance,
    boostId: number
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/apply-boost',
        { boostId, timestamp: Date.now() }
    );
    return response.data;
};

export const getComboCards = async (
    httpClient: AxiosInstance
): Promise<string[]> => {
    const response = await httpClient.get(
        'https://api21.datavibe.top/api/GetCombo',
        {}
    );
    const givenDate = response.data.date;
    const parsedDate = moment(givenDate, 'DD-MM-YY');
    const utcNow = moment().utcOffset(-6);
    // const isToday = parsedDate.isSame(utcNow, 'day');
    const isToday = parsedDate.isSameOrBefore(utcNow, 'day');

    if (isToday) {
        return response.data.combo || [];
    }
    return [];
};

export const claimDailyCombo = async (httpClient: AxiosInstance) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/claim-daily-combo',
        {}
    );
    return Boolean(response.data);
};

export const getIpInfo = async (httpClient: AxiosInstance) => {
    const response = await httpClient.get(
        'https://api.hamsterkombatgame.io/ip'
    );
    return response.data;
};
