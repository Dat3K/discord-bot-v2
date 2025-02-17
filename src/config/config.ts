import dotenv from 'dotenv';

dotenv.config();

interface Config {
    token: string;
    clientId: string;
    guildId?: string;
}

if (!process.env.DISCORD_BOT_TOKEN) {
    throw new Error('DISCORD_BOT_TOKEN is required in .env file');
}

if (!process.env.CLIENT_ID) {
    throw new Error('CLIENT_ID is required in .env file');
}

export const config: Config = {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.CLIENT_ID,
    guildId: process.env.GUILD_ID
}; 