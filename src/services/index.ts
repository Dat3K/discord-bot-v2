import { Client } from 'discord.js';
import { createReactionTrackerService } from './reactionTracker';

let reactionTracker: ReturnType<typeof createReactionTrackerService>;

export const initializeServices = (client: Client) => {
    reactionTracker = createReactionTrackerService(client);
};

export { reactionTracker }; 