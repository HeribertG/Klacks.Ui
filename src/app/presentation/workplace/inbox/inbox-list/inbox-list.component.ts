// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { AfterViewInit, Component, computed, inject, OnDestroy, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil } from 'rxjs';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { IReceivedEmailListItem } from 'src/app/domain/models/email/received-email.model';
import { TRASH_FOLDER } from 'src/app/domain/constants/email.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { Menu, MenuItem } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';

@Component({
  selector: 'app-inbox-list',
  templateUrl: './inbox-list.component.html',
  styleUrls: ['./inbox-list.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule, ContextMenuComponent],
})
export class InboxListComponent implements AfterViewInit, OnDestroy {
  inboxService = inject(InboxService);
  private translateService = inject(TranslateService);
  private ngUnsubscribe = new Subject<void>();

  @ViewChild('contextMenu', { static: false }) contextMenu!: ContextMenuComponent;

  private contextEmailId: string | null = null;

  currentFolderName = computed(() => {
    const selectedImapFolder = this.inboxService.selectedFolder();
    const folder = this.inboxService
      .folders()
      .find((f) => f.imapFolderName === selectedImapFolder);
    if (!folder) return 'Inbox';
    if (folder.imapFolderName === TRASH_FOLDER) {
      return this.translateService.instant('inbox.folder-list.trash-name');
    }
    return folder.name;
  });

  ngAfterViewInit(): void {
    this.contextMenu.hasClicked
      .pipe(takeUntil(this.ngUnsubscribe))
      .subscribe((keys) => this.onContextMenuClick(keys));
  }

  ngOnDestroy(): void {
    this.ngUnsubscribe.next();
    this.ngUnsubscribe.complete();
  }

  onSelectEmail(email: IReceivedEmailListItem): void {
    this.inboxService.selectEmail(email.id);
  }

  onRefresh(): void {
    this.inboxService.fetchAndReload();
  }

  isSelected(email: IReceivedEmailListItem): boolean {
    return this.inboxService.selectedEmail()?.id === email.id;
  }

  getDisplayName(email: IReceivedEmailListItem): string {
    return email.fromName || email.fromAddress;
  }

  onReadFilterChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value as 'all' | 'read' | 'unread';
    this.inboxService.setReadFilter(value);
  }

  onToggleSort(): void {
    this.inboxService.toggleSortDirection();
  }

  onRelevanceFilter(filter: 'all' | 'relevant' | 'other'): void {
    this.inboxService.setRelevanceFilter(filter);
  }

  onRightClick(event: MouseEvent, email: IReceivedEmailListItem): void {
    event.preventDefault();
    this.contextEmailId = email.id;
    this.contextMenu.menuData = this.buildContextMenu(email);
    this.contextMenu.openMenu(event);
  }

  private buildContextMenu(email: IReceivedEmailListItem): Menu {
    const menuData = new Menu();
    const isTrash = this.inboxService.isTrashFolder();

    if (email.isRead) {
      menuData.list.push(new MenuItem('markUnread', DomainMessages.EMAIL_MARK_UNREAD, false, '', 'fa-regular fa-envelope'));
    } else {
      menuData.list.push(new MenuItem('markRead', DomainMessages.EMAIL_MARK_READ, false, '', 'fa-regular fa-envelope-open'));
    }

    menuData.list.push(...MenuDataTemplate.divider());

    if (isTrash) {
      menuData.list.push(new MenuItem('restore', DomainMessages.EMAIL_RESTORE, false, '', 'fa-solid fa-rotate-left'));
      menuData.list.push(new MenuItem('permanentlyDelete', DomainMessages.EMAIL_PERMANENTLY_DELETE, false, '', 'fa-solid fa-trash'));
    } else {
      const moveItem = new MenuItem('moveToFolder', DomainMessages.EMAIL_MOVE_TO_FOLDER, false);
      moveItem.hasMenu = true;
      moveItem.menu = this.buildMoveToFolderSubmenu();
      moveItem.iconFont = 'fa-solid fa-folder-open';
      menuData.list.push(moveItem);

      menuData.list.push(...MenuDataTemplate.divider());
      menuData.list.push(new MenuItem('delete', DomainMessages.EMAIL_DELETE, false, 'Delete', 'fa-solid fa-trash'));
    }

    return menuData;
  }

  private buildMoveToFolderSubmenu(): Menu {
    const submenu = new Menu();
    const currentFolder = this.inboxService.selectedFolder();
    const folders = this.inboxService.folders();

    for (const folder of folders) {
      if (folder.imapFolderName === currentFolder) continue;
      if (folder.imapFolderName === TRASH_FOLDER) continue;

      const item = new MenuItem('moveToFolderItem', folder.name, false);
      item.valueKey = folder.imapFolderName;
      submenu.list.push(item);
    }

    return submenu;
  }

  private onContextMenuClick(keys: string[]): void {
    const action = keys[0];
    const value = keys[1];
    const emailId = this.contextEmailId;

    this.contextMenu.closeMenu(true);

    if (!emailId) return;

    switch (action) {
      case 'markRead':
        this.inboxService.markAsRead(emailId, true);
        break;
      case 'markUnread':
        this.inboxService.markAsRead(emailId, false);
        break;
      case 'delete':
        this.inboxService.deleteEmail(emailId);
        break;
      case 'restore':
        this.inboxService.restoreEmail(emailId);
        break;
      case 'permanentlyDelete':
        this.inboxService.permanentlyDeleteEmail(emailId);
        break;
      case 'moveToFolderItem':
        if (value) {
          this.inboxService.moveEmailToFolder(emailId, value);
        }
        break;
    }
  }
}
