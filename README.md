# Discord Bot for Meal Registration

A Discord bot for managing meal registrations in a community server. The bot helps track which users have registered for meals, sends reminders, and provides administrative features for managing the meal registration process.

## Features

- Meal registration tracking via reactions
- Daily reminders for meal registration
- Late registration handling
- Administrative commands for managing the system
- Logging of user reactions for auditing purposes

## Requirements

- Bun 1.0.0 or higher

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/discord-bot-v2.git
   cd discord-bot-v2
   ```

2. Install dependencies:
   ```
   bun install
   ```

3. Create a `.env` file in the root directory with the following variables:
   ```
   # Discord Bot Configuration
   BOT_TOKEN=your_bot_token
   CLIENT_ID=your_client_id
   GUILD_ID=your_guild_id

   # Timezone Configuration (GMT+7)
   TZ=Asia/Bangkok

   # Logging Configuration
   LOG_LEVEL=info
   ERROR_NOTIFICATION_CHANNEL_ID=your_error_channel_id

   # Meal Reminder Configuration
   MEAL_REMINDER_CHANNEL_ID=your_reminder_channel_id

   # Meal Registration Configuration
   MEAL_REGISTRATION_CHANNEL_ID=your_registration_channel_id
   MEAL_REGISTRATION_LOG_CHANNEL_ID=your_registration_log_channel_id
   LATE_MEAL_MORNING_REGISTRATION_CHANNEL_ID=your_late_morning_channel_id
   LATE_MEAL_MORNING_REGISTRATION_LOG_CHANNEL_ID=your_late_morning_log_channel_id
   LATE_MEAL_EVENING_REGISTRATION_CHANNEL_ID=your_late_evening_channel_id
   LATE_MEAL_EVENING_REGISTRATION_LOG_CHANNEL_ID=your_late_evening_log_channel_id

   # Development Mode
   NODE_ENV=development
   ```

4. Build the project:
   ```
   bun run build
   ```

## Usage

### Development Mode

```
bun run dev
```

### Production Mode

```
bun run build
bun run start
```

## Project Structure

- `src/` - Source code
  - `commands/` - Bot commands
  - `events/` - Discord event handlers
  - `utils/` - Utility functions
  - `config/` - Configuration files
  - `database/` - Database related code
- `data/` - Database files
- `dist/` - Compiled JavaScript files

## License

ISC
