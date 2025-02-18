import { SlashCommandBuilder, ChatInputCommandInteraction } from 'discord.js';
import type { Command } from '../types/command';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('ping')
        .setDescription('Kiểm tra độ trễ của bot') as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const sent = await interaction.reply({ content: 'Đang tính toán...', fetchReply: true });
        const latency = sent.createdTimestamp - interaction.createdTimestamp;
        const apiLatency = Math.round(interaction.client.ws.ping);
        
        await interaction.editReply({
            content: `🏓 Pong!\n⏱️ Độ trễ: ${latency}ms\n📡 API: ${apiLatency}ms`
        });
    },
};

export default command; 