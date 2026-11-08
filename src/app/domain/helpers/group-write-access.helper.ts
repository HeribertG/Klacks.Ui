// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

/**
 * The one Ui rule for who may write which part of a group (owner decision 2026-11-08). The Admin (CanEditGroups,
 * CanCreateGroups) writes everything. The supervisor (CanEditSubgroups) adds subgroups under the groups of the tree,
 * which holds only visible groups, and edits name, description, validity and members of a group that has a parent;
 * root groups, moving, copying, location, payment interval and holiday calendar stay with the Admin. The Groups Post
 * and Put handlers enforce the same boundary on the server.
 * @param rights - Answers whether the signed-in user holds a permission (admins hold all)
 * @param group - The group being shown or edited; a new subgroup carries its parent id and no id yet
 */
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IPermissionChecker } from 'src/app/domain/interfaces/permission-checker.interface';
import { IGroup } from 'src/app/domain/models/group/group.interface';

type GroupWriteRights = Pick<IPermissionChecker, 'hasPermission'>;

export function canAddSubgroup(rights: GroupWriteRights): boolean {
  return rights.hasPermission(PERMISSIONS.CanCreateGroups) || rights.hasPermission(PERMISSIONS.CanEditSubgroups);
}

export function canEditGroupDetails(rights: GroupWriteRights, group: Pick<IGroup, 'parent'> | undefined): boolean {
  if (rights.hasPermission(PERMISSIONS.CanEditGroups)) {
    return true;
  }

  return !!group?.parent && rights.hasPermission(PERMISSIONS.CanEditSubgroups);
}
