// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * Tells whether a stored group membership lies outside the groups the caller can see.
 * @param visibleGroupIds - Ids of the caller's full group tree, undefined while it has not been read yet
 * @param groupId - Group of the membership; an empty id is a new, still unselected row
 */
export function isOutsideVisibleGroups(
  visibleGroupIds: ReadonlySet<string> | undefined,
  groupId: string | undefined
): boolean {
  return !!visibleGroupIds && !!groupId && !visibleGroupIds.has(groupId);
}
