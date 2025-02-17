# Discord Bot V2

Discord bot được xây dựng với Discord.js và TypeScript, sử dụng clean architecture và best practices.

## Tính năng

- Command handler tự động
- Event handler tự động
- TypeScript support
- Clean Architecture
- Hot-reload trong development

## Cài đặt

1. Clone repository:
```bash
git clone <your-repo-url>
cd discord-bot-v2
```

2. Cài đặt dependencies:
```bash
bun install
```

3. Tạo file `.env` và thêm các biến môi trường:
```env
DISCORD_BOT_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID=your_guild_id
```

## Chạy bot

Development mode (với hot-reload):
```bash
bun run dev
```

Production mode:
```bash
bun run start
```

## Cấu trúc project

```
src/
  ├── commands/        # Bot commands
  ├── events/         # Event handlers
  ├── config/         # Configuration
  ├── types/          # TypeScript types
  └── utils/          # Utility functions
```

## License

MIT
