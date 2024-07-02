import { hamsterBot } from '@/constants';

export const getBotUrl = (botName: string) => {
    switch (botName) {
        case hamsterBot:
            return 'https://hamsterkombat.io/';

        default:
            return '';
    }
};
