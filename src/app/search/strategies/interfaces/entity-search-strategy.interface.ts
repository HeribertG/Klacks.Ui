/* eslint-disable @typescript-eslint/no-explicit-any */
import { EntityName } from 'src/app/models/entity-names.enum';

export interface IEntitySearchStrategy {
  search(value: string, options?: EntitySearchOptions): void;
  resetFilter(): void;
  getEntityName(): EntityName;
}

export interface EntitySearchOptions {
  includeAddress?: boolean;
  includeClient?: boolean;
  [key: string]: any;
}
