import { SlashCommandBuilder, ChatInputCommandInteraction, EmbedBuilder, Colors } from 'discord.js';
import type { Command } from '../types/command';
import { formatDistanceToNow, format } from 'date-fns';
import { vi } from 'date-fns/locale';
import { format as formatTz, toZonedTime } from 'date-fns-tz';

const VN_TIMEZONE = 'Asia/Ho_Chi_Minh';

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

        // Lấy thời gian hiện tại theo múi giờ Việt Nam
        const now = new Date();
        const vnTime = toZonedTime(now, VN_TIMEZONE);
        const currentTime = formatTz(vnTime, 'HH:mm:ss - EEEE, dd/MM/yyyy', { 
            timeZone: VN_TIMEZONE,
            locale: vi 
        });

        const embed = new EmbedBuilder()
            .setTitle('📊 Trạng thái Bot')
            .setColor(Colors.Green)
            .addFields([
                {
                    name: '🕒 Thời gian hiện tại',
                    value: currentTime,
                    inline: false
                },
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