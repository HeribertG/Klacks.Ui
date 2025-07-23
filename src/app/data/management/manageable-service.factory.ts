import { Injectable, Injector } from '@angular/core';
import { IManageable } from './imanageable';
import { ManageableServiceRegistry } from './manageable-service-registry';

/**
 * Factory service for creating IManageable service instances based on route identifiers.
 * This factory uses the ManageableServiceRegistry to resolve the appropriate service
 * and the Angular Injector to instantiate it.
 */
@Injectable({ providedIn: 'root' })
export class ManageableServiceFactory {
  constructor(private injector: Injector) {}

  /**
   * Gets an instance of an IManageable service based on the route identifier
   * @param routeId - The route identifier (e.g., 'client', 'edit-address')
   * @returns The service instance or null if not found
   */
  getService(routeId: string): IManageable | null {
    const serviceToken = ManageableServiceRegistry.get(routeId);
    
    if (serviceToken) {
      try {
        // Use Angular's Injector to get the service instance
        const service = this.injector.get(serviceToken);
        console.log(`Retrieved service ${serviceToken.name} for route: ${routeId}`);
        return service;
      } catch (error) {
        console.error(`Error retrieving service for route ${routeId}:`, error);
        return null;
      }
    }
    
    console.warn(`No service registered for route: ${routeId}`);
    return null;
  }

  /**
   * Checks if a service is available for a given route
   * @param routeId - The route identifier
   * @returns true if a service is registered for this route
   */
  hasService(routeId: string): boolean {
    return ManageableServiceRegistry.has(routeId);
  }
}