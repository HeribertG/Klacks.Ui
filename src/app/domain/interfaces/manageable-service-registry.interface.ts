import { Type, InjectionToken } from '@angular/core';
import { RouteName } from 'src/app/domain/enums/entity-names.enum';
import { ILoadable } from './manageable.interface';

export interface IManageableServiceRegistry {
  register(routeId: RouteName | string, serviceToken: Type<ILoadable>): void;
  get(routeId: RouteName | string): Type<ILoadable> | undefined;
  has(routeId: RouteName | string): boolean;
  clear(): void;
  getRegisteredRoutes(): string[];
}

export const MANAGEABLE_SERVICE_REGISTRY_TOKEN = new InjectionToken<IManageableServiceRegistry>('IManageableServiceRegistry');
