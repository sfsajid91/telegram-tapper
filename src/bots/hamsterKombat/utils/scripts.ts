import crypto from 'node:crypto';

export const generateRandomVisitorId = () => {
    const randomString = crypto.randomBytes(16).toString('hex');
    const visitorId = crypto
        .createHash('md5')
        .update(randomString)
        .digest('hex');
    return visitorId;
};

export const convertTgWebAppData = (tgWebAppData: string) => {
    // Extract and decode the tgWebAppData part of the URL
    const encodedData = tgWebAppData
        .split('tgWebAppData=')[1]
        .split('&tgWebAppVersion')[0];
    const decodedData = decodeURIComponent(decodeURIComponent(encodedData));
    return decodedData;
};

export const decodeCipher = (cipher: string) => {
    // Remove the third character
    const encoded = cipher.slice(0, 3) + cipher.slice(4);

    // Decode the base64 string (assuming UTF-8 encoding)
    const decodedString = Buffer.from(encoded, 'base64').toString('utf-8');
    return decodedString;
};