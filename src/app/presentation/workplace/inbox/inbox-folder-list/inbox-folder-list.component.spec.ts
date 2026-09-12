// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { InboxFolderListComponent } from './inbox-folder-list.component';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { ModalService } from 'src/app/presentation/modal/modal.service';
import { TranslateService } from '@ngx-translate/core';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';

describe('InboxFolderListComponent - isAdmin', () => {
  let held: Set<string>;
  let modalService: { resultEvent: unknown; openModel: ReturnType<typeof vi.fn>; openModal: ReturnType<typeof vi.fn> };

  const createComponent = (): InboxFolderListComponent => {
    modalService = { resultEvent: of(null), openModel: vi.fn(), openModal: vi.fn() };

    TestBed.configureTestingModule({
      imports: [InboxFolderListComponent],
      providers: [
        { provide: InboxService, useValue: { selectedFolder: () => undefined, selectedGroupId: () => undefined, selectedClientId: () => undefined } },
        {
          provide: AuthorizationService,
          useValue: { hasPermission: (permission: string) => held.has(permission) },
        },
        { provide: ModalService, useValue: modalService },
        { provide: TranslateService, useValue: { instant: (key: string) => key } },
      ],
    });

    return TestBed.createComponent(InboxFolderListComponent).componentInstance;
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('reports a planer or a supervisor without the admin role as not admin', () => {
    expect(createComponent().isAdmin).toBe(false);
  });

  it('reports an admin as admin, enabling the folder-management actions', () => {
    held.add(ROLE_ADMIN);

    expect(createComponent().isAdmin).toBe(true);
  });

  it('refuses to open the create-folder prompt for a non-admin, not only hiding the button', () => {
    const component = createComponent();

    component.onCreateFolder();

    expect(modalService.openModel).not.toHaveBeenCalled();
  });

  it('refuses to open the delete-folder confirmation for a non-admin', () => {
    const component = createComponent();

    component.onDeleteFolder({ id: 'folder-1', name: 'Archive' } as IEmailFolder);

    expect(modalService.openModal).not.toHaveBeenCalled();
  });

  it('opens both folder-management dialogs for an admin', () => {
    held.add(ROLE_ADMIN);
    const component = createComponent();

    component.onCreateFolder();
    component.onDeleteFolder({ id: 'folder-1', name: 'Archive' } as IEmailFolder);

    expect(modalService.openModel).toHaveBeenCalled();
    expect(modalService.openModal).toHaveBeenCalled();
  });
});
