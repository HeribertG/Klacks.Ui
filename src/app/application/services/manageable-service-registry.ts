// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Injectable, Type } from '@angular/core';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { ILoadable } from 'src/app/domain/interfaces/manageable.interface';
import { IManageableServiceRegistry } from 'src/app/domain/interfaces/manageable-service-registry.interface';

@Injectable({
  providedIn: 'root'
})
export class ManageableServiceRegistry implements IManageableServiceRegistry {
  private registry = new Map<string, Type<ILoadable>>();

  register(
    routeId: RouteName | string,
    serviceToken: Type<ILoadable>
  ): void {
    this.registry.set(routeId, serviceToken);
  }

  get(routeId: RouteName | string): Type<ILoadable> | undefined {
    return this.registry.get(routeId);
  }

  has(routeId: RouteName | string): boolean {
    return this.registry.has(routeId);
  }

  clear(): void {
    this.registry.clear();
  }

  getRegisteredRoutes(): string[] {
    return Array.from(this.registry.keys());
  }
}
