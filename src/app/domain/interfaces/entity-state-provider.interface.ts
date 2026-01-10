import { Signal, InjectionToken } from '@angular/core';
import { EntityName } from '../enums/entity-names.enum';

export interface IEntityStateProvider {
  nameOfVisibleEntity: Signal<EntityName | string>;
}

export const ENTITY_STATE_PROVIDER_TOKEN = new InjectionToken<IEntityStateProvider>('IEntityStateProvider');
