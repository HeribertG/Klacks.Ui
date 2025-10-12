import { inject, Injectable, Injector } from '@angular/core';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { ManageableServiceRegistry } from './manageable-service-registry';
import { RouteName } from 'src/app/domain/models/entity-names.enum';

@Injectable({ providedIn: 'root' })
export class ManageableServiceFactory {
  private injector = inject(Injector);

  getService(routeId: RouteName | string): ILoadable | null {
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
