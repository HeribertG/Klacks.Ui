// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { Signal, InjectionToken } from '@angular/core';
import { EntityName } from '../enums/entity-names.enum';

export interface IEntityStateProvider {
  nameOfVisibleEntity: Signal<EntityName | string>;
}

export const ENTITY_STATE_PROVIDER_TOKEN = new InjectionToken<IEntityStateProvider>('IEntityStateProvider');
