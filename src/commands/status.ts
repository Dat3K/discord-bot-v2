import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import type { Command } from '../types/command';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('Hiển thị trạng thái của bot') as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const client = interaction.client;
        const uptime = formatDistanceToNow(new Date(Date.now() - client.uptime), { 
            locale: vi,
            addSuffix: true 
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 Trạng thái Bot')
            .setColor(Colors.Green)
            .addFields([
                {
                    name: '⏱️ Thời gian hoạt động',
                    value: uptime,
                    inline: true
                },
                {
                    name: '📡 Độ trễ',
                    value: `${Math.round(client.ws.ping)}ms`,
                    inline: true
                },
                {
                    name: '🤖 Số lệnh',
                    value: `${client.commands.size} lệnh`,
                    inline: true
                },
                {
                    name: '🌐 Số server',
                    value: `${client.guilds.cache.size} server`,
                    inline: true
                }
            ])
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};

export default command; 