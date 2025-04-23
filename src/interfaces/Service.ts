/**
 * Service Interface
 * 
 * This file defines the interface for services.
 */

/**
 * Service interface
 * Defines the basic structure of a service
 */
export interface Service {
  /**
   * Initializes the service
   */
  initialize?(): Promise<void>;

  /**
   * Shuts down the service
   */
  shutdown?(): Promise<void>;
}
