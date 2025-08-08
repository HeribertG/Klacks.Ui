import { Type } from '@angular/core';
import { RouteName } from '../../data/management/entity-names.enum';
import { ISpinnable } from './interfaces/manageable.interface';

export class ManageableServiceRegistry {
  private static registry = new Map<string, Type<ISpinnable>>();

  static register(
    routeId: RouteName | string,
    serviceToken: Type<ISpinnable>
  ): void {
    this.registry.set(routeId, serviceToken);
  }

  static get(routeId: RouteName | string): Type<ISpinnable> | undefined {
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
