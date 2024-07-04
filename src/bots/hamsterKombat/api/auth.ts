import { fileLogger } from '@/utils/fileLogger';
import { logger } from '@/utils/logger';
import axios from 'axios';
import { convertTgWebAppData, generateRandomVisitorId } from '../utils/scripts';

export const login = async (tgWebUrl: string) => {
    try {
        const visitorId = generateRandomVisitorId();
        const decodedData = convertTgWebAppData(tgWebUrl);
        const data = {
            fingerprint: { visitorId },
            initDataRaw: decodedData,
        };

        const response = await axios.post(
            'https://api.hamsterkombat.io/auth/auth-by-telegram-webapp',
            data
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
