import { Signal } from '@angular/core';
import { EntityName } from '../models/entity-names.enum';

export interface IEntityStateProvider {
  nameOfVisibleEntity: Signal<EntityName | string>;
}
