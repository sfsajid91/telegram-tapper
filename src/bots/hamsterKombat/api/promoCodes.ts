import type { Session } from '@/telegram/utils/sessions';
import { logger } from '@/utils/logger';
import { delay } from '@/utils/utils';
import type { AxiosInstance, AxiosRequestConfig } from 'axios';
import axios, { AxiosError } from 'axios';
import chalk from 'chalk';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { v4 as uuidv4 } from 'uuid';

const generateClientId = () => {
    const currentTimeMillis = Date.now();
    const randomPart = Math.floor(Math.random() * 900) + 100;
    const randomFirst = parseInt(
        currentTimeMillis.toString().slice(0, 10) + randomPart.toString()
    );

    return `${randomFirst}-3472514666961597005`;
};

const generateEventId = () => {
    return uuidv4();
};

const escapeHtml = (text: string) => {
    return text.replace('<', '\\<').replace('>', '\\>');
};

export const getPromoCodes = async (httpClient: AxiosInstance) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/get-promos',
        {}
    );
    return response.data;
};

export const getPromoCode = async (
    appToken: string,
    promoId: string,
    promoTitle: string,
    session: Session,
    maxAttempts = 1,
    eventTimeout = 30
) => {
    const clientId = generateClientId();

    const requestOptions: AxiosRequestConfig = {
        headers: {
            'Content-Type': 'application/json',
            Host: 'api.gamepromo.io',
        },
    };

    if (session.proxy) {
        const agent = new HttpsProxyAgent(session.proxy);
        requestOptions.httpsAgent = agent;
        requestOptions.httpAgent = agent;
    }

    const axiosInstance = axios.create(requestOptions);

    const data = {
        appToken,
        clientId,
        clientOrigin: 'deviceid',
    };

    const response = await axiosInstance.post(
        'https://api.gamepromo.io/promo/login-client',
        data
    );

    const accessToken = response.data.clientToken;

    if (!accessToken) {
        logger.error(
            `${chalk.bold.cyan(`@${session.username}`)} - Can't login to api.gamepromo.io - Response Text: ${chalk.cyan(
                escapeHtml(response.data).substring(0, 256)
            )}`
        );
        return;
    }

    axiosInstance.defaults.headers.Authorization = `Bearer ${accessToken}`;

    logger.info(
        `${chalk.bold.cyan(`@${session.username}`)} - Logged in to api.gamepromo - Waiting 10 seconds before getting promo code`
    );
    await delay(10000);

    for (let attempts = 0; attempts < maxAttempts; attempts++) {
        try {
            const eventId = generateEventId();
            const jsonData = {
                promoId,
                eventId,
                eventOrigin: 'undefined',
            };

            const promoResponse = await axiosInstance.post(
                'https://api.gamepromo.io/promo/register-event',
                jsonData
            );

            const hasCode = promoResponse.data.hasCode || false;

            if (hasCode) {
                const jsonData = {
                    promoId,
                };

                const promoCodeResponse = await axiosInstance.post(
                    'https://api.gamepromo.io/promo/create-code',
                    jsonData
                );

                const promoCode = promoCodeResponse.data.promoCode;
                if (promoCode) {
                    logger.info(
                        `${chalk.bold.cyan(`@${session.username}`)} - Promo code is found for ${chalk.bold.red(
                            promoTitle
                        )} - Code: ${chalk.bold.cyan(promoCode)}`
                    );
                    return promoCode;
                }
            }
        } catch (error: unknown) {
            if (error instanceof AxiosError) {
                logger.error(
                    `${chalk.bold.cyan(`@${session.username}`)} - Failed attempt ${chalk.bold.red(
                        attempts + 1
                    )} to get promo code for ${chalk.bold.red(promoTitle)} - Error: ${
                        error.response?.data?.error_message || error.message
                    }`,
                    'getPromoCode'
                );
            }
        }

        logger.info(
            `${chalk.bold.cyan(`@${session.username}`)} - Attempt ${chalk.bold.red(attempts + 1)} to get promo code for ${chalk.bold.red(
                promoTitle
            )}`
        );

        logger.info(
            `${chalk.bold.cyan(`@${session.username}`)} - Waiting ${chalk.bold.cyan(
                eventTimeout
            )} seconds before ${chalk.bold.cyan(attempts + 2)} attempt`
        );

        await delay(eventTimeout * 1000);
    }

    logger.error(
        `${chalk.bold.cyan(`@${session.username}`)} - Can't get promo code for ${chalk.bold.red(
            promoTitle
        )} - Attempts: ${chalk.bold.red(maxAttempts)}`
    );
};

export const applyPromoCode = async (
    httpClient: AxiosInstance,
    promoCode: string
) => {
    const response = await httpClient.post(
        'https://api.hamsterkombatgame.io/clicker/apply-promo',
        {
            promoCode,
        }
    );

    const profileData = response.data['clickerUser'];
    const promoState = response.data['promoState'];

    return { profileData, promoState };
};
