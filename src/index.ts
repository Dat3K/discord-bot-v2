import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { config } from './config/config';
import { handleCommands } from './utils/commandHandler';
import { handleEvents } from './utils/eventHandler';
import { initializeServices } from './services';
import type { Command } from './types/command';

declare module 'discord.js' {
    export interface Client {
        commands: Collection<string, Command>;
    }
}

console.log('Starting bot initialization...');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
    ]
});

// Initialize handlers
(async () => {
    try {
        console.log('Initializing services...');
        initializeServices(client);

        console.log('Initializing command handler...');
        await handleCommands(client);
        
        console.log('Initializing event handler...');
        await handleEvents(client);
        
        console.log('Logging in to Discord...');
        await client.login(config.token);
        
        console.log('Bot initialization completed successfully!');
    } catch (error) {
        console.error('Error during initialization:', error);
        process.exit(1);
    }
})(); 