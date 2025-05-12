import { Client, Events } from 'discord.js';
import { logger } from '../utils/logger';
import { invalidateRoleCache, getTrackedRoleId } from '../utils/roleUtils';

/**
 * Event handler for role-related events
 * @param client The Discord client
 */
export default (client: Client): void => {
  // Handle guild member update event (role changes)
  client.on(Events.GuildMemberUpdate, (oldMember, newMember) => {
    // Check if roles have changed
    if (!oldMember.roles.cache.equals(newMember.roles.cache)) {
      const trackedRoleId = getTrackedRoleId();
      
      // Check if the tracked role was added or removed
      const hadTrackedRole = oldMember.roles.cache.has(trackedRoleId);
      const hasTrackedRole = newMember.roles.cache.has(trackedRoleId);
      
      if (hadTrackedRole !== hasTrackedRole) {
        logger.info(`User ${newMember.user.tag} (${newMember.id}) ${hasTrackedRole ? 'gained' : 'lost'} the tracked role`);
        
        // Invalidate the role cache for the tracked role
        invalidateRoleCache(trackedRoleId);
      }
    }
  });
  
  // Handle guild member add event (new member joins)
  client.on(Events.GuildMemberAdd, (member) => {
    logger.info(`New member joined: ${member.user.tag} (${member.id})`);
    
    // Invalidate all role caches when a new member joins
    invalidateRoleCache('all');
  });
  
  // Handle guild member remove event (member leaves or is kicked)
  client.on(Events.GuildMemberRemove, (member) => {
    logger.info(`Member left: ${member.user.tag} (${member.id})`);
    
    // Invalidate all role caches when a member leaves
    invalidateRoleCache('all');
  });
  
  // Handle role create event
  client.on(Events.GuildRoleCreate, (role) => {
    logger.info(`New role created: ${role.name} (${role.id})`);
    
    // No need to invalidate cache for a new role as no members have it yet
  });
  
  // Handle role delete event
  client.on(Events.GuildRoleDelete, (role) => {
    logger.info(`Role deleted: ${role.name} (${role.id})`);
    
    // Invalidate the cache for the deleted role
    invalidateRoleCache(role.id);
    
    // If the deleted role is the tracked role, log a warning
    if (role.id === getTrackedRoleId()) {
      logger.warn(`The tracked role (${role.id}) has been deleted!`);
    }
  });
  
  // Handle role update event
  client.on(Events.GuildRoleUpdate, (oldRole, newRole) => {
    logger.info(`Role updated: ${newRole.name} (${newRole.id})`);
    
    // No need to invalidate cache as role updates don't affect membership
  });
};
