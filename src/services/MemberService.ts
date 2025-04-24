/**
 * Member Service
 *
 * This service manages guild members and provides methods for fetching and storing them.
 */

import { Client, Guild, GuildMember } from 'discord.js';
import { LoggingService } from './LoggingService.js';
import { DatabaseService } from './DatabaseService.js';
import { config } from '../config/config.js';

// Get logger instance
const logger = LoggingService.getInstance();

/**
 * Member Service
 * Manages guild members
 */
export class MemberService {
  private static instance: MemberService;
  private client: Client | null = null;
  private trackedRoleId: string = '1162022091630059531'; // Role ID to track

  /**
   * Private constructor (Singleton pattern)
   */
  private constructor() {
    logger.info('MemberService initialized');
  }

  /**
   * Gets the singleton instance
   * @returns The singleton instance
   */
  public static getInstance(): MemberService {
    if (!MemberService.instance) {
      MemberService.instance = new MemberService();
    }
    return MemberService.instance;
  }

  /**
   * Sets the Discord client
   * @param client The Discord.js client
   */
  public setClient(client: Client): void {
    this.client = client;
  }

  /**
   * Fetches all members from the guild and stores them in the database
   * @returns The number of members stored
   */
  public async fetchAndStoreAllMembers(): Promise<number> {
    if (!this.client) {
      logger.error('Client not set, cannot fetch members');
      return 0;
    }

    try {
      // Get the guild
      const guild = await this.client.guilds.fetch(config.bot.guildId);
      if (!guild) {
        logger.error('Guild not found', { guildId: config.bot.guildId });
        return;
      }

      logger.info('Fetching all members from the guild', { guildId: guild.id });

      // Clear existing members from the database
      const db = DatabaseService.getInstance();
      db.clearGuildMembers();

      // Fetch all members (this might be slow for large guilds)
      try {
        await guild.members.fetch();
        logger.info('Successfully fetched all guild members');
      } catch (fetchError) {
        logger.warn('Could not fetch all members, using cached members instead', { error: fetchError });
      }

      // Store all members in the database
      let memberCount = 0;
      for (const [memberId, member] of guild.members.cache) {
        // Skip bots
        if (member.user.bot) continue;

        // Store the member
        this.storeMember(member);
        memberCount++;
      }

      logger.info(`Stored ${memberCount} members in the database`);
      return memberCount;
    } catch (error) {
      logger.error('Error fetching and storing members', { error });
      return 0;
    }
  }

  /**
   * Fetches members with a specific role and stores them in the database
   * @param roleId The role ID to filter by
   * @returns The number of members stored
   */
  public async fetchAndStoreRoleMembers(roleId: string): Promise<number> {
    if (!this.client) {
      logger.error('Client not set, cannot fetch members');
      return 0;
    }

    try {
      // Get the guild
      const guild = await this.client.guilds.fetch(config.bot.guildId);
      if (!guild) {
        logger.error('Guild not found', { guildId: config.bot.guildId });
        return;
      }

      logger.info(`Fetching members with role ID ${roleId} from the guild`, { guildId: guild.id });

      // Fetch all members (this might be slow for large guilds)
      try {
        await guild.members.fetch();
        logger.info('Successfully fetched all guild members');
      } catch (fetchError) {
        logger.warn('Could not fetch all members, using cached members instead', { error: fetchError });
      }

      // Get the role
      const role = guild.roles.cache.get(roleId);
      if (!role) {
        logger.error('Role not found', { roleId });
        return;
      }

      // Store members with the role in the database
      let memberCount = 0;
      for (const [memberId, member] of role.members) {
        // Skip bots
        if (member.user.bot) continue;

        // Store the member
        this.storeMember(member);
        memberCount++;
      }

      logger.info(`Stored ${memberCount} members with role ${role.name} in the database`);
      return memberCount;
    } catch (error) {
      logger.error('Error fetching and storing role members', { error, roleId });
      return 0;
    }
  }

  /**
   * Stores a guild member in the database
   * @param member The guild member to store
   */
  private storeMember(member: GuildMember): void {
    try {
      // Get the database service
      const db = DatabaseService.getInstance();

      // Get the member's roles as a comma-separated string
      const roles = Array.from(member.roles.cache.keys()).join(',');

      // Store the member in the database
      db.storeGuildMember(
        member.id,
        member.user.tag,
        member.nickname,
        roles,
        member.joinedAt
      );
    } catch (error) {
      logger.error('Error storing member', { error, memberId: member.id });
    }
  }

  /**
   * Gets all members from the database
   * @returns The list of members
   */
  public getAllMembers(): { userId: string, username: string, nickname: string | null, roles: string[], joinedAt: Date | null }[] {
    const db = DatabaseService.getInstance();
    return db.getAllGuildMembers();
  }

  /**
   * Gets members with a specific role from the database
   * @param roleId The role ID to filter by
   * @returns The list of members with the role
   */
  public getMembersByRole(roleId: string): { userId: string, username: string, nickname: string | null }[] {
    const db = DatabaseService.getInstance();
    return db.getGuildMembersByRole(roleId);
  }

  /**
   * Gets members with the tracked role from the database
   * @returns The list of members with the tracked role
   */
  public getTrackedMembers(): { userId: string, username: string, nickname: string | null }[] {
    return this.getMembersByRole(this.trackedRoleId);
  }
}
