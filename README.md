# Telegram Tapper

Welcome to Telegram Tapper! This is a simple application that allows you to tap into the power of Telegram's API and automate various tasks.

![img1](.github/images/demo.png)

## Installation

To get started with Telegram Tapper, follow these steps:

1. Clone the repository: `git clone https://github.com/sfsajid91/telegram-tapper.git`
2. Navigate to the project directory: `cd telegram-tapper`
3. Install the dependencies: `pnpm install`

## Obtaining a Telegram API Token

1. Go to [https://my.telegram.org/auth](https://my.telegram.org/auth) and log in with your Telegram account.
2. Click on the "API development tools" link.
3. Fill out the form to create a new application.
4. Copy the "App api_id" and "App api_hash" values.
5. Save the values in `.env` file in the root directory of the project.

## Usage

To use Telegram Tapper, follow these steps:

1. Build the project: `pnpm build`
2. Start the application: `pnpm start`
3. Follow the instructions to authenticate your Telegram account.

## Proxies

For initial login and authentication, Telegram Tapper uses a proxy server to bypass Telegram's restrictions. If you encounter any issues, you can try using a different proxy server by updating the `proxy` value in the `proxy.json` file.

Suggested proxy protocol is `socks5`.

You can also use proxies for individual sessions by editing the `proxy` value in the `sessions/session.json` file.

```json
[
    {
        "name": "session",
        "session": "...",
        "username": "...",
        "proxy": "socks5://username:password@172.0.0.1:6712"
    },
    { "...": {} }
]
```

Some free proxy servers can be found at: [https://free-proxy-list.net/](https://free-proxy-list.net/), [https://www.proxyscan.io/](https://www.proxyscan.io/) or [https://www.proxy-list.download/](https://www.proxy-list.download/)

## Features

-   Send messages to Telegram users or groups
-   Receive and process incoming messages
-   Automate tasks based on specific triggers
-   And much more!

## Contributing

Contributions are welcome! If you have any ideas, suggestions, or bug reports, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more information.
