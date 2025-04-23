/**
 * Service Factory
 *
 * This file implements the Factory pattern for service creation.
 * It provides a centralized way to create and manage services.
 */

import { LoggingService } from './LoggingService.js';
import { MessageService } from './MessageService.js';
import { ReactionCollectorService } from './ReactionCollectorService.js';

// Define service types
export type ServiceType = 'logging' | 'message' | 'reactionCollector';

/**
 * Service Factory class
 * Implements the Factory pattern for service creation
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  private services: Map<ServiceType, unknown> = new Map();

  private constructor() {
    // Initialize services
    this.services.set('logging', LoggingService.getInstance());
  }

  public static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }

  /**
   * Gets a service instance
   * @param type The type of service to get
   * @returns The service instance
   */
  public getService<T>(type: ServiceType): T {
    // Check if service exists
    if (!this.services.has(type)) {
      // Create service if it doesn't exist
      this.createService(type);
    }

    // Return service
    return this.services.get(type) as T;
  }

  /**
   * Creates a service instance
   * @param type The type of service to create
   */
  private createService(type: ServiceType): void {
    const logger = LoggingService.getInstance();

    switch (type) {
      case 'logging':
        this.services.set(type, LoggingService.getInstance());
        break;
      case 'message':
        logger.info('Creating MessageService');
        this.services.set(type, new MessageService());
        break;
      case 'reactionCollector':
        logger.info('Creating ReactionCollectorService');
        this.services.set(type, new ReactionCollectorService());
        break;
      default:
        throw new Error(`Unknown service type: ${type}`);
    }
  }
}
