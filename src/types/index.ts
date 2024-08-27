export type Card = {
    id: string;
    name: string;
    price: number;
    profitPerHour: number;
    condition: Condition | null;
    section: string;
    level: number;
    currentProfitPerHour: number;
    profitPerHourDelta: number;
    isAvailable: boolean;
    isExpired: boolean;
    releaseAt?: string; // Optional property
    cooldownSeconds?: number; // Optional property
    totalCooldownSeconds?: number; // Optional property
    maxLevel?: number; // Optional property
};

type Condition =
    | ByUpgrade
    | MoreReferralsCount
    | ReferralCount
    | LinksToUpgradeLevel
    | SubscribeTelegramChannel
    | LinkWithoutCheck;

type ByUpgrade = {
    _type: 'ByUpgrade';
    upgradeId: string;
    level: number;
};

type MoreReferralsCount = {
    _type: 'MoreReferralsCount';
    moreReferralsCount: number;
};

type ReferralCount = {
    _type: 'ReferralCount';
    referralCount: number;
};

type LinksToUpgradeLevel = {
    _type: 'LinksToUpgradeLevel';
    subscribeLink: string;
    links: string[];
};

type SubscribeTelegramChannel = {
    _type: 'SubscribeTelegramChannel';
    link: string;
    channelId: number;
};

type LinkWithoutCheck = {
    _type: 'LinkWithoutCheck';
    link: string;
};

export type GameCode = {
    promoId: string;
    appToken: string;
    minWaitAfterLogin: number;
};
