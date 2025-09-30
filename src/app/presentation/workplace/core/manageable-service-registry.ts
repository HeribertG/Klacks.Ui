import { Type } from '@angular/core';
import { RouteName } from 'src/app/domain/models/entity-names.enum';
import { ILoadable } from './interfaces/common.interfaces';

export class ManageableServiceRegistry {
  private static registry = new Map<string, Type<ILoadable>>();

  static register(
    routeId: RouteName | string,
    serviceToken: Type<ILoadable>
  ): void {
    this.registry.set(routeId, serviceToken);
  }

  static get(routeId: RouteName | string): Type<ILoadable> | undefined {
    return this.registry.get(routeId);
  }

  static has(routeId: RouteName | string): boolean {
    return this.registry.has(routeId);
  }

  static clear(): void {
    this.registry.clear();
  }

  static getRegisteredRoutes(): string[] {
    return Array.from(this.registry.keys());
  }
}
