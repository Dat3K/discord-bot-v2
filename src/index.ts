import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config/config';
import { handleCommands } from './utils/commandHandler';
import { handleEvents } from './utils/eventHandler';
import type { Command } from './types/command';

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
    }
}

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ]
});

// Initialize handlers
(async () => {
    try {
        await handleCommands(client);
        await handleEvents(client);
        await client.login(config.token);
    } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
})(); 