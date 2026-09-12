// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EditGroupItemComponent } from './edit-group-item.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';

describe('EditGroupItemComponent - group form disabled state', () => {
  let held: Set<string>;

  const createComponent = (): EditGroupItemComponent => {
    TestBed.configureTestingModule({
      imports: [EditGroupItemComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGroupService, useValue: { availableCalendars: [] } },
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

  it('enables the group item form for a supervisor with CanEditGroups', () => {
    held.add(PERMISSIONS.CanEditGroups);
    const component = createComponent();

    expect(component.groupForm().disabled()).toBe(false);
  });
});
