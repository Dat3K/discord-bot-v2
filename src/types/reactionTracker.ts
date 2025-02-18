export interface ReactionTrackerData {
    messageId: string;
    channelId: string;
    guildId: string;
    emoji: string;
    endTime: Date;
    description: string;
}

export interface ReactionTracker extends ReactionTrackerData {
    isActive: boolean;
    participants: string[]; // User IDs
} 