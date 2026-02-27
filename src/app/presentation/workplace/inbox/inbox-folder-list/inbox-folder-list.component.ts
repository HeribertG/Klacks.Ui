// Copyright (c) Heribert Gasparoli Private. All rights reserved.

import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InboxService } from 'src/app/domain/services/email/inbox.service';
import { AuthorizationService } from 'src/app/application/services/authorization.service';
import { IEmailFolder } from 'src/app/domain/models/email/email-folder.model';

@Component({
  selector: 'app-inbox-folder-list',
  templateUrl: './inbox-folder-list.component.html',
  styleUrls: ['./inbox-folder-list.component.scss'],
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InboxFolderListComponent {
  inboxService = inject(InboxService);
  private authorizationService = inject(AuthorizationService);

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
    const name = window.prompt('Folder name:');
    if (!name) return;

    const imapFolderName = window.prompt('IMAP folder name:');
    if (!imapFolderName) return;

    this.inboxService.createFolder(name, imapFolderName);
  }

  onDeleteFolder(folder: IEmailFolder): void {
    const confirmed = window.confirm(
      `Delete folder "${folder.name}"?`
    );
    if (confirmed) {
      this.inboxService.deleteFolder(folder.id);
    }
  }
}
