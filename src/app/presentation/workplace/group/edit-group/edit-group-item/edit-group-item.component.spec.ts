// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EditGroupItemComponent } from './edit-group-item.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IGroup } from 'src/app/domain/models/group/group.interface';

describe('EditGroupItemComponent - group form disabled state', () => {
  let held: Set<string>;

  const createComponent = (editGroup?: Partial<IGroup>): EditGroupItemComponent => {
    TestBed.configureTestingModule({
      imports: [EditGroupItemComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGroupService, useValue: { availableCalendars: [], editGroup } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
      ],
    });

    return TestBed.createComponent(EditGroupItemComponent).componentInstance;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('disables the group item form for a planer without CanEditGroups', () => {
    const component = createComponent();

    expect(component.groupForm().disabled()).toBe(true);
  });

  it('enables the group item form for an admin with CanEditGroups', () => {
    held.add(PERMISSIONS.CanEditGroups);
    const component = createComponent();

    expect(component.groupForm().disabled()).toBe(false);
  });

  it('enables the group item form for a supervisor with CanEditSubgroups on a subgroup', () => {
    held.add(PERMISSIONS.CanEditSubgroups);
    const component = createComponent({ id: 'sub', parent: 'root' });

    expect(component.groupForm().disabled()).toBe(false);
    expect(component.canEditDetails()).toBe(true);
  });

  it('disables the group item form for a supervisor with CanEditSubgroups on a root group', () => {
    held.add(PERMISSIONS.CanEditSubgroups);
    const component = createComponent({ id: 'root' });

    expect(component.groupForm().disabled()).toBe(true);
    expect(component.canEditDetails()).toBe(false);
  });
});
