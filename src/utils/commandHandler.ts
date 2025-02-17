import { Client, Collection } from 'discord.js';
import fs from 'fs';
import path from 'path';
import type { Command, CommandCollection } from '../types/command';

export const handleCommands = async (client: Client) => {
    client.commands = new Collection() as CommandCollection;
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const command: Command = await import(filePath);
        
        if ('data' in command && 'execute' in command) {
            client.commands.set(command.data.name, command);
        } else {
            console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
        }
    }
}; 