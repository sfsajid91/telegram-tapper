type SocksVersion = 4 | 5 | undefined;

export const extractProxyDetails = (proxyString: string) => {
    const proxyPattern = /^(\w+):\/\/(?:(\w+):(\w+)@)?([\d.]+):(\d+)$/;

    const match = proxyString.match(proxyPattern);

    if (!match) {
        return null;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [_, protocol, username, password, ip, port] = match;

    const isSocks = protocol.startsWith('socks');
    const socksVersion = (
        isSocks ? Number(protocol.replace('socks', '')) : undefined
    ) as SocksVersion;

    return {
        protocol,
        ip,
        port: Number(port),
        username: username || undefined,
        password: password || undefined,
        isSocks,
        socksVersion,
    };
};
