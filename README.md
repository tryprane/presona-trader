# Presona Trader

An autonomous trading bot for Presagio markets with AI-powered news verification and automated Twitter updates.

## Features

- Double verification system using Google's Gemini AI and Tavily API
- Automated trading on Presagio markets
- Real-time Twitter updates of trading activities
- Comprehensive logging system
- Safe transaction handling

## Prerequisites

- Node.js (Latest LTS version recommended)
- PNPM package manager
- Twitter account for bot operations
- Google Gemini API access
- Tavily API key

## Installation

1. Clone the repository:
```bash
git clone https://github.com/tryprane/presona-trader
```

2. Install dependencies:
```bash
pnpm install --no-frozen-lockfile
```

3. Build the project:
```bash
pnpm build
```

## Configuration

1. Copy the example environment file:
```bash
cp .env.example .env
```

2. Configure the following environment variables:

### Presagio Trading Configuration
```env
ENABLE_TRADING=
ENABLE_PRESAGIO_TRADING=
SIGNER_PRIVATE_KEY=
SAFE_ADDRESS=
RPC_URL=
SUBGRAPH_URL=
```

### Twitter Bot Configuration
```env
TWITTER_DRY_RUN=false
TWITTER_USERNAME=  # Account username
TWITTER_PASSWORD=  # Account password
TWITTER_EMAIL=     # Account email
TWITTER_2FA_SECRET=
```

### AI Configuration
- Configure Google Gemini API credentials in the .env file

## Usage

Start the trader:
```bash
pnpm start
```

## Monitoring

- Trading activities are posted at: [Twitter @PresonaTrader](https://twitter.com/PresonaTrader)
- AI brain logs can be accessed at: http://34.136.180.247:3001/

## Support

For issues and feature requests, please open an issue in the GitHub repository.

## License

[Add your license information here]
