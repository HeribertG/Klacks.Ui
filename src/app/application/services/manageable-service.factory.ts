import { inject, Injectable, Injector } from '@angular/core';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { MANAGEABLE_SERVICE_REGISTRY_TOKEN } from 'src/app/domain/interfaces/manageable-service-registry.interface';
import { RouteName } from 'src/app/domain/models/entity-names.enum';

@Injectable({ providedIn: 'root' })
export class ManageableServiceFactory {
  private injector = inject(Injector);
  private registry = inject(MANAGEABLE_SERVICE_REGISTRY_TOKEN);

  getService(routeId: RouteName | string): ILoadable | null {
    const serviceToken = this.registry.get(routeId);

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
    return this.registry.has(routeId);
  }
}
