// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Flattens a group tree depth-first: every group is followed by its descendants.
 * @param groups - Root nodes of the tree; children are read from `children`
 */
import { IGroup } from 'src/app/domain/models/group/group.interface';

export function flattenGroupTree(groups: IGroup[]): IGroup[] {
  const result: IGroup[] = [];
  for (const group of groups) {
    result.push(group);
    if (group.children && group.children.length > 0) {
      result.push(...flattenGroupTree(group.children));
    }
  }
  return result;
}
