// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';
import { TRASH_FOLDER } from 'src/app/domain/constants/email.constants';

@Component({
  selector: 'app-inbox-folder-list',
  templateUrl: './inbox-folder-list.component.html',
  styleUrls: ['./inbox-folder-list.component.scss'],
  standalone: true,
  imports: [CommonModule, TranslateModule],
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
    if (folder.imapFolderName === TRASH_FOLDER) {
      return folder.totalCount;
    }
    return folder.unreadCount;
  }

  getFolderDisplayName(folder: IEmailFolder): string {
    if (folder.imapFolderName === TRASH_FOLDER) {
      return this.translateService.instant('inbox.folder-list.trash-name');
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
}
