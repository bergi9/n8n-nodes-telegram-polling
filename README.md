# n8n-nodes-telegram-polling

An n8n trigger node for telegram that uses the [getUpdates API](https://core.telegram.org/bots/api#getupdates) to receive updates with long polling.

The default long polling timeout is 60 seconds.

#### Motivation:
I'm sitting behind a CGNAT for IPv4 but I have an IPv6 Prefix.
The Telegram webhook method does not support IPv6 yet.
So the only solution without renting an IPv4 public facing server is to use the long polling method.
Another alternatives would be to use the tunnel/VPN.

## License

[MIT](https://github.com/n8n-io/n8n-nodes-starter/blob/master/LICENSE.md)
