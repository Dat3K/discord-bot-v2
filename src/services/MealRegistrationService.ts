/**
 * Meal Registration Service
 *
 * This service manages the daily meal registration embed message.
 * It creates a new embed message every day at 5 AM and ends at 3 AM the next day.
 * It also manages late meal registration messages at specific times.
 * Users can register for meals by reacting to the messages.
 */

import { Client, EmbedBuilder, GuildMember, Message, MessageReaction, TextChannel, User } from 'discord.js';
import type { PartialMessageReaction, PartialUser } from 'discord.js';
import { CronJob } from 'cron';
import { formatInTimeZone } from 'date-fns-tz';
import { addDays } from 'date-fns';
import { LoggingService } from './LoggingService.js';
import { DatabaseService } from './DatabaseService.js';
import { MemberService } from './MemberService.js';
import { config } from '../config/config.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Meal Registration Service
 * Manages the daily meal registration embed message
 */
export class MealRegistrationService {
  private static instance: MealRegistrationService;
  private client: Client | null = null;
  private registrationChannelId: string = '';
  private logChannelId: string = '';
  private lateRegistrationChannelId: string = '';
  private lateRegistrationLogChannelId: string = '';
  private useErrorChannelForLateRegistration: boolean = false;
  private currentRegistrationMessage: Message | null = null;
  private currentLateBreakfastMessage: Message | null = null;
  private currentLateDinnerMessage: Message | null = null;
  private createMessageJob: CronJob | null = null;
  private endRegistrationJob: CronJob | null = null;
  private createLateBreakfastJob: CronJob | null = null;
  private endLateBreakfastJob: CronJob | null = null;
  private createLateDinnerJob: CronJob | null = null;
  private endLateDinnerJob: CronJob | null = null;

  // Emoji reactions for breakfast and dinner
  private readonly BREAKFAST_EMOJI = '🌞'; // Breakfast emoji (morning sun)
  private readonly DINNER_EMOJI = '🌙'; // Dinner emoji (moon)
  private readonly LATE_BREAKFAST_EMOJI = '🍳'; // Late breakfast emoji (frying pan)
  private readonly LATE_DINNER_EMOJI = '🍲'; // Late dinner emoji (pot of food)

  // Role ID for members who should be tracked
  private readonly TRACKED_ROLE_ID = '1162022091630059531';

  /**
   * Private constructor (Singleton pattern)
   */
  private constructor() {
    // Initialize channel IDs from config
    this.lateRegistrationChannelId = config.mealRegistration.lateChannelId;
    this.lateRegistrationLogChannelId = config.mealRegistration.lateLogChannelId;

    logger.info('MealRegistrationService initialized');
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): MealRegistrationService {
    if (!MealRegistrationService.instance) {
      MealRegistrationService.instance = new MealRegistrationService();
    }
    return MealRegistrationService.instance;
  }

  /**
   * Sets the Discord client
   * @param client The Discord client
   */
  public setClient(client: Client): void {
    this.client = client;

    // Set up reaction collector when client is set
    this.setupReactionCollector();
  }

  /**
   * Sets the channel ID for registration messages
   * @param channelId The channel ID to send registration messages to
   */
  public setRegistrationChannel(channelId: string): void {
    // If in development mode, use the error notification channel
    if (config.isDevelopment) {
      this.registrationChannelId = config.logging.errorNotificationChannelId;
      logger.info('Development mode: Using error notification channel for meal registration', {
        channelId: this.registrationChannelId,
        originalChannelId: channelId
      });
    } else {
      this.registrationChannelId = channelId;
      logger.info('Registration channel set', { channelId });
    }
  }

  /**
   * Sets the channel ID for logging meal registration activities
   * @param channelId The channel ID to send logs to
   */
  public setLogChannel(channelId: string): void {
    this.logChannelId = channelId;
    logger.info('Log channel set', { channelId });
  }

  /**
   * Sets the channel ID for late registration messages
   * @param channelId The channel ID to send late registration messages to (optional, uses config value if not provided)
   */
  public setLateRegistrationChannel(channelId?: string): void {
    // If in development mode, use the error notification channel
    if (config.isDevelopment) {
      this.useErrorChannelForLateRegistration = true;
      logger.info('Development mode: Will use error notification channel for late meal registration', {
        channelId: config.logging.errorNotificationChannelId,
        originalChannelId: channelId || this.lateRegistrationChannelId
      });
    } else if (channelId) {
      this.lateRegistrationChannelId = channelId;
      logger.info('Late registration channel set', { channelId });
    } else {
      // Use the channel ID from config
      logger.info('Using late registration channel from config', { channelId: this.lateRegistrationChannelId });
    }
  }

  /**
   * Sends a log message to the log channel using an embed
   * @param user The user who performed the action
   * @param action The action performed (add or remove reaction)
   * @param mealType The type of meal (breakfast or dinner)
   * @param message The message that was reacted to
   */
  private async sendLogEmbed(
    user: User | PartialUser,
    action: 'add' | 'remove',
    mealType: 'breakfast' | 'dinner',
    message: Message
  ): Promise<void> {
    if (!this.client) {
      logger.error('Client not set, cannot send log message');
      return;
    }

    if (!this.logChannelId) {
      logger.error('Log channel not set, cannot send log message');
      return;
    }

    try {
      // Get the channel
      const channel = await this.client.channels.fetch(this.logChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid log channel', { channelId: this.logChannelId });
        return;
      }

      // Get the current time in the configured timezone
      const now = new Date();
      const timeStr = formatInTimeZone(now, config.timezone.timezone, 'dd/MM/yyyy HH:mm:ss');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(action === 'add' ? '#00FF00' : '#FF0000')
        .setTitle(action === 'add' ? '✅ Đăng ký bữa ăn' : '❌ Hủy đăng ký bữa ăn')
        .setDescription(`**${user.tag}** đã ${action === 'add' ? 'đăng ký' : 'hủy đăng ký'} **${mealType === 'breakfast' ? 'bữa sáng' : 'bữa tối'}** cho ngày mai`)
        .addFields(
          { name: 'Người dùng', value: `<@${user.id}> (${user.id})`, inline: true },
          { name: 'Thời gian', value: timeStr, inline: true },
          { name: 'Tin nhắn', value: `[Xem tin nhắn đăng ký](${message.url})`, inline: true }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn' })
        .setTimestamp();

      // Send the embed
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Error sending log embed', { error, userId: user.id, action, mealType });
    }
  }

  /**
   * Starts the meal registration service
   */
  public async start(): Promise<void> {
    if (!this.client) {
      throw new Error('Client not set');
    }

    if (!this.registrationChannelId) {
      throw new Error('Registration channel not set');
    }

    // Verify that the channels exist
    try {
      const channel = await this.client.channels.fetch(this.registrationChannelId);
      if (!channel) {
        throw new Error(`Channel with ID ${this.registrationChannelId} not found`);
      }
      if (!(channel instanceof TextChannel)) {
        throw new Error(`Channel with ID ${this.registrationChannelId} is not a text channel`);
      }

      // Verify late registration channel
      const lateChannel = await this.client.channels.fetch(this.lateRegistrationChannelId);
      if (!lateChannel) {
        throw new Error(`Late registration channel with ID ${this.lateRegistrationChannelId} not found`);
      }
      if (!(lateChannel instanceof TextChannel)) {
        throw new Error(`Late registration channel with ID ${this.lateRegistrationChannelId} is not a text channel`);
      }

      // Verify late registration log channel
      const lateLogChannel = await this.client.channels.fetch(this.lateRegistrationLogChannelId);
      if (!lateLogChannel) {
        throw new Error(`Late registration log channel with ID ${this.lateRegistrationLogChannelId} not found`);
      }
      if (!(lateLogChannel instanceof TextChannel)) {
        throw new Error(`Late registration log channel with ID ${this.lateRegistrationLogChannelId} is not a text channel`);
      }
    } catch (error: any) {
      logger.error('Failed to fetch channels', { error });
      throw new Error(`Failed to fetch channels: ${error.message || 'Unknown error'}`);
    }

    logger.info('Starting meal registration service');

    // Schedule the creation of a new registration message every day at 5 AM
    this.createMessageJob = new CronJob(
      '0 5 * * *', // Run at 5:00 AM every day
      () => {
        this.createRegistrationMessage();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Schedule the end of registration at 3 AM the next day
    this.endRegistrationJob = new CronJob(
      '0 3 * * *', // Run at 3:00 AM every day
      () => {
        this.endRegistration();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Schedule the creation of late breakfast registration message at 5 AM
    this.createLateBreakfastJob = new CronJob(
      '0 5 * * *', // Run at 5:00 AM every day
      () => {
        this.createLateBreakfastMessage();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Schedule the end of late breakfast registration at 11 AM
    this.endLateBreakfastJob = new CronJob(
      '0 11 * * *', // Run at 11:00 AM every day
      () => {
        this.endLateBreakfastRegistration();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Schedule the creation of late dinner registration message at 11:30 AM
    this.createLateDinnerJob = new CronJob(
      '30 11 * * *', // Run at 11:30 AM every day
      () => {
        this.createLateDinnerMessage();
      },
      null,
      true,
      config.timezone.timezone
    );

    // Schedule the end of late dinner registration at 6:15 PM
    this.endLateDinnerJob = new CronJob(
      '15 18 * * *', // Run at 6:15 PM every day
      () => {
        this.endLateDinnerRegistration();
      },
      null,
      true,
      config.timezone.timezone
    );

    // In production mode, create messages immediately based on current time
    if (!config.isDevelopment) {
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();

      // Create a registration message immediately if it's between 5 AM and 3 AM next day
      if (hour >= 5 || hour < 3) {
        await this.createRegistrationMessage();
      }

      // Create late breakfast message if it's between 5 AM and 11 AM
      if (hour >= 5 && hour < 11) {
        await this.createLateBreakfastMessage();
      }

      // Create late dinner message if it's between 11:30 AM and 6:15 PM
      if ((hour === 11 && minute >= 30) || (hour > 11 && hour < 18) || (hour === 18 && minute <= 15)) {
        await this.createLateDinnerMessage();
      }
    } else {
      logger.info('Development mode: Automatic message creation disabled. Use /test commands instead.');
    }

    logger.info('Meal registration service started');
  }

  /**
   * Sets up the reaction collector to listen for reactions on the registration messages
   */
  private setupReactionCollector(): void {
    if (!this.client) {
      logger.error('Client not set, cannot setup reaction collector');
      return;
    }

    // Listen for messageReactionAdd events
    this.client.on('messageReactionAdd', async (reaction, user) => {
      // Ignore bot's own reactions
      if (user.bot) return;

      // Check if this is our registration message
      if (this.currentRegistrationMessage && reaction.message.id === this.currentRegistrationMessage.id) {
        await this.handleReactionAdd(reaction, user);
      }

      // Check if this is our late breakfast registration message
      if (this.currentLateBreakfastMessage && reaction.message.id === this.currentLateBreakfastMessage.id) {
        await this.handleLateReactionAdd(reaction, user, 'breakfast');
      }

      // Check if this is our late dinner registration message
      if (this.currentLateDinnerMessage && reaction.message.id === this.currentLateDinnerMessage.id) {
        await this.handleLateReactionAdd(reaction, user, 'dinner');
      }
    });

    // Listen for messageReactionRemove events
    this.client.on('messageReactionRemove', async (reaction, user) => {
      // Ignore bot's own reactions
      if (user.bot) return;

      // Check if this is our registration message
      if (this.currentRegistrationMessage && reaction.message.id === this.currentRegistrationMessage.id) {
        await this.handleReactionRemove(reaction, user);
      }

      // Check if this is our late breakfast registration message
      if (this.currentLateBreakfastMessage && reaction.message.id === this.currentLateBreakfastMessage.id) {
        await this.handleLateReactionRemove(reaction, user, 'breakfast');
      }

      // Check if this is our late dinner registration message
      if (this.currentLateDinnerMessage && reaction.message.id === this.currentLateDinnerMessage.id) {
        await this.handleLateReactionRemove(reaction, user, 'dinner');
      }
    });

    logger.info('Reaction collector set up');
  }

  /**
   * Handles a reaction being added to the registration message
   * @param reaction The reaction that was added
   * @param user The user who added the reaction
   */
  private async handleReactionAdd(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
    const emoji = reaction.emoji.name;
    const message = reaction.message;

    if (emoji === this.BREAKFAST_EMOJI) {
      logger.info('User registered for breakfast', { userId: user.id, username: user.tag });
      // Add the user to the breakfast registration list
      const db = DatabaseService.getInstance();
      db.registerMeal(user.id, user.tag || 'Unknown', 'breakfast', message.id.toString());
      await this.sendLogEmbed(user, 'add', 'breakfast', message as Message);
    } else if (emoji === this.DINNER_EMOJI) {
      logger.info('User registered for dinner', { userId: user.id, username: user.tag });
      // Add the user to the dinner registration list
      const db = DatabaseService.getInstance();
      db.registerMeal(user.id, user.tag || 'Unknown', 'dinner', message.id.toString());
      await this.sendLogEmbed(user, 'add', 'dinner', message as Message);
    }
  }

  /**
   * Handles a reaction being removed from the registration message
   * @param reaction The reaction that was removed
   * @param user The user who removed the reaction
   */
  private async handleReactionRemove(reaction: MessageReaction | PartialMessageReaction, user: User | PartialUser): Promise<void> {
    const emoji = reaction.emoji.name;
    const message = reaction.message;

    if (emoji === this.BREAKFAST_EMOJI) {
      logger.info('User unregistered from breakfast', { userId: user.id, username: user.tag });
      // Remove the user from the breakfast registration list
      const db = DatabaseService.getInstance();
      db.unregisterMeal(user.id, 'breakfast', message.id.toString());
      await this.sendLogEmbed(user, 'remove', 'breakfast', message as Message);
    } else if (emoji === this.DINNER_EMOJI) {
      logger.info('User unregistered from dinner', { userId: user.id, username: user.tag });
      // Remove the user from the dinner registration list
      const db = DatabaseService.getInstance();
      db.unregisterMeal(user.id, 'dinner', message.id.toString());
      await this.sendLogEmbed(user, 'remove', 'dinner', message as Message);
    }
  }

  /**
   * Creates a new registration message
   */
  public async createRegistrationMessage(): Promise<void> {
    if (!this.client) {
      logger.error('Client not set');
      return;
    }

    try {
      // Get the channel
      const channel = await this.client.channels.fetch(this.registrationChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid registration channel', { channelId: this.registrationChannelId });
        return;
      }

      // Get tomorrow's date for registration
      const now = new Date();
      const tomorrow = addDays(now, 1);
      const tomorrowStr = formatInTimeZone(tomorrow, config.timezone.timezone, 'dd/MM/yyyy');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#0099FF')
        .setTitle('🍽️ Đăng ký bữa ăn')
        .setDescription(`Xin hãy đăng ký bữa ăn cho ngày mai (${tomorrowStr}) bằng cách react vào tin nhắn này.`)
        .addFields(
          { name: 'Bữa sáng', value: `React ${this.BREAKFAST_EMOJI} để đăng ký bữa sáng`, inline: false },
          { name: 'Bữa tối', value: `React ${this.DINNER_EMOJI} để đăng ký bữa tối`, inline: false },
          { name: 'Thời gian đăng ký', value: config.isDevelopment ? 'Chỉ 10 giây (chế độ development)' : 'Từ 5:00 sáng hôm nay đến 3:00 sáng ngày mai', inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn tự động' })
        .setTimestamp();

      // Send the message
      const message = await channel.send({ embeds: [embed] });

      // Add the reactions for users to click
      await message.react(this.BREAKFAST_EMOJI);
      await message.react(this.DINNER_EMOJI);

      // Store the current registration message
      this.currentRegistrationMessage = message;

      logger.info('Registration message created', { messageId: message.id, channelId: channel.id });

      // In development mode, end registration after 10 seconds
      if (config.isDevelopment) {
        logger.info('Development mode: Registration will end in 10 seconds');
        setTimeout(async () => {
          logger.info('Development mode: Ending registration now');
          await this.endRegistration();
        }, 10000); // 10 seconds
      }
    } catch (error) {
      logger.error('Error creating registration message', { error });
    }
  }

  /**
   * Gets all members with the tracked role
   * @returns A list of members with the tracked role
   */
  private async getTrackedMembers(): Promise<GuildMember[]> {
    if (!this.client) {
      logger.error('Client not set, cannot get tracked members');
      return [];
    }

    if (!this.currentRegistrationMessage) {
      logger.error('No active registration message, cannot get tracked members');
      return [];
    }

    try {
      // Get the guild from the message
      const guild = this.currentRegistrationMessage.guild;
      if (!guild) {
        logger.error('Message not in a guild');
        return [];
      }

      // First try to use the MemberService to get members from the database
      const memberService = MemberService.getInstance();
      const trackedMembersFromDb = memberService.getTrackedMembers();

      if (trackedMembersFromDb.length > 0) {
        logger.info(`Using ${trackedMembersFromDb.length} tracked members from database`);

        // Convert database members to GuildMember objects
        const guildMembers: GuildMember[] = [];

        for (const dbMember of trackedMembersFromDb) {
          try {
            const member = await guild.members.fetch(dbMember.userId).catch(() => null);
            if (member) {
              guildMembers.push(member);
            }
          } catch (error) {
            logger.warn(`Could not fetch member ${dbMember.userId} from guild`, { error });
          }
        }

        if (guildMembers.length > 0) {
          return guildMembers;
        }

        logger.warn('No valid guild members found from database, falling back to direct fetch');
      }

      // Fallback: Fetch all members directly from Discord
      logger.info('Fetching tracked members directly from Discord');

      // Fetch all members (this might be slow for large guilds)
      try {
        await guild.members.fetch({ time: 5000 });
      } catch (fetchError) {
        logger.warn('Could not fetch all members, using cached members instead', { error: fetchError });
      }

      // Get the role
      const role = guild.roles.cache.get(this.TRACKED_ROLE_ID);
      if (!role) {
        logger.error('Tracked role not found', { roleId: this.TRACKED_ROLE_ID });
        return [];
      }

      // Get all members with the role
      return Array.from(role.members.values());
    } catch (error) {
      logger.error('Error getting tracked members', { error });
      return [];
    }
  }

  /**
   * Gets the list of registered and unregistered members for a meal
   * @param mealType The meal type (breakfast or dinner)
   * @returns The lists of registered and unregistered members
   */
  private async getMealRegistrationLists(mealType: 'breakfast' | 'dinner'): Promise<{
    registered: { userId: string, username: string, displayName: string }[];
    unregistered: { userId: string, username: string, displayName: string }[];
  }> {
    if (!this.currentRegistrationMessage) {
      logger.error('No active registration message, cannot get registration lists');
      return { registered: [], unregistered: [] };
    }

    try {
      // Get all tracked members
      const trackedMembers = await this.getTrackedMembers();

      // Get all registered users from the database
      const db = DatabaseService.getInstance();
      const registeredUsersFromDb = db.getRegisteredUsers(mealType, this.currentRegistrationMessage.id.toString());

      // Create a set of registered user IDs for quick lookup
      const registeredUserIds = new Set(registeredUsersFromDb.map(user => user.userId));

      // Get guild for member lookup
      const guild = this.currentRegistrationMessage.guild;
      if (!guild) {
        logger.error('Message not in a guild');
        return {
          registered: registeredUsersFromDb.map(user => ({ ...user, displayName: user.username })),
          unregistered: []
        };
      }

      // Enhance registered users with display names
      const registeredUsers = await Promise.all(registeredUsersFromDb.map(async user => {
        try {
          const member = await guild.members.fetch(user.userId).catch(() => null);
          return {
            userId: user.userId,
            username: user.username,
            displayName: member ? member.nickname || member.user.tag : user.username
          };
        } catch {
          return {
            userId: user.userId,
            username: user.username,
            displayName: user.username
          };
        }
      }));

      // Find unregistered members (tracked members who are not in the registered list)
      const unregisteredMembers = trackedMembers
        .filter(member => !registeredUserIds.has(member.id))
        .map(member => ({
          userId: member.id,
          username: member.user.tag,
          displayName: member.nickname || member.user.tag
        }));

      return {
        registered: registeredUsers,
        unregistered: unregisteredMembers
      };
    } catch (error) {
      logger.error('Error getting meal registration lists', { error, mealType });
      return { registered: [], unregistered: [] };
    }
  }

  /**
   * Creates an embed showing the registration status
   * @param mealType The meal type (breakfast or dinner)
   * @returns The embed
   */
  public async createRegistrationStatusEmbed(mealType: 'breakfast' | 'dinner'): Promise<EmbedBuilder> {
    if (!this.currentRegistrationMessage) {
      throw new Error('No active registration message');
    }

    // Get the registration lists
    const { registered, unregistered } = await this.getMealRegistrationLists(mealType);

    // Format the lists
    const registeredList = registered.length > 0
      ? registered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
      : 'Không có ai';

    const unregisteredList = unregistered.length > 0
      ? unregistered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
      : 'Không có ai';

    // Create the embed
    const embed = new EmbedBuilder()
      .setColor('#0099FF')
      .setTitle(`🍽️ Trạng thái đăng ký ${mealType === 'breakfast' ? 'bữa sáng' : 'bữa tối'}`)
      .setDescription(`Trạng thái đăng ký ${mealType === 'breakfast' ? 'bữa sáng' : 'bữa tối'} cho ngày mai`)
      .addFields(
        { name: `Đã đăng ký (${registered.length})`, value: registeredList.length > 1024 ? registeredList.substring(0, 1021) + '...' : registeredList, inline: false },
        { name: `Chưa đăng ký (${unregistered.length})`, value: unregisteredList.length > 1024 ? unregisteredList.substring(0, 1021) + '...' : unregisteredList, inline: false }
      )
      .setFooter({ text: 'Hệ thống đăng ký bữa ăn' })
      .setTimestamp();

    return embed;
  }

  /**
   * Removes all reactions from the registration message
   */
  private async removeAllReactions(): Promise<void> {
    if (!this.currentRegistrationMessage) {
      logger.info('No active registration message, cannot remove reactions');
      return;
    }

    try {
      // Remove all reactions
      await this.currentRegistrationMessage.reactions.removeAll();
      logger.info('All reactions removed from registration message', { messageId: this.currentRegistrationMessage.id });
    } catch (error) {
      logger.error('Error removing reactions', { error, messageId: this.currentRegistrationMessage?.id });
    }
  }

  /**
   * Ends the current registration period
   */
  public async endRegistration(): Promise<void> {
    logger.info('Attempting to end registration');

    if (!this.currentRegistrationMessage) {
      logger.info('No active registration message to end');
      return;
    }

    try {
      // Get the message
      const message = this.currentRegistrationMessage;
      logger.info('Found active registration message', { messageId: message.id });

      // For development mode, simplify the process to avoid potential errors
      if (config.isDevelopment) {
        logger.info('Development mode: Using simplified registration ending via test command');

        try {
          // Get the registration lists for both meal types
          const breakfastLists = await this.getMealRegistrationLists('breakfast');
          const dinnerLists = await this.getMealRegistrationLists('dinner');

          // Count the registrations
          const breakfastCount = breakfastLists.registered.length;
          const dinnerCount = dinnerLists.registered.length;

          // Create a list of all tracked members
          const trackedMembers = await this.getTrackedMembers();

          // Find members who haven't registered for either meal
          const breakfastRegisteredIds = new Set(breakfastLists.registered.map(user => user.userId));
          const dinnerRegisteredIds = new Set(dinnerLists.registered.map(user => user.userId));

          const notRegisteredMembers = trackedMembers
            .filter(member => !breakfastRegisteredIds.has(member.id) && !dinnerRegisteredIds.has(member.id))
            .map(member => ({
              userId: member.id,
              username: member.user.tag,
              displayName: member.nickname || member.user.tag
            }));

          // Format the lists
          const breakfastRegisteredList = breakfastLists.registered.length > 0
            ? breakfastLists.registered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
            : 'Không có ai';

          const dinnerRegisteredList = dinnerLists.registered.length > 0
            ? dinnerLists.registered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
            : 'Không có ai';

          const notRegisteredList = notRegisteredMembers.length > 0
            ? notRegisteredMembers.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
            : 'Không có ai';

          // Create the summary embed
          const summaryEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🍽️ Kết quả đăng ký bữa ăn')
            .setDescription('Đăng ký đã kết thúc (chế độ development)')
            .addFields(
              { name: `Đã đăng ký bữa sáng (${breakfastCount})`, value: breakfastRegisteredList.length > 1024 ? breakfastRegisteredList.substring(0, 1021) + '...' : breakfastRegisteredList, inline: false },
              { name: `Đã đăng ký bữa tối (${dinnerCount})`, value: dinnerRegisteredList.length > 1024 ? dinnerRegisteredList.substring(0, 1021) + '...' : dinnerRegisteredList, inline: false },
              { name: `Chưa đăng ký bữa nào (${notRegisteredMembers.length})`, value: notRegisteredList.length > 1024 ? notRegisteredList.substring(0, 1021) + '...' : notRegisteredList, inline: false }
            )
            .setFooter({ text: 'Hệ thống đăng ký bữa ăn' })
            .setTimestamp();

          // Update the message
          await message.edit({ embeds: [summaryEmbed] });
          logger.info('Updated message with registration summary');
        } catch (error) {
          logger.error('Error creating registration summary', { error });

          // Fallback to simple embed if there's an error
          const simpleEmbed = new EmbedBuilder()
            .setColor('#FF0000')
            .setTitle('🍽️ Đăng ký bữa ăn (Đã kết thúc)')
            .setDescription('Đăng ký đã kết thúc (chế độ development)')
            .addFields(
              { name: 'Thông báo', value: 'Đăng ký đã kết thúc sau 10 giây theo cấu hình development', inline: false }
            )
            .setFooter({ text: 'Hệ thống đăng ký bữa ăn' })
            .setTimestamp();

          await message.edit({ embeds: [simpleEmbed] });
          logger.info('Updated message with simplified embed (fallback)');
        }

        // Remove all reactions
        await this.removeAllReactions();

        // Clear the database for this message
        const db = DatabaseService.getInstance();
        db.clearRegistrations(message.id.toString());

        // Clear the current registration message
        this.currentRegistrationMessage = null;

        logger.info('Registration ended (development mode)');
        return;
      }

      // For production mode, use the full process
      // Get the registration lists
      const breakfastLists = await this.getMealRegistrationLists('breakfast');
      const dinnerLists = await this.getMealRegistrationLists('dinner');

      // Count the registrations
      const breakfastCount = breakfastLists.registered.length;
      const dinnerCount = dinnerLists.registered.length;

      // Create a list of all tracked members
      const trackedMembers = await this.getTrackedMembers();

      // Find members who haven't registered for either meal
      const breakfastRegisteredIds = new Set(breakfastLists.registered.map(user => user.userId));
      const dinnerRegisteredIds = new Set(dinnerLists.registered.map(user => user.userId));

      const notRegisteredMembers = trackedMembers
        .filter(member => !breakfastRegisteredIds.has(member.id) && !dinnerRegisteredIds.has(member.id))
        .map(member => ({
          userId: member.id,
          username: member.user.tag,
          displayName: member.nickname || member.user.tag
        }));

      // Format the lists
      const breakfastRegisteredList = breakfastLists.registered.length > 0
        ? breakfastLists.registered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
        : 'Không có ai';

      const dinnerRegisteredList = dinnerLists.registered.length > 0
        ? dinnerLists.registered.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
        : 'Không có ai';

      const notRegisteredList = notRegisteredMembers.length > 0
        ? notRegisteredMembers.map(user => `<@${user.userId}> (${user.displayName})`).join('\n')
        : 'Không có ai';

      // Create the summary embed
      const summaryEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🍽️ Kết quả đăng ký bữa ăn')
        .setDescription('Đăng ký đã kết thúc')
        .addFields(
          { name: `Đã đăng ký bữa sáng (${breakfastCount})`, value: breakfastRegisteredList.length > 1024 ? breakfastRegisteredList.substring(0, 1021) + '...' : breakfastRegisteredList, inline: false },
          { name: `Đã đăng ký bữa tối (${dinnerCount})`, value: dinnerRegisteredList.length > 1024 ? dinnerRegisteredList.substring(0, 1021) + '...' : dinnerRegisteredList, inline: false },
          { name: `Chưa đăng ký bữa nào (${notRegisteredMembers.length})`, value: notRegisteredList.length > 1024 ? notRegisteredList.substring(0, 1021) + '...' : notRegisteredList, inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn' })
        .setTimestamp();

      // Update the message
      await message.edit({ embeds: [summaryEmbed] });

      // Remove all reactions
      await this.removeAllReactions();

      // Clear the database for this message
      const db = DatabaseService.getInstance();
      db.clearRegistrations(message.id.toString());

      // Clear the current registration message
      this.currentRegistrationMessage = null;

      logger.info('Registration ended', {
        messageId: message.id,
        breakfastCount,
        dinnerCount
      });
    } catch (error) {
      logger.error('Error ending registration', { error });
    }
  }

  /**
   * Sends a log message to the late registration log channel using an embed
   * @param user The user who performed the action
   * @param action The action performed (add or remove reaction)
   * @param mealType The type of meal (breakfast or dinner)
   * @param message The message that was reacted to
   */
  private async sendLateLogEmbed(
    user: User | PartialUser,
    action: 'add' | 'remove',
    mealType: 'breakfast' | 'dinner',
    message: Message
  ): Promise<void> {
    if (!this.client) {
      logger.error('Client not set, cannot send late log message');
      return;
    }

    if (!this.lateRegistrationLogChannelId) {
      logger.error('Late registration log channel not set, cannot send log message');
      return;
    }

    try {
      // Get the channel
      const channel = await this.client.channels.fetch(this.lateRegistrationLogChannelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid late registration log channel', { channelId: this.lateRegistrationLogChannelId });
        return;
      }

      // Get the current time in the configured timezone
      const now = new Date();
      const timeStr = formatInTimeZone(now, config.timezone.timezone, 'dd/MM/yyyy HH:mm:ss');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor(action === 'add' ? '#00FF00' : '#FF0000')
        .setTitle(action === 'add' ? '✅ Đăng ký bữa ăn trễ' : '❌ Hủy đăng ký bữa ăn trễ')
        .setDescription(`**${user.tag}** đã ${action === 'add' ? 'đăng ký' : 'hủy đăng ký'} **${mealType === 'breakfast' ? 'bữa sáng' : 'bữa tối'} trễ** cho ngày hôm nay`)
        .addFields(
          { name: 'Người dùng', value: `<@${user.id}> (${user.id})`, inline: true },
          { name: 'Thời gian', value: timeStr, inline: true },
          { name: 'Tin nhắn', value: `[Xem tin nhắn đăng ký](${message.url})`, inline: true }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn trễ' })
        .setTimestamp();

      // Send the embed
      await channel.send({ embeds: [embed] });
    } catch (error) {
      logger.error('Error sending late log embed', { error, userId: user.id, action, mealType });
    }
  }

  /**
   * Handles a reaction being added to the late registration message
   * @param reaction The reaction that was added
   * @param user The user who added the reaction
   * @param mealType The type of meal (breakfast or dinner)
   */
  private async handleLateReactionAdd(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    mealType: 'breakfast' | 'dinner'
  ): Promise<void> {
    const emoji = reaction.emoji.name;
    const message = reaction.message;

    // Check if the emoji matches the expected emoji for the meal type
    if ((mealType === 'breakfast' && emoji === this.LATE_BREAKFAST_EMOJI) ||
        (mealType === 'dinner' && emoji === this.LATE_DINNER_EMOJI)) {
      logger.info(`User registered for late ${mealType}`, { userId: user.id, username: user.tag });
      // Add the user to the meal registration list
      const db = DatabaseService.getInstance();
      db.registerMeal(user.id, user.tag || 'Unknown', `late_${mealType}`, message.id.toString());
      await this.sendLateLogEmbed(user, 'add', mealType, message as Message);
    }
  }

  /**
   * Handles a reaction being removed from the late registration message
   * @param reaction The reaction that was removed
   * @param user The user who removed the reaction
   * @param mealType The type of meal (breakfast or dinner)
   */
  private async handleLateReactionRemove(
    reaction: MessageReaction | PartialMessageReaction,
    user: User | PartialUser,
    mealType: 'breakfast' | 'dinner'
  ): Promise<void> {
    const emoji = reaction.emoji.name;
    const message = reaction.message;

    // Check if the emoji matches the expected emoji for the meal type
    if ((mealType === 'breakfast' && emoji === this.LATE_BREAKFAST_EMOJI) ||
        (mealType === 'dinner' && emoji === this.LATE_DINNER_EMOJI)) {
      logger.info(`User unregistered from late ${mealType}`, { userId: user.id, username: user.tag });
      // Remove the user from the meal registration list
      const db = DatabaseService.getInstance();
      db.unregisterMeal(user.id, `late_${mealType}`, message.id.toString());
      await this.sendLateLogEmbed(user, 'remove', mealType, message as Message);
    }
  }

  /**
   * Creates a new late breakfast registration message
   */
  public async createLateBreakfastMessage(): Promise<void> {
    if (!this.client) {
      logger.error('Client not set');
      return;
    }

    try {
      // Get the channel - use error notification channel in development mode if flag is set
      const channelId = (config.isDevelopment && this.useErrorChannelForLateRegistration)
        ? config.logging.errorNotificationChannelId
        : this.lateRegistrationChannelId;

      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid late registration channel', { channelId });
        return;
      }

      logger.info('Creating late breakfast registration message', { channelId });

      // Get today's date for registration
      const now = new Date();
      const todayStr = formatInTimeZone(now, config.timezone.timezone, 'dd/MM/yyyy');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#FF9900')
        .setTitle('🍳 Đăng ký bữa sáng trễ')
        .setDescription(`Xin hãy đăng ký bữa sáng trễ cho ngày hôm nay (${todayStr}) bằng cách react vào tin nhắn này.`)
        .addFields(
          { name: 'Bữa sáng trễ', value: `React ${this.LATE_BREAKFAST_EMOJI} để đăng ký bữa sáng trễ`, inline: false },
          { name: 'Thời gian đăng ký', value: config.isDevelopment ? 'Chỉ 10 giây (chế độ development)' : 'Từ 5:00 sáng đến 11:00 sáng', inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn trễ' })
        .setTimestamp();

      // Send the message
      const message = await channel.send({ embeds: [embed] });

      // Add the reaction for users to click
      await message.react(this.LATE_BREAKFAST_EMOJI);

      // Store the current late breakfast registration message
      this.currentLateBreakfastMessage = message;

      logger.info('Late breakfast registration message created', { messageId: message.id, channelId: channel.id });

      // In development mode, end registration after 10 seconds
      if (config.isDevelopment) {
        logger.info('Development mode: Late breakfast registration will end in 10 seconds');
        setTimeout(async () => {
          logger.info('Development mode: Ending late breakfast registration now');
          await this.endLateBreakfastRegistration();
        }, 10000); // 10 seconds
      }
    } catch (error) {
      logger.error('Error creating late breakfast registration message', { error });
    }
  }

  /**
   * Creates a new late dinner registration message
   */
  public async createLateDinnerMessage(): Promise<void> {
    if (!this.client) {
      logger.error('Client not set');
      return;
    }

    try {
      // Get the channel - use error notification channel in development mode if flag is set
      const channelId = (config.isDevelopment && this.useErrorChannelForLateRegistration)
        ? config.logging.errorNotificationChannelId
        : this.lateRegistrationChannelId;

      const channel = await this.client.channels.fetch(channelId);

      if (!channel || !(channel instanceof TextChannel)) {
        logger.error('Invalid late registration channel', { channelId });
        return;
      }

      logger.info('Creating late dinner registration message', { channelId });

      // Get today's date for registration
      const now = new Date();
      const todayStr = formatInTimeZone(now, config.timezone.timezone, 'dd/MM/yyyy');

      // Create the embed
      const embed = new EmbedBuilder()
        .setColor('#FF9900')
        .setTitle('🍲 Đăng ký bữa tối trễ')
        .setDescription(`Xin hãy đăng ký bữa tối trễ cho ngày hôm nay (${todayStr}) bằng cách react vào tin nhắn này.`)
        .addFields(
          { name: 'Bữa tối trễ', value: `React ${this.LATE_DINNER_EMOJI} để đăng ký bữa tối trễ`, inline: false },
          { name: 'Thời gian đăng ký', value: config.isDevelopment ? 'Chỉ 10 giây (chế độ development)' : 'Từ 11:30 sáng đến 18:15 chiều', inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn trễ' })
        .setTimestamp();

      // Send the message
      const message = await channel.send({ embeds: [embed] });

      // Add the reaction for users to click
      await message.react(this.LATE_DINNER_EMOJI);

      // Store the current late dinner registration message
      this.currentLateDinnerMessage = message;

      logger.info('Late dinner registration message created', { messageId: message.id, channelId: channel.id });

      // In development mode, end registration after 10 seconds
      if (config.isDevelopment) {
        logger.info('Development mode: Late dinner registration will end in 10 seconds');
        setTimeout(async () => {
          logger.info('Development mode: Ending late dinner registration now');
          await this.endLateDinnerRegistration();
        }, 10000); // 10 seconds
      }
    } catch (error) {
      logger.error('Error creating late dinner registration message', { error });
    }
  }

  /**
   * Ends the current late breakfast registration period
   */
  public async endLateBreakfastRegistration(): Promise<void> {
    logger.info('Attempting to end late breakfast registration');

    if (!this.currentLateBreakfastMessage) {
      logger.info('No active late breakfast registration message to end');
      return;
    }

    try {
      // Get the message
      const message = this.currentLateBreakfastMessage;
      logger.info('Found active late breakfast registration message', { messageId: message.id });

      // Get all registered users from the database
      const db = DatabaseService.getInstance();
      const registeredUsers = db.getRegisteredUsers('late_breakfast', message.id.toString());

      // Format the list
      const registeredList = registeredUsers.length > 0
        ? registeredUsers.map(user => `<@${user.userId}> (${user.username})`).join('\n')
        : 'Không có ai';

      // Create the summary embed
      const summaryEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🍳 Kết quả đăng ký bữa sáng trễ')
        .setDescription('Đăng ký bữa sáng trễ đã kết thúc')
        .addFields(
          { name: `Đã đăng ký (${registeredUsers.length})`, value: registeredList.length > 1024 ? registeredList.substring(0, 1021) + '...' : registeredList, inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn trễ' })
        .setTimestamp();

      // Update the message
      await message.edit({ embeds: [summaryEmbed] });

      // Remove all reactions
      await message.reactions.removeAll();

      // Clear the database for this message
      db.clearRegistrations(message.id.toString());

      // Clear the current late breakfast registration message
      this.currentLateBreakfastMessage = null;

      logger.info('Late breakfast registration ended', {
        messageId: message.id,
        registeredCount: registeredUsers.length
      });
    } catch (error) {
      logger.error('Error ending late breakfast registration', { error });
    }
  }

  /**
   * Ends the current late dinner registration period
   */
  public async endLateDinnerRegistration(): Promise<void> {
    logger.info('Attempting to end late dinner registration');

    if (!this.currentLateDinnerMessage) {
      logger.info('No active late dinner registration message to end');
      return;
    }

    try {
      // Get the message
      const message = this.currentLateDinnerMessage;
      logger.info('Found active late dinner registration message', { messageId: message.id });

      // Get all registered users from the database
      const db = DatabaseService.getInstance();
      const registeredUsers = db.getRegisteredUsers('late_dinner', message.id.toString());

      // Format the list
      const registeredList = registeredUsers.length > 0
        ? registeredUsers.map(user => `<@${user.userId}> (${user.username})`).join('\n')
        : 'Không có ai';

      // Create the summary embed
      const summaryEmbed = new EmbedBuilder()
        .setColor('#FF0000')
        .setTitle('🍲 Kết quả đăng ký bữa tối trễ')
        .setDescription('Đăng ký bữa tối trễ đã kết thúc')
        .addFields(
          { name: `Đã đăng ký (${registeredUsers.length})`, value: registeredList.length > 1024 ? registeredList.substring(0, 1021) + '...' : registeredList, inline: false }
        )
        .setFooter({ text: 'Hệ thống đăng ký bữa ăn trễ' })
        .setTimestamp();

      // Update the message
      await message.edit({ embeds: [summaryEmbed] });

      // Remove all reactions
      await message.reactions.removeAll();

      // Clear the database for this message
      db.clearRegistrations(message.id.toString());

      // Clear the current late dinner registration message
      this.currentLateDinnerMessage = null;

      logger.info('Late dinner registration ended', {
        messageId: message.id,
        registeredCount: registeredUsers.length
      });
    } catch (error) {
      logger.error('Error ending late dinner registration', { error });
    }
  }

  /**
   * Stops the meal registration service
   */
  public stop(): void {
    // Stop all cron jobs
    if (this.createMessageJob) {
      this.createMessageJob.stop();
      logger.info('Create message job stopped');
    }

    if (this.endRegistrationJob) {
      this.endRegistrationJob.stop();
      logger.info('End registration job stopped');
    }

    if (this.createLateBreakfastJob) {
      this.createLateBreakfastJob.stop();
      logger.info('Create late breakfast job stopped');
    }

    if (this.endLateBreakfastJob) {
      this.endLateBreakfastJob.stop();
      logger.info('End late breakfast job stopped');
    }

    if (this.createLateDinnerJob) {
      this.createLateDinnerJob.stop();
      logger.info('Create late dinner job stopped');
    }

    if (this.endLateDinnerJob) {
      this.endLateDinnerJob.stop();
      logger.info('End late dinner job stopped');
    }

    logger.info('Meal registration service stopped');
  }
}
