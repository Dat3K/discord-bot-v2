import { Client } from 'discord.js';
import { createReactionTrackerService } from './reactionTracker';
import { createReactionLoggerService } from './reactionLogger';

let reactionTracker: ReturnType<typeof createReactionTrackerService>;
let reactionLogger: ReturnType<typeof createReactionLoggerService>;

export const initializeServices = (client: Client) => {
    reactionTracker = createReactionTrackerService(client);
    reactionLogger = createReactionLoggerService(client);
};

export { reactionTracker, reactionLogger }; 