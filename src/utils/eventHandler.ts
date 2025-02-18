import { Client } from 'discord.js';
import fs from 'fs';
import path from 'path';

export const handleEvents = async (client: Client) => {
    const eventsPath = path.join(__dirname, '..', 'events');
    const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.ts'));

    for (const file of eventFiles) {
        const filePath = path.join(eventsPath, file);
        const event = (await import(filePath)).default;
        
        if (event.once) {
            client.once(event.name, (...args) => event.execute(...args));
        } else {
            client.on(event.name, (...args) => event.execute(...args));
        }
        console.log(`Registered event: ${event.name}`);
    }
}; 