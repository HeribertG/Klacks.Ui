import { Type } from '@angular/core';
import { IManageable, ISpinnable } from './imanageable';
import { RouteName } from './entity-names.enum';
import { environment } from 'src/environments/environment';

/**
 * Registry for managing IManageable and ISpinnable service instances.
 * Services register themselves with route identifiers to enable
 * dynamic service resolution based on the current route.
 */
export class ManageableServiceRegistry {
  private static registry = new Map<string, Type<ISpinnable>>();

  /**
   * Registers a service with one or more route identifiers
   * @param routeId - The route identifier from RouteName enum
   * @param serviceToken - The service class that implements ISpinnable or IManageable
   */
  static register(routeId: RouteName | string, serviceToken: Type<ISpinnable>): void {
    this.registry.set(routeId, serviceToken);
    // Development only logging
    if (!environment.production) {
      console.log(`Registered ${serviceToken.name} for route: ${routeId}`);
    }
  }

  /**
   * Retrieves a service token by route identifier
   * @param routeId - The route identifier
   * @returns The service token or undefined if not found
   */
  static get(routeId: RouteName | string): Type<ISpinnable> | undefined {
    return this.registry.get(routeId);
  }

  /**
   * Checks if a route identifier is registered
   * @param routeId - The route identifier
   * @returns true if the route is registered
   */
  static has(routeId: RouteName | string): boolean {
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