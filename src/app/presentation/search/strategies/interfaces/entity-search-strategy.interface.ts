// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityName } from 'src/app/domain/enums/entity-names.enum';

export interface IEntitySearchStrategy {
  search(value: string, options?: EntitySearchOptions): void;
  resetFilter(): void;
  getEntityName(): EntityName;
}

export interface EntitySearchOptions {
  includeAddress?: boolean;
  includeClient?: boolean;
  typeFilter?: string;
  [key: string]: any;
}
