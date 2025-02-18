import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors, MessageFlags } from 'discord.js';
import type { Command } from '../types/command';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Hiển thị danh sách các lệnh có sẵn') as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        const commands = interaction.client.commands;
        
        const embed = new EmbedBuilder()
            .setTitle('📚 Danh sách lệnh')
            .setDescription('Các lệnh có sẵn trong bot:')
            .setColor(Colors.Blue)
            .setTimestamp();

        commands.forEach(cmd => {
            embed.addFields({
                name: `/${cmd.data.name}`,
                value: cmd.data.description || 'Không có mô tả',
                inline: true
            });
        });

        await interaction.reply({ 
            embeds: [embed], 
            flags: MessageFlags.Ephemeral 
        });
    },
};

export default command; 