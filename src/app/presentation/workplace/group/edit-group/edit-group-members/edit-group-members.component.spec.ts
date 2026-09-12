// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { TranslateModule } from '@ngx-translate/core';
import { EditGroupMembersComponent } from './edit-group-members.component';
import { DataManagementGroupService } from 'src/app/domain/services/group/data-management-group.service';
import { GroupSelectionService } from 'src/app/domain/services/group/group-selection.service';
import { DataClientService } from 'src/app/infrastructure/api/client/data-client.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ToastShowService } from 'src/app/presentation/toast/toast-show.service';
import { PERMISSIONS } from 'src/app/domain/constants/permissions.constants';
import { IClient } from 'src/app/domain/models/client/client-class';
import { IGroupItem } from 'src/app/domain/models/group/group-class';

describe('EditGroupMembersComponent - permission gating', () => {
  let fixture: ComponentFixture<EditGroupMembersComponent>;
  let component: EditGroupMembersComponent;
  let held: Set<string>;
  let dataManagementGroupService: { editGroup: { groupItems: IGroupItem[] }; add: ReturnType<typeof vi.fn> };

  const client: IClient = { id: 'client-1' } as IClient;
  const groupItem: IGroupItem = { clientId: 'client-2' } as IGroupItem;

  const authorizationServiceStub = {
    hasPermission: (permission: string) => held.has(permission),
    hasAnyPermission: (...permissions: string[]) => permissions.some((p) => held.has(p)),
  };

  beforeEach(async () => {
    held = new Set<string>();
    dataManagementGroupService = {
      editGroup: { groupItems: [groupItem] },
      add: vi.fn(),
    };

    await TestBed.configureTestingModule({
      imports: [EditGroupMembersComponent, TranslateModule.forRoot()],
      providers: [
        { provide: DataManagementGroupService, useValue: dataManagementGroupService },
        { provide: GroupSelectionService, useValue: {} },
        { provide: DataClientService, useValue: { readClientList: () => of({ clients: [] }) } },
        { provide: AuthorizationService, useValue: authorizationServiceStub },
        { provide: ToastShowService, useValue: { showInfo: vi.fn() } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EditGroupMembersComponent);
    component = fixture.componentInstance;
    component.selectedClient = client;
  });

  it('ignores a click from a planer without CanEditGroups', () => {
    component.onClickApply();

    expect(dataManagementGroupService.add).not.toHaveBeenCalled();
  });

  it('ignores an Enter keypress from a planer without CanEditGroups', () => {
    const event = new KeyboardEvent('keydown', { key: 'Enter' });

    component.onKeydownEnterSearchField(event);

    expect(dataManagementGroupService.add).not.toHaveBeenCalled();
  });

  it('lets a supervisor with CanEditGroups add the selected client on click', () => {
    held.add(PERMISSIONS.CanEditGroups);

    component.onClickApply();

    expect(dataManagementGroupService.add).toHaveBeenCalledWith(client);
  });

  it('ignores a delete from a planer without CanEditGroups', () => {
    component.onDeleteClient(groupItem);

    expect(dataManagementGroupService.editGroup.groupItems).toEqual([groupItem]);
  });

  it('lets a supervisor with CanEditGroups remove a member', () => {
    held.add(PERMISSIONS.CanEditGroups);

    component.onDeleteClient(groupItem);

    expect(dataManagementGroupService.editGroup.groupItems).toEqual([]);
  });
});
