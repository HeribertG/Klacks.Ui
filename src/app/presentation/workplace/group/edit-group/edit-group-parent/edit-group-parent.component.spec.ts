// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { TranslateModule } from '@ngx-translate/core';
import { EditGroupParentComponent } from './edit-group-parent.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';

describe('EditGroupParentComponent - parent selection form disabled state', () => {
  let held: Set<string>;

  const createComponent = (): EditGroupParentComponent => {
    TestBed.configureTestingModule({
      imports: [EditGroupParentComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGroupService, useValue: { flatNodeList: [] } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
      ],
    });

    return TestBed.createComponent(EditGroupParentComponent).componentInstance;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('disables the parent selector for a planer without CanEditGroups', () => {
    const component = createComponent();

    expect(component.parentSelectForm().disabled()).toBe(true);
  });

  it('enables the parent selector for a supervisor with CanEditGroups', () => {
    held.add(PERMISSIONS.CanEditGroups);
    const component = createComponent();

    expect(component.parentSelectForm().disabled()).toBe(false);
  });
});
