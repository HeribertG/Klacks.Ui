// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { EntitySearchOptions } from './entity-search-options.interface';
import { EntityName } from 'src/app/domain/enums/entity-names.enum';

export interface IEntitySearchStrategy {
  search(value: string, options?: EntitySearchOptions): void;
  resetFilter(): void;
  getEntityName(): EntityName;
}
