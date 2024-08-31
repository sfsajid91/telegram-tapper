export const convertTgWebAppData = (tgWebAppData: string) => {
    // Extract and decode the tgWebAppData part of the URL
    const encodedData = tgWebAppData
        .split('tgWebAppData=')[1]
        .split('&tgWebAppVersion')[0];
    const decodedData = decodeURIComponent(decodeURIComponent(encodedData));
    return decodedData;
};
