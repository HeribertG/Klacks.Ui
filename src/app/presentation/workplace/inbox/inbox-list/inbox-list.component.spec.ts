// Copyright (c) Heribert Gasparoli. SPDX-License-Identifier: AGPL-3.0-only

import { TestBed } from '@angular/core/testing';
import { InboxListComponent } from './inbox-list.component';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { ROLE_ADMIN } from 'src/app/domain/constants/permissions.constants';
import { IReceivedEmailListItem } from 'src/app/domain/models/email/received-email-list-item.interface';
import { Menu } from 'src/app/presentation/shared/context-menu/context-menu-class';

const PERMANENTLY_DELETE_KEY = 'permanentlyDelete';

describe('InboxListComponent - permanent delete in the trash menu', () => {
  let held: Set<string>;
  let inboxService: Record<string, unknown>;

  const email = { id: 'mail-1', isRead: true } as IReceivedEmailListItem;

  const createComponent = (): InboxListComponent => {
    inboxService = {
      setReadFilter: vi.fn(),
      setRelevanceFilter: vi.fn(),
      isTrashFolder: () => true,
      isJunkFolder: () => false,
      selectedFolder: () => 'Trash',
      folders: () => [],
      permanentlyDeleteEmail: vi.fn(),
    };

    TestBed.configureTestingModule({
      imports: [InboxListComponent],
      providers: [
        { provide: InboxService, useValue: inboxService },
        { provide: AuthorizationService, useValue: { hasPermission: (permission: string) => held.has(permission) } },
      ],
    });
    TestBed.overrideComponent(InboxListComponent, { set: { template: '', imports: [] } });

    return TestBed.createComponent(InboxListComponent).componentInstance;
  };

  const menuKeys = (component: InboxListComponent): string[] => {
    const menu = (component as unknown as { buildContextMenu(e: IReceivedEmailListItem): Menu }).buildContextMenu(email);
    return menu.list.map((item) => item.key);
  };

  beforeEach(() => {
    held = new Set<string>();
  });

  it('reports a planer or a supervisor without the admin role as not admin', () => {
    expect(createComponent().isAdmin).toBe(false);
  });

  it('does not offer permanent delete in the trash menu to a non-admin, who still can restore', () => {
    const keys = menuKeys(createComponent());

    expect(keys).toContain('restore');
    expect(keys).not.toContain(PERMANENTLY_DELETE_KEY);
  });

  it('offers permanent delete in the trash menu to an admin', () => {
    held.add(ROLE_ADMIN);

    expect(menuKeys(createComponent())).toContain(PERMANENTLY_DELETE_KEY);
  });

  it('refuses the permanent delete action for a non-admin even when the menu item is invoked', () => {
    const component = createComponent();
    (component as unknown as { contextEmailId: string }).contextEmailId = email.id;
    (component as unknown as { contextMenu: () => { closeMenu: () => void } }).contextMenu = () => ({ closeMenu: vi.fn() });

    (component as unknown as { onContextMenuClick(keys: string[]): void }).onContextMenuClick([PERMANENTLY_DELETE_KEY]);

    expect(inboxService['permanentlyDeleteEmail']).not.toHaveBeenCalled();
  });

  it('runs the permanent delete action for an admin', () => {
    held.add(ROLE_ADMIN);
    const component = createComponent();
    (component as unknown as { contextEmailId: string }).contextEmailId = email.id;
    (component as unknown as { contextMenu: () => { closeMenu: () => void } }).contextMenu = () => ({ closeMenu: vi.fn() });

    (component as unknown as { onContextMenuClick(keys: string[]): void }).onContextMenuClick([PERMANENTLY_DELETE_KEY]);

    expect(inboxService['permanentlyDeleteEmail']).toHaveBeenCalledWith(email.id);
  });
});
