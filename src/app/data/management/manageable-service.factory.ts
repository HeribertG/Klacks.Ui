import { Injectable, Injector } from '@angular/core';
import { IManageable, ISpinnable } from './imanageable';
import { ManageableServiceRegistry } from './manageable-service-registry';
import { RouteName } from './entity-names.enum';
import { environment } from 'src/environments/environment';

/**
 * Factory service for creating ISpinnable/IManageable service instances based on route identifiers.
 * This factory uses the ManageableServiceRegistry to resolve the appropriate service
 * and the Angular Injector to instantiate it.
 */
@Injectable({ providedIn: 'root' })
export class ManageableServiceFactory {
  constructor(private injector: Injector) {}

  /**
   * Gets an instance of an ISpinnable service based on the route identifier
   * @param routeId - The route identifier
   * @returns The service instance or null if not found
   */
  getService(routeId: RouteName | string): ISpinnable | null {
    const serviceToken = ManageableServiceRegistry.get(routeId);
    
    if (serviceToken) {
      try {
        // Use Angular's Injector to get the service instance
        const service = this.injector.get(serviceToken);
        if (!environment.production) {
          console.log(`Retrieved service ${serviceToken.name} for route: ${routeId}`);
        }
        return service;
      } catch (error) {
        console.error(`Error retrieving service for route ${routeId}:`, error);
        return null;
      }
    }
    
    if (!environment.production) {
      console.warn(`No service registered for route: ${routeId}`);
    }
    return null;
  }

  /**
   * Checks if a service is available for a given route
   * @param routeId - The route identifier
   * @returns true if a service is registered for this route
   */
  hasService(routeId: RouteName | string): boolean {
    return ManageableServiceRegistry.has(routeId);
  }
}