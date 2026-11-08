// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IGroup } from 'src/app/domain/models/group/group.interface';
import { canAddSubgroup, canEditGroupDetails } from './group-write-access.helper';

const holding = (...held: string[]) => ({ hasPermission: (permission: string) => held.includes(permission) });

const admin = holding(PERMISSIONS.CanCreateGroups, PERMISSIONS.CanEditGroups, PERMISSIONS.CanEditSubgroups);
const supervisor = holding(PERMISSIONS.CanViewGroups, PERMISSIONS.CanEditSubgroups);
const planner = holding(PERMISSIONS.CanViewGroups);

const root = { id: 'root', name: 'Root' } as IGroup;
const subgroup = { id: 'sub', name: 'Event', parent: 'root' } as IGroup;
const newSubgroup = { name: '', parent: 'root' } as IGroup;
const newRoot = { name: '' } as IGroup;

describe('canAddSubgroup', () => {
  it('lets the admin and the supervisor add subgroups, but not the planner', () => {
    expect(canAddSubgroup(admin)).toBe(true);
    expect(canAddSubgroup(supervisor)).toBe(true);
    expect(canAddSubgroup(planner)).toBe(false);
  });
});

describe('canEditGroupDetails', () => {
  it('lets the admin edit every group, root groups and new root groups included', () => {
    expect(canEditGroupDetails(admin, root)).toBe(true);
    expect(canEditGroupDetails(admin, subgroup)).toBe(true);
    expect(canEditGroupDetails(admin, newRoot)).toBe(true);
  });

  it('lets the supervisor edit a subgroup and a new subgroup, but neither a root group nor a new root group', () => {
    expect(canEditGroupDetails(supervisor, subgroup)).toBe(true);
    expect(canEditGroupDetails(supervisor, newSubgroup)).toBe(true);
    expect(canEditGroupDetails(supervisor, root)).toBe(false);
    expect(canEditGroupDetails(supervisor, newRoot)).toBe(false);
  });

  it('lets the planner edit no group and answers false for a missing group', () => {
    expect(canEditGroupDetails(planner, subgroup)).toBe(false);
    expect(canEditGroupDetails(supervisor, undefined)).toBe(false);
  });
});
