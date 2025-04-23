# Discord Bot V2

A Discord bot built with TypeScript and Bun, designed to handle scheduled messages, reaction collection, and more.

## Features

- Scheduled message sending
- Reaction collection and processing
- Error notification system
- Logging system
- Command handling

## Prerequisites

- Bun 1.0 or higher
- Discord Developer Account
- Bot Token
- Server with 24/7 uptime

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/discord-bot-v2.git
   cd discord-bot-v2
   ```

2. Install dependencies
   ```bash
   bun install
   ```

3. Create a `.env` file based on `.env.example`
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your Discord bot token and other configuration

## Usage

### Development

```bash
bun dev
```

This will start the bot with hot reloading enabled.

### Production

```bash
bun start
```

### Building

```bash
bun build
```

## Project Structure

```
discord-bot-v2/
├── src/
│   ├── config/       # Configuration files
│   ├── services/     # Core services
│   ├── events/       # Discord.js event handlers
│   ├── commands/     # Bot commands
│   ├── utils/        # Utility functions
│   ├── types/        # TypeScript types
│   ├── interfaces/   # TypeScript interfaces
│   ├── data/         # Data storage
│   └── index.ts      # Entry point
├── .env              # Environment variables
├── .env.example      # Example environment variables
├── .gitignore        # Git ignore file
├── package.json      # Project dependencies
├── tsconfig.json     # TypeScript configuration
└── README.md         # Project documentation
```

## License

MIT
