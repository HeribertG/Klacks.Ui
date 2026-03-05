// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, NgTemplateOutlet } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';
import { IEmailGroupNode } from 'src/app/domain/models/email/email-group-node.model';
import { SPECIAL_USE_INBOX, SPECIAL_USE_JUNK, SPECIAL_USE_SENT, SPECIAL_USE_TRASH } from 'src/app/domain/constants/email.constants';
import { IconAngleDownComponent } from 'src/app/presentation/icons/icon-angle-down.component';
import { IconAngleRightComponent } from 'src/app/presentation/icons/icon-angle-right.component';

const SPECIAL_USE_TRANSLATION_MAP: Record<string, string> = {
  [SPECIAL_USE_INBOX]: 'inbox.folder-list.inbox-name',
  [SPECIAL_USE_TRASH]: 'inbox.folder-list.trash-name',
  [SPECIAL_USE_JUNK]: 'inbox.folder-list.junk-name',
  [SPECIAL_USE_SENT]: 'inbox.folder-list.sent-name',
};

@Component({
  selector: 'app-inbox-folder-list',
  templateUrl: './inbox-folder-list.component.html',
  styleUrls: ['./inbox-folder-list.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule, NgTemplateOutlet, IconAngleDownComponent, IconAngleRightComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxFolderListComponent {
  inboxService = inject(InboxService);
  private authorizationService = inject(AuthorizationService);
  private translateService = inject(TranslateService);

  get isAuthorised(): boolean {
    return this.authorizationService.isAuthorised;
  }

  isActive(folder: IEmailFolder): boolean {
    return this.inboxService.selectedFolder() === folder.imapFolderName;
  }

  onSelectFolder(folder: IEmailFolder): void {
    this.inboxService.selectFolder(folder.imapFolderName);
  }

  onCreateFolder(): void {
    const name = window.prompt(this.translateService.instant('inbox.folder-list.prompt-name'));
    if (!name) return;

    const imapFolderName = window.prompt(this.translateService.instant('inbox.folder-list.prompt-imap'));
    if (!imapFolderName) return;

    this.inboxService.createFolder(name, imapFolderName);
  }

  getFolderBadgeCount(folder: IEmailFolder): number {
    if (folder.specialUse === SPECIAL_USE_TRASH) {
      return folder.totalCount;
    }
    return folder.unreadCount;
  }

  getFolderDisplayName(folder: IEmailFolder): string {
    if (folder.specialUse) {
      const translationKey = SPECIAL_USE_TRANSLATION_MAP[folder.specialUse];
      if (translationKey) {
        return this.translateService.instant(translationKey);
      }
    }
    return folder.name;
  }

  onDeleteFolder(folder: IEmailFolder): void {
    const confirmed = window.confirm(
      this.translateService.instant('inbox.folder-list.confirm-delete', { name: folder.name })
    );
    if (confirmed) {
      this.inboxService.deleteFolder(folder.id);
    }
  }

  expandedNodes = new Set<string>();

  isGroupActive(nodeId: string, nodeType: string): boolean {
    if (nodeType === 'group') {
      return this.inboxService.selectedGroupId() === nodeId;
    }
    return this.inboxService.selectedClientId() === nodeId;
  }

  onSelectGroupNode(node: IEmailGroupNode): void {
    if (node.type === 'group') {
      this.inboxService.selectGroupFolder(node.id);
    } else {
      this.inboxService.selectClientFolder(node.id);
    }
  }

  toggleGroupNode(node: IEmailGroupNode): void {
    if (this.expandedNodes.has(node.id)) {
      this.expandedNodes.delete(node.id);
    } else {
      this.expandedNodes.add(node.id);
    }
  }

  isNodeExpanded(node: IEmailGroupNode): boolean {
    return this.expandedNodes.has(node.id);
  }

  hasChildren(node: IEmailGroupNode): boolean {
    return node.children && node.children.length > 0;
  }

  getTotalUnreadCount(node: IEmailGroupNode): number {
    let total = node.unreadCount;
    if (node.children) {
      for (const child of node.children) {
        total += this.getTotalUnreadCount(child);
      }
    }
    return total;
  }
}
