// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Helpers for the group tree. flattenGroupTree flattens it depth-first: every group is followed by its descendants.
 * groupHierarchyIds is the one rule of the Ui for "a group and its subgroups", a walk along the parent ids like
 * ScenarioGroupScopeReader on the server; the group itself always counts, also when the list does not hold it.
 * @param groups - Root nodes of the tree; children are read from `children`
 * @param nodes - Flat list of groups
 * @param groupId - Group whose hierarchy is wanted
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

export function groupHierarchyIds(nodes: readonly IGroup[], groupId: string): string[] {
  const hierarchy = [groupId];

  for (const parentId of hierarchy) {
    nodes.forEach((node) => {
      if (node.id && node.parent === parentId && !hierarchy.includes(node.id)) {
        hierarchy.push(node.id);
      }
    });
  }

  return hierarchy;
}
