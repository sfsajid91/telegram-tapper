import { addSession, getSession } from '@/telegram/utils/sessions';
import { extractProxyDetails } from '@/utils/extractProxy';
import { getBotUrl } from '@/utils/getBotUrl';
import { logger } from '@/utils/logger';
import { input } from '@inquirer/prompts';
import dotenv from 'dotenv';
import { Api, TelegramClient } from 'telegram';
import type { TelegramClientParams } from 'telegram/client/telegramBaseClient';
import { StringSession } from 'telegram/sessions';

dotenv.config();

const apiId = Number(process.env.TELEGRAM_API_ID);
const apiHash = process.env.TELEGRAM_API_HASH!;

const envValidation = () => {
    if (!apiId || !apiHash) {
        logger.error(
            'Please provide the API ID and API HASH in the .env file.'
        );
        process.exit(1);
    }
};

export const createSession = async () => {
    envValidation();

    const stringSession = new StringSession();

    logger.info('Creating a new session...');

    const clientOptions: TelegramClientParams = {
        connectionRetries: 5,
    };

    const inputProxy = await input({
        message:
            'Enter your socks5 proxy (socks5://username:password@ip:port):',
    });

    const proxy = extractProxyDetails(inputProxy);

    if (proxy && proxy.isSocks) {
        clientOptions.proxy = {
            ip: proxy.ip,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password,
            MTProxy: false,
            socksType: proxy.socksVersion,
        };
    }

    const client = new TelegramClient(
        stringSession,
        apiId,
        apiHash,
        clientOptions
    );

    // @ts-expect-error - We are disabling the log level.
    client.setLogLevel('none');

    await client.start({
        phoneNumber: async () =>
            await input({ message: 'Enter your phone number:' }),
        password: async () => await input({ message: 'Enter your password:' }),
        phoneCode: async () =>
            await input({ message: 'Enter the code sent to your phone:' }),
        onError: (err) => {
            logger.error(err.message, 'createSession');
        },
    });

    const self = await client.getMe();

    const session = client.session.save();

    await addSession(self.firstName!, session!, self.username!, inputProxy);
    await client.disconnect();
};

export const getTgUrl = async (
    sessionName: string,
    username: string,
    botName: string
) => {
    const session = await getSession(sessionName, username);

    if (!session) {
        logger.error('Session not found.');
        process.exit(1);
    }

    const clientOptions: TelegramClientParams = {
        connectionRetries: 5,
    };

    if (session.proxy) {
        const proxy = extractProxyDetails(session.proxy);

        if (proxy && proxy.isSocks) {
            clientOptions.proxy = {
                ip: proxy.ip,
                port: proxy.port,
                username: proxy.username,
                password: proxy.password,
                MTProxy: false,
                socksType: proxy.socksVersion,
            };
        }
    }

    const client = new TelegramClient(
        new StringSession(session.session),
        apiId,
        apiHash,
        clientOptions
    );
    // @ts-expect-error - We are disabling the log level.
    client.setLogLevel('none');

    await client.start({
        phoneNumber: async () =>
            await input({ message: 'Enter your phone number:' }),
        password: async () => await input({ message: 'Enter your password:' }),
        phoneCode: async () =>
            await input({ message: 'Enter the code sent to your phone:' }),
        onError: (err) => {
            logger.error(err.message, 'createSession');
        },
    });

    const peer = await client.getEntity(botName);

    const webview = await client.invoke(
        new Api.messages.RequestWebView({
            url: getBotUrl(botName),
            bot: peer,
            platform: 'android',
            peer,
            fromBotMenu: false,
        })
    );

    await client.disconnect();

    return webview.url;
};
