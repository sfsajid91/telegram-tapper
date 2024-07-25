import { fileLogger } from '@/utils/fileLogger';
import { logger } from '@/utils/logger';
import axios, { type AxiosRequestConfig } from 'axios';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { convertTgWebAppData, generateRandomVisitorId } from '../utils/scripts';

export const login = async (tgWebUrl: string, proxyString?: string) => {
    try {
        const visitorId = generateRandomVisitorId();
        const decodedData = convertTgWebAppData(tgWebUrl);
        const data = {
            fingerprint: { visitorId, version: '4.2.1' },
            initDataRaw: decodedData,
        };

        const requestOptions: AxiosRequestConfig = {};

        if (proxyString) {
            const agent = new HttpsProxyAgent(proxyString);
            requestOptions['httpsAgent'] = agent;
            requestOptions['httpAgent'] = agent;
        }

        const response = await axios.post(
            'https://api.hamsterkombatgame.io/auth/auth-by-telegram-webapp',
            data,
            requestOptions
        );

        const jsonResponse = response.data;
        if (response.status !== 200) {
            return {};
        }

        return jsonResponse;
    } catch (error) {
        fileLogger.error(error);
        if (error instanceof Error) {
            logger.error(error.message, 'login: auth.ts');
            return {};
        }
    }
};
