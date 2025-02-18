import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, TextChannel, MessageFlags } from 'discord.js';
import { config } from '../config/config';
import type { Command } from '../types/command';

const command: Command = {
    data: new SlashCommandBuilder()
        .setName('send')
        .setDescription('Gửi tin nhắn theo lịch')
        .addStringOption(option =>
            option.setName('id')
                .setDescription('ID của tin nhắn cần gửi')
                .setRequired(true)
                .addChoices(
                    { name: 'Nhắc nhở đăng ký cơm', value: 'notice-meal-registration' },
                    { name: 'Đăng ký cơm trễ buổi sáng', value: 'morning-late-registration' },
                    { name: 'Đăng ký cơm trễ buổi tối', value: 'night-late-registration' },
                    { name: 'Đăng ký cơm ngày mai', value: 'meal-registration' }
                )
        ) as SlashCommandBuilder,

    async execute(interaction: ChatInputCommandInteraction) {
        try {
            if (!interaction.channel || !(interaction.channel instanceof TextChannel)) {
                await interaction.reply({
                    content: '❌ Lệnh này chỉ có thể sử dụng trong text channel!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const messageId = interaction.options.getString('id', true);
            const scheduledMessage = config.scheduledMessages.find(msg => msg.id === messageId);

            if (!scheduledMessage) {
                await interaction.reply({
                    content: '❌ Không tìm thấy tin nhắn với ID này!',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            const now = new Date();
            const title = eval('`' + scheduledMessage.embed.title + '`');

            const embedMessage = new EmbedBuilder()
                .setTitle(title)
                .setDescription(scheduledMessage.embed.description)
                .setColor(scheduledMessage.embed.color)
                .setTimestamp(now);

            if (scheduledMessage.embed.fields) {
                embedMessage.addFields(scheduledMessage.embed.fields);
            }

            await interaction.channel.send({
                content: scheduledMessage.message || '',
                embeds: [embedMessage]
            });

            await interaction.reply({
                content: '✅ Đã gửi tin nhắn thành công!',
                flags: MessageFlags.Ephemeral
            });

        } catch (error) {
            console.error('Error in send command:', error);
            await interaction.reply({
                content: '❌ Có lỗi xảy ra khi gửi tin nhắn!',
                flags: MessageFlags.Ephemeral
            });
        }
    },
}

export default command; 