import { Client, Guild, GuildMember, Role, Collection, Snowflake } from 'discord.js';
import { logger } from './logger';
import config from '../config';

// Cache for role members to avoid repeated API calls
interface RoleMemberCache {
  [roleId: string]: {
    members: Collection<Snowflake, GuildMember>;
    lastUpdated: number;
  };
}

// Cache expiration time in milliseconds (10 minutes)
const CACHE_EXPIRATION = 10 * 60 * 1000;

// Role member cache
const roleMemberCache: RoleMemberCache = {};

/**
 * Get the guild from the client
 * @param client Discord client
 * @returns The guild or null if not found
 */
export function getGuild(client: Client): Guild | null {
  const guild = client.guilds.cache.get(config.env.GUILD_ID);
  if (!guild) {
    logger.warn(`Guild with ID ${config.env.GUILD_ID} not found`);
    return null;
  }
  return guild;
}

/**
 * Get a role by ID
 * @param guild The guild to get the role from
 * @param roleId The role ID to get
 * @returns The role or null if not found
 */
export function getRole(guild: Guild, roleId: string): Role | null {
  const role = guild.roles.cache.get(roleId);
  if (!role) {
    logger.warn(`Role with ID ${roleId} not found in guild ${guild.name}`);
    return null;
  }
  return role;
}

/**
 * Check if the cache for a role is valid
 * @param roleId The role ID to check
 * @returns True if the cache is valid, false otherwise
 */
function isCacheValid(roleId: string): boolean {
  if (!roleMemberCache[roleId]) {
    return false;
  }

  const now = Date.now();
  return now - roleMemberCache[roleId].lastUpdated < CACHE_EXPIRATION;
}

/**
 * Fetch all members with a specific role
 * @param client Discord client
 * @param roleId The role ID to fetch members for
 * @param forceRefresh Force a refresh of the cache
 * @returns A collection of members with the role, or null if the role or guild is not found
 */
export async function getMembersWithRole(
  client: Client,
  roleId: string = config.env.TRACKED_ROLE_ID,
  forceRefresh: boolean = false
): Promise<Collection<Snowflake, GuildMember> | null> {
  // Check cache first if not forcing refresh
  if (!forceRefresh && isCacheValid(roleId)) {
    logger.debug(`Using cached members for role ${roleId}`);
    return roleMemberCache[roleId].members;
  }

  const guild = getGuild(client);
  if (!guild) {
    return null;
  }

  const role = getRole(guild, roleId);
  if (!role) {
    return null;
  }

  try {
    // Ensure all members are fetched
    await guild.members.fetch();
    
    // Get members with the role
    const members = guild.members.cache.filter(member => member.roles.cache.has(roleId));
    
    // Update cache
    roleMemberCache[roleId] = {
      members,
      lastUpdated: Date.now()
    };
    
    logger.info(`Fetched ${members.size} members with role ${role.name} (${roleId})`);
    return members;
  } catch (error) {
    logger.error(`Failed to fetch members with role ${roleId}:`, error instanceof Error ? error : new Error('Unknown error'));
    return null;
  }
}

/**
 * Check if a user has a specific role
 * @param client Discord client
 * @param userId The user ID to check
 * @param roleId The role ID to check for
 * @returns True if the user has the role, false otherwise
 */
export async function hasRole(
  client: Client,
  userId: string,
  roleId: string = config.env.TRACKED_ROLE_ID
): Promise<boolean> {
  const guild = getGuild(client);
  if (!guild) {
    return false;
  }

  try {
    // Try to get from cache first
    if (isCacheValid(roleId)) {
      const cachedMembers = roleMemberCache[roleId].members;
      if (cachedMembers.has(userId)) {
        return true;
      }
    }

    // If not in cache or cache is invalid, fetch the member
    const member = await guild.members.fetch(userId);
    return member ? member.roles.cache.has(roleId) : false;
  } catch (error) {
    // If member fetch fails, the user might not be in the guild
    logger.debug(`Failed to check role for user ${userId}:`, error instanceof Error ? error : new Error('Unknown error'));
    return false;
  }
}

/**
 * Filter a list of user IDs to only those with a specific role
 * @param client Discord client
 * @param userIds Array of user IDs to filter
 * @param roleId The role ID to filter by
 * @returns Array of user IDs that have the role
 */
export async function filterUsersByRole(
  client: Client,
  userIds: string[],
  roleId: string = config.env.TRACKED_ROLE_ID
): Promise<string[]> {
  const guild = getGuild(client);
  if (!guild) {
    return [];
  }

  // Get members with the role (from cache if possible)
  const membersWithRole = await getMembersWithRole(client, roleId);
  if (!membersWithRole) {
    return [];
  }

  // Filter user IDs to only those in the members collection
  return userIds.filter(userId => membersWithRole.has(userId));
}

/**
 * Invalidate the role member cache for a specific role
 * @param roleId The role ID to invalidate the cache for, or 'all' to invalidate all caches
 */
export function invalidateRoleCache(roleId: string | 'all'): void {
  if (roleId === 'all') {
    Object.keys(roleMemberCache).forEach(key => {
      delete roleMemberCache[key];
    });
    logger.debug('Invalidated all role member caches');
  } else if (roleMemberCache[roleId]) {
    delete roleMemberCache[roleId];
    logger.debug(`Invalidated role member cache for role ${roleId}`);
  }
}

/**
 * Get the tracked role ID from config
 * @returns The tracked role ID
 */
export function getTrackedRoleId(): string {
  return config.env.TRACKED_ROLE_ID;
}
