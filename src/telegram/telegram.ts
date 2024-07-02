import { addSession, getSessionString } from '@/telegram/utils/sessions';
import { getBotUrl } from '@/utils/getBotUrl';
import { logger } from '@/utils/logger';
import dotenv from 'dotenv';
import readline from 'node:readline/promises';
import { Api, TelegramClient } from 'telegram';
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

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    const stringSession = new StringSession();

    logger.info('Creating a new session...');

    const client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: 5,
    });

    // @ts-expect-error - We are disabling the log level.
    client.setLogLevel('none');

    await client.start({
        phoneNumber: async () => await rl.question('Enter your phone number: '),
        password: async () => await rl.question('Enter your password: '),
        phoneCode: async () =>
            await rl.question('Enter the code sent to your phone: '),
        onError: (err) => {
            logger.error(err.message, 'createSession');
        },
    });

    const self = await client.getMe();

    const session = client.session.save();

    await addSession(self.firstName!, session!, self.username!);
    rl.close();
    await client.disconnect();
};

export const getTgUrl = async (
    sessionName: string,
    username: string,
    botName: string
) => {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    const session = await getSessionString(sessionName, username);

    if (!session) {
        logger.error('Session not found.');
        process.exit(1);
    }

    const client = new TelegramClient(
        new StringSession(session),
        apiId,
        apiHash,
        {
            connectionRetries: 5,
        }
    );
    // @ts-expect-error - We are disabling the log level.
    client.setLogLevel('none');

    await client.start({
        phoneNumber: async () => await rl.question('Enter your phone number: '),
        password: async () => await rl.question('Enter your password: '),
        phoneCode: async () =>
            await rl.question('Enter the code sent to your phone: '),
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
        })
    );

    rl.close();
    await client.disconnect();

    return webview.url;
};
