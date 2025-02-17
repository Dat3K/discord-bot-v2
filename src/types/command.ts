import { 
    ChatInputCommandInteraction, 
    SlashCommandBuilder, 
    Collection 
} from 'discord.js';

export interface Command {
    data: SlashCommandBuilder;
    execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface CommandCollection extends Collection<string, Command> {} 