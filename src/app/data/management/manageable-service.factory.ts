import { Injectable, Injector } from '@angular/core';
import { ISpinnable } from './imanageable';
import { ManageableServiceRegistry } from './manageable-service-registry';
import { RouteName } from './entity-names.enum';

/**
 * Factory service for creating ISpinnable/IManageable service instances based on route identifiers.
 * This factory uses the ManageableServiceRegistry to resolve the appropriate service
 * and the Angular Injector to instantiate it.
 */
@Injectable({ providedIn: 'root' })
export class ManageableServiceFactory {
  constructor(private injector: Injector) {}

  getService(routeId: RouteName | string): ISpinnable | null {
    const serviceToken = ManageableServiceRegistry.get(routeId);

    if (serviceToken) {
      try {
        return this.injector.get(serviceToken);
      } catch (error) {
        console.error(`Error retrieving service for route ${routeId}:`, error);
        return null;
      }
    }
    return null;
  }

  hasService(routeId: RouteName | string): boolean {
    return ManageableServiceRegistry.has(routeId);
  }
}
