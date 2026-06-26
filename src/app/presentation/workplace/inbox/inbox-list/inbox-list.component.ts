// Copyright (c) Heribert Gasparoli Private. All rights reserved.

/**
 * Component for displaying the email list within the selected folder.
 */

import {
  AfterViewInit, Component, computed, DestroyRef, effect, inject, OnInit, signal, untracked,
  ChangeDetectionStrategy,
  viewChild
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { form, FormField } from '@angular/forms/signals';
import { TranslateModule } from '@ngx-translate/core';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { IReceivedEmailListItem } from 'src/app/domain/models/email/received-email.model';
import { SPECIAL_USE_INBOX, SPECIAL_USE_JUNK, SPECIAL_USE_TRASH } from 'src/app/domain/constants/email.constants';
import { DomainMessages } from 'src/app/domain/constants/messages';
import { ContextMenuComponent } from 'src/app/presentation/shared/context-menu/context-menu.component';
import { Menu, MenuItem } from 'src/app/presentation/shared/context-menu/context-menu-class';
import { MenuDataTemplate } from 'src/app/presentation/helpers/context-menu-data-template';

interface InboxListFilterFormModel {
  readFilter: string;
}

@Component({
  selector: 'app-inbox-list',
  templateUrl: './inbox-list.component.html',
  styleUrls: ['./inbox-list.component.scss'],
  standalone: true,
  imports: [CommonModule, DatePipe, TranslateModule, FormsModule, FormField, ContextMenuComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxListComponent implements OnInit, AfterViewInit {
  inboxService = inject(InboxService);
  private destroyRef = inject(DestroyRef);

  readonly contextMenu = viewChild.required<ContextMenuComponent>('contextMenu');

  private contextEmailId: string | null = null;
  private initSkipCount = 0;

  filterFormModel = signal<InboxListFilterFormModel>({ readFilter: 'all' });
  filterForm = form(this.filterFormModel);

  constructor() {
    effect(() => {
      const { readFilter } = this.filterFormModel();
      if (this.initSkipCount > 0) { this.initSkipCount--; return; }
      untracked(() => {
        this.inboxService.setReadFilter(readFilter as 'all' | 'read' | 'unread');
      });
    });
  }

  currentFolderName = computed(() => {
    const selectedImapFolder = this.inboxService.selectedFolder();
    const folder = this.inboxService
      .folders()
      .find((f) => f.imapFolderName === selectedImapFolder);
    return folder?.name ?? 'INBOX';
  });

  ngOnInit(): void {
    this.initSkipCount++;
    this.filterFormModel.set({ readFilter: this.inboxService.readFilter() });
  }

  ngAfterViewInit(): void {
    this.contextMenu().hasClicked
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((keys) => this.onContextMenuClick(keys));
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

  onToggleSort(): void {
    this.inboxService.toggleSortDirection();
  }

  onRelevanceFilter(filter: 'all' | 'relevant' | 'other'): void {
    this.inboxService.setRelevanceFilter(filter);
  }

  onRightClick(event: MouseEvent, email: IReceivedEmailListItem): void {
    event.preventDefault();
    this.contextEmailId = email.id;
    const contextMenu = this.contextMenu();
    contextMenu.menuData = this.buildContextMenu(email);
    contextMenu.openMenu(event);
  }

  private buildContextMenu(email: IReceivedEmailListItem): Menu {
    const menuData = new Menu();
    const isTrash = this.inboxService.isTrashFolder();
    const isJunk = this.inboxService.isJunkFolder();

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
      if (isJunk) {
        menuData.list.push(new MenuItem('markAsNotSpam', DomainMessages.EMAIL_MARK_AS_NOT_SPAM, false, '', 'fa-solid fa-check'));
      } else {
        menuData.list.push(new MenuItem('markAsSpam', DomainMessages.EMAIL_MARK_AS_SPAM, false, '', 'fa-solid fa-ban'));
      }

      menuData.list.push(...MenuDataTemplate.divider());

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
      if (folder.specialUse === SPECIAL_USE_TRASH) continue;

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

    this.contextMenu().closeMenu(true);

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
      case 'markAsSpam': {
        const junkFolder = this.inboxService.getImapNameBySpecialUse(SPECIAL_USE_JUNK);
        if (junkFolder) this.inboxService.moveEmailToFolder(emailId, junkFolder);
        break;
      }
      case 'markAsNotSpam': {
        const inboxFolder = this.inboxService.getImapNameBySpecialUse(SPECIAL_USE_INBOX);
        if (inboxFolder) this.inboxService.moveEmailToFolder(emailId, inboxFolder);
        break;
      }
      case 'moveToFolderItem':
        if (value) {
          this.inboxService.moveEmailToFolder(emailId, value);
        }
        break;
    }
  }
}
