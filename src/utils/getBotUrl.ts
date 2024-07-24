import { hamsterBot } from '@/constants';

export const getBotUrl = (botName: string) => {
    switch (botName) {
        case hamsterBot:
            return 'https://hamsterkombatgame.io/';
        default:
            return '';
    }
};
