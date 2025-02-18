import { REST, Routes } from 'discord.js';
import { config } from './config/config';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadCommands() {
    const commands = [];
    const commandsPath = path.join(__dirname, 'commands');
    const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.ts'));

    for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const commandModule = await import(filePath);
        const command = commandModule.default;

        if (command?.data && command?.execute) {
            commands.push(command.data.toJSON());
            console.log(`Loaded command: ${command.data.name}`);
        } else {
            console.log(`[WARNING] Command at ${filePath} is missing required "data" or "execute" property.`);
        }
    }

    return commands;
}

async function deployCommands() {
    try {
        const commands = await loadCommands();
        console.log(`Bắt đầu đăng ký ${commands.length} lệnh (/) với Discord API.`);

        const rest = new REST().setToken(config.token);

        if (config.guildId) {
            // Đăng ký commands cho server cụ thể (phát triển)
            await rest.put(
                Routes.applicationGuildCommands(config.clientId, config.guildId),
                { body: commands },
            );
            console.log(`Đã đăng ký thành công ${commands.length} lệnh cho guild ${config.guildId}`);
        } else {
            // Đăng ký commands toàn cục (production)
            await rest.put(
                Routes.applicationCommands(config.clientId),
                { body: commands },
            );
            console.log(`Đã đăng ký thành công ${commands.length} lệnh toàn cục`);
        }
    } catch (error) {
        console.error('Có lỗi khi đăng ký commands:', error);
    }
}

// Chạy hàm deploy
deployCommands(); 