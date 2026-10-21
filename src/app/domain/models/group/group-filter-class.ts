// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Filter state for the group list (date ranges, scope flags, deleted entries) with a default-state check.
 */

import { BaseFilter } from '../base-filter-class';
import { IGroupFilter } from './group-filter.interface';

export class GroupFilter extends BaseFilter implements IGroupFilter {
  scopeFromFlag?: boolean;
  scopeUntilFlag?: boolean;
  scopeFrom?: Date;
  scopeUntil?: Date;
  showDeleteEntries = false;
  activeDateRange = true;
  formerDateRange = false;
  futureDateRange = false;

  override orderBy = 'name';
  override sortOrder = 'asc';

  selectedGroup: string | undefined = undefined;

  isDefault(): boolean {
    return (
      this.activeDateRange &&
      !this.formerDateRange &&
      !this.futureDateRange &&
      !this.showDeleteEntries &&
      this.scopeFromFlag === undefined &&
      this.scopeUntilFlag === undefined &&
      this.scopeFrom === undefined &&
      this.scopeUntil === undefined
    );
  }
}
