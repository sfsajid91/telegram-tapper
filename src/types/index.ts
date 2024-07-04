export type Card = {
    id: string;
    name: string;
    price: number;
    profitPerHour: number;
    condition: {
        _type: string;
        upgradeId: string;
        level: number;
    };
    section: string;
    level: number;
    currentProfitPerHour: number;
    profitPerHourDelta: number;
    isAvailable: boolean;
    isExpired: boolean;
};
