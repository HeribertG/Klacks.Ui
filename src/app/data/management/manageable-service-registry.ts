import { Type } from '@angular/core';
import { IManageable } from './imanageable';

/**
 * Registry for managing IManageable service instances.
 * Services register themselves with route identifiers to enable
 * dynamic service resolution based on the current route.
 */
export class ManageableServiceRegistry {
  private static registry = new Map<string, Type<IManageable>>();

  /**
   * Registers a service with one or more route identifiers
   * @param routeId - The route identifier (e.g., 'client', 'edit-address')
   * @param serviceToken - The service class that implements IManageable
   */
  static register(routeId: string, serviceToken: Type<IManageable>): void {
    this.registry.set(routeId, serviceToken);
    console.log(`Registered ${serviceToken.name} for route: ${routeId}`);
  }

  /**
   * Retrieves a service token by route identifier
   * @param routeId - The route identifier
   * @returns The service token or undefined if not found
   */
  static get(routeId: string): Type<IManageable> | undefined {
    return this.registry.get(routeId);
  }

  /**
   * Checks if a route identifier is registered
   * @param routeId - The route identifier
   * @returns true if the route is registered
   */
  static has(routeId: string): boolean {
    return this.registry.has(routeId);
  }

  /**
   * Clears all registrations (useful for testing)
   */
  static clear(): void {
    this.registry.clear();
  }

  /**
   * Gets all registered route identifiers
   * @returns Array of registered route identifiers
   */
  static getRegisteredRoutes(): string[] {
    return Array.from(this.registry.keys());
  }
}