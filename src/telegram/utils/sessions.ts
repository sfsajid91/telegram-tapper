import { sessionPath } from '@/constants';
import { fileLogger } from '@/utils/fileLogger';
import fs from 'node:fs/promises';

export type Session = {
    name: string;
    session: string;
    username: string;
};

export const getSessions: () => Promise<Session[]> = async () => {
    try {
        await fs.access(sessionPath);
        const sessionFile = await fs.readFile(sessionPath, 'utf-8');
        return JSON.parse(sessionFile);
    } catch (error) {
        fileLogger.error(error);
        return [];
    }
};

export const getSessionString = async (name: string, username: string) => {
    const sessions = await getSessions();
    const session = sessions.find(
        (session) => session.name === name && session.username === username
    );
    return session?.session ?? '';
};

export const addSession = async (
    name: string,
    session: string,
    username: string
) => {
    const sessions = await getSessions();
    sessions.push({ name, session, username });
    // check if the folder exists or not
    await fs.mkdir(sessionPath.split('/').slice(0, -1).join('/'), {
        recursive: true,
    });
    await fs.writeFile(sessionPath, JSON.stringify(sessions, null, 4));
};
