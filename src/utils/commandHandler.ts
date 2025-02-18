import { Client, Collection } from 'discord.js';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Command } from '../types/command';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const handleCommands = async (client: Client) => {
    client.commands = new Collection<string, Command>();
    const commandsPath = path.join(__dirname, '..', 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
        try {
            const filePath = path.join(commandsPath, file);
            const commandModule = await import(filePath);
            const command = commandModule.default;

            if (command?.data && command?.execute) {
                client.commands.set(command.data.name, command);
                console.log(`✅ Loaded command: ${command.data.name}`);
            } else {
                console.log(`⚠️ Command at ${filePath} is missing required "data" or "execute" property.`);
            }
        } catch (error) {
            console.error(`❌ Error loading command ${file}:`, error);
        }
    }
}; 