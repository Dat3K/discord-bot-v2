import { Events, type Interaction } from 'discord.js';

export default {
    name: Events.InteractionCreate,
    async execute(interaction: Interaction) {
        if (!interaction.isChatInputCommand()) return;

        const command = interaction.client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`Không tìm thấy lệnh ${interaction.commandName}`);
            await interaction.reply({
                content: '❌ Có lỗi khi thực hiện lệnh này!',
                ephemeral: true
            });
            return;
        }

        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(`Lỗi khi thực hiện lệnh ${interaction.commandName}:`, error);
            const errorMessage = {
                content: '❌ Có lỗi khi thực hiện lệnh này!',
                ephemeral: true
            };

            if (interaction.replied || interaction.deferred) {
                await interaction.followUp(errorMessage);
            } else {
                await interaction.reply(errorMessage);
            }
        }
    },
}; 